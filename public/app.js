/* ==========================================================================
   BATCH APPLICATION LOGIC & STATE ENGINE
   ========================================================================== */

// --- STANDALONE MOBILE AI ENGINE (Direct Google Gemini 2.5 Flash Integration) ---
function getActiveGeminiKey() {
    return (localStorage.getItem("BATCH_GEMINI_API_KEY") || "").trim();
}

async function callDirectGeminiAPI(promptText, systemInstruction) {
    const key = getActiveGeminiKey();
    if (!key) throw new Error("No Gemini API key available. Configure your API key in Sync / Settings.");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
    };
    if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini API HTTP ${res.status}`);
    }
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("Empty response from Gemini API.");
    return JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim());
}

async function callStandaloneAutofill(name, lab) {
    const isDrinks = lab === 'drinks';
    const systemPrompt = `You are a Michelin-starred chef and master mixologist.
The user wants to formulate a recipe named: "${name}" for the lab type: "${lab}".
Generate a complete recipe formulation in the BATCH application compatible JSON schema.
Rules:
- Ingredients: cream (fats/spirits/dough bases), soak (liquids/syrups/acids), assembly (garnishes/finish).
- Steps: phases 'mise-en-place', 'execution', 'assembly'. timer (number in seconds). tweakReminder. textVariants: beginner, professional, michelin.
- suggestedTools: 3-6 tool names.
Output MUST be a pure JSON object:
{
    "baselineName": "Baseline Control v1.0",
    "defaultTweakCategory": "Ingredients",
    "defaultTweakText": "Testing default parameters and hydration.",
    "ingredients": {
        "cream": [{ "name": "...", "baseWeight": 100, "unit": "g" }],
        "soak": [{ "name": "...", "baseWeight": 100, "unit": "g" }],
        "assembly": [{ "name": "...", "baseWeight": 20, "unit": "g" }]
    },
    "steps": [
        {
            "phase": "mise-en-place",
            "label": "Preparation",
            "tweakReminder": "",
            "timer": 300,
            "textVariants": { "beginner": "...", "professional": "...", "michelin": "..." }
        }
    ],
    "suggestedTools": ["Stand Mixer", "Balloon Whisk", "Chef Knife"]
}`;
    return await callDirectGeminiAPI(`Formulate recipe "${name}" for lab "${lab}".`, systemPrompt);
}

async function callStandaloneGenerateRecipe(ingredients, lab) {
    const isDrinks = lab === 'drinks';
    const systemPrompt = `You are the greatest culinary and drinks master in the world.
Generate a BATCH application compatible JSON recipe object for: ${ingredients}.
Schema:
{
    "projectName": "Recipe Name",
    "baselineName": "Baseline Control Recipe v1.0",
    "activeBatch": 1,
    "defaultTweakCategory": "Ingredients",
    "defaultTweakText": "Adapting recipe based on pantry ingredients.",
    "keywords": ["ingredient1", "ingredient2"],
    "ingredients": {
        "cream": [{ "name": "...", "baseWeight": 100, "unit": "g" }],
        "soak": [{ "name": "...", "baseWeight": 100, "unit": "g" }],
        "assembly": [{ "name": "...", "baseWeight": 20, "unit": "g" }]
    },
    "steps": [
        {
            "phase": "mise-en-place",
            "label": "Mise en place",
            "tweakReminder": "",
            "timer": 180,
            "textVariants": { "beginner": "...", "professional": "...", "michelin": "..." }
        }
    ],
    "comparison": {
        "baseline": [{ "title": "Standard Baseline", "desc": "Control ingredients." }],
        "test": [{ "title": "Pantry Batch", "desc": "Pantry adaptation.", "isTweak": true }]
    }
}`;
    const recipe = await callDirectGeminiAPI(`Please create a ${isDrinks ? 'drink' : 'culinary'} formulation using: ${ingredients}`, systemPrompt);
    recipe.lab = isDrinks ? 'drinks' : 'culinary';
    return recipe;
}

async function callStandaloneSuggestTools(recipe) {
    const prompt = `Analyze this recipe: "${recipe.projectName || 'Recipe'}".
Ingredients: ${JSON.stringify(recipe.ingredients || {})}.
Steps: ${JSON.stringify(Array.isArray(recipe.steps) ? recipe.steps.map(s => s?.label || '') : [])}.
Suggest 4-6 kitchen tools that are either essential or can be used to optimize this recipe.
Output MUST be a pure JSON array of strings (the tool names). Example: ["Stand Mixer", "Balloon Whisk", "Double Boiler Setup"].`;
    const res = await callDirectGeminiAPI(prompt);
    return Array.isArray(res) ? res : ["Balloon Whisk", "Stand Mixer", "Double Boiler Setup"];
}

async function callStandaloneAdaptSteps(steps, selectedTools) {
    const systemPrompt = `You are a Michelin-starred Chef.
Modify the recipe steps (specifically 'timer' and 'textVariants': 'beginner', 'professional', 'michelin') to leverage these available tools: ${JSON.stringify(selectedTools)}.
Output pure JSON array of steps matching the original schema.`;
    const prompt = `Modify these steps: ${JSON.stringify(steps)}`;
    const res = await callDirectGeminiAPI(prompt, systemPrompt);
    return Array.isArray(res) ? res : steps;
}

// 1. DYNAMIC RECIPE DATABASE (With Adaptive Technical Instructions)
let RECIPE_DATABASE = {
    tiramisu: {
        projectName: "The Ultimate From-Scratch Tiramisu",
        baselineName: "Baseline Control Recipe v1.0",
        activeBatch: 5,
        defaultTweakCategory: "Ingredients",
        defaultTweakText: "Swapping standard ladyfingers for homemade almond flour Savoiardi.",
        lab: "culinary",
        ingredientSections: {
            cream: "Zabaglione & Cream",
            soak: "Ladyfinger Soak",
            assembly: "Assembly & Dusting"
        },
        ingredients: {
            cream: [
                { name: "Egg Yolks", baseWeight: 120, unit: "g" },
                { name: "Sugar (Granulated)", baseWeight: 100, unit: "g" },
                { name: "Mascarpone Cheese", baseWeight: 500, unit: "g" },
                { name: "Heavy Whipping Cream", baseWeight: 240, unit: "g" }
            ],
            soak: [
                { name: "Espresso (Strong Brew)", baseWeight: 300, unit: "g" },
                { 
                    name: "Ladyfinger Biscuits", 
                    baseWeight: 200, 
                    unit: "g", 
                    tweakHighlighted: true,
                    baselineText: "Store-bought Savoiardi biscuits",
                    testText: "Homemade almond flour Savoiardi biscuits (&Delta; Tweak)"
                },
                { name: "Marsala Wine (Optional)", baseWeight: 45, unit: "g" }
            ],
            assembly: [
                { name: "Cocoa Powder (Unsweetened)", baseWeight: 15, unit: "g" },
                { name: "Dark Chocolate Shavings", baseWeight: 25, unit: "g" }
            ]
        },
        // Steps with adaptive technical instruction logic
        steps: [
            {
                phase: "mise-en-place",
                label: "Prepare Ingredients",
                tweakReminder: "",
                timer: 0,
                textVariants: {
                    beginner: "Measure out all ingredients precisely using a digital kitchen scale. Place egg yolks in a medium mixing bowl to warm up to room temperature. Scoop the mascarpone cheese into a separate bowl and press it slightly with a spatula to soften it.",
                    professional: "Prep and weigh all ingredients. Temper yolks at room temperature; temper mascarpone to 18°C.",
                    michelin: "Mise en place yolks (120g) at precisely 20°C. Vac-seal softened mascarpone (500g) in a chamber sealer to de-aerate and soften cream structure uniformly."
                }
            },
            {
                phase: "execution",
                label: "Whip Zabaglione",
                tweakReminder: "",
                timer: 300,
                textVariants: {
                    beginner: "Fill a small pot with 1 inch of water and bring to a simmer. Set your glass bowl with egg yolks and sugar on top (making sure the bottom of the bowl does not touch the water). Whisk constantly by hand for 6 minutes until the mixture turns pale yellow and thickens.",
                    professional: "Whisk yolks and sugar over a double boiler (bain-marie) to ribbon stage.",
                    michelin: "Combine yolks and sugar. Mount over a water bath. Temper precisely to 82°C (180°F) using an instant-read probe thermometer. Whisk vigorously to a stable emulsified sabayon stage."
                },
                toolVariants: {
                    "tool-doubleboiler": {
                        beginner: "Place egg yolks and sugar in the top pan of your double boiler over simmering water. Whisk continuously by hand for 5 minutes until pale and ribbon-like.",
                        professional: "Whisk yolks/sugar in double boiler to ribbon stage (approx 5 min).",
                        michelin: "Whip yolks/sugar in double boiler. Monitor temperature to stabilize emulsion at exactly 82°C."
                    }
                }
            },
            {
                phase: "execution",
                label: "Prepare Whipped Cream",
                tweakReminder: "Technique Focus: Whisk whipped cream to soft peaks to balance the rich zabaglione structure.",
                timer: 240,
                textVariants: {
                    beginner: "Pour cold heavy cream into a cold bowl. Whip the cream. Fold the mascarpone cheese into your cooled yolk mixture, then fold in the whipped cream in three parts.",
                    professional: "Whip heavy cream to soft-medium peaks. Fold mascarpone into cooled zabaglione, then fold in whipped cream.",
                    michelin: "Blend heavy cream and mascarpone base. Fold into sabayon base under gentle folding actions to retain structural density."
                },
                toolVariants: {
                    "tool-whisk": {
                        beginner: "Pour cold heavy cream into a chilled bowl. Grab your hand balloon whisk and whip vigorously by hand for 6-8 minutes until soft peaks form.",
                        timer: 420
                    },
                    "tool-mixer": {
                        beginner: "Pour cold heavy cream into the stand mixer bowl. Using the whisk attachment, run on medium speed for 3 minutes until soft peaks form. Do not overwhip.",
                        professional: "Whip heavy cream in stand mixer to soft peaks on speed 6 (approx 2 minutes).",
                        michelin: "Whip heavy cream to soft peaks in stand mixer. Fold into sabayon base immediately.",
                        timer: 120
                    },
                    "tool-siphon": {
                        beginner: "Mix heavy cream and softened mascarpone until smooth. Pour into whipping siphon, charge with 1 N2O charger, shake well, and express into the yolk mixture.",
                        professional: "Whip mascarpone and cream base in an iSi siphon charged with 2 N2O canisters. Fold into zabaglione.",
                        michelin: "Incorporate cream and mascarpone. Pass through a fine chinois, charge in an iSi whipping siphon with 2 N2O cartridges. Discharging into the sabayon base to create a highly stable, micro-aerated foam.",
                        timer: 0
                    }
                }
            },
            {
                phase: "assembly",
                label: "Biscuits Soak & Layering",
                tweakReminder: "Active Delta Tweak: Using homemade almond flour Savoiardi. Reduce soak immersion time slightly to prevent collapsing.",
                timer: 0,
                textVariants: {
                    beginner: "Pour espresso into a shallow bowl. One by one, dip the ladyfinger cookies in the coffee for just 1 second per side (do not let them get soggy). Line the bottom of your rectangular baking dish with the dipped cookies.",
                    professional: "Drag ladyfingers through espresso soak for 0.5 seconds. Layer bottom of pan immediately.",
                    michelin: "Cryo-infuse ladyfingers with espresso. Layer in pan with absolute alignment."
                },
                toolVariants: {
                    "tool-chambervac": {
                        beginner: "Place ladyfingers in a bowl. Pour espresso over them. Use your vacuum sealer chamber if available to quickly compress the cookies with espresso in 5 seconds.",
                        professional: "Vacuum compress ladyfingers with espresso soak at 0.8 bar to inject coffee without destroying crumb structure.",
                        michelin: "Chamber vacuum pack the homemade almond flour ladyfingers with single-origin espresso at exactly 95% vacuum. Achieves complete, instant, clean absorption with zero structure bleeding.",
                        timer: 5
                    }
                }
            },
            {
                phase: "assembly",
                label: "Final Assemble & Chill",
                tweakReminder: "",
                timer: 0,
                textVariants: {
                    beginner: "Spread half of your cream mixture over the cookies. Put another layer of dipped cookies on top, then cover with the rest of the cream. Dust the top with cocoa powder using a small sifter. Put it in the fridge for at least 6 hours.",
                    professional: "Layer cream, biscuit soak, and remaining cream. Dust with Valrhona cocoa powder. Chill for 6 hours.",
                    michelin: "Pipe cream base using a round tip bag. Dust with tempered cocoa powder and chocolate curls. Chill at 4°C for 6 hours."
                }
            }
        ],
        comparison: {
            baseline: [
                { title: "Ladyfingers Formulation", desc: "100% standard wheat flour ladyfinger cookies (high gluten absorption rate)." },
                { title: "Liquid Immersion Rate", desc: "2-second deep submersion in hot espresso; holds liquid without immediate leaking." },
                { title: "Zabaglione Whisking", desc: "Whisked manually for 6 minutes until ribbon stage is achieved." }
            ],
            test: [
                { title: "Ladyfingers Formulation", desc: "Homemade gluten-free almond flour Savoiardi (&Delta; Tweak). Higher oil, lower starch.", isTweak: true },
                { title: "Liquid Immersion Rate", desc: "0.5-second shallow drag in cooled espresso to prevent collapse of crumb structure.", isTweak: true },
                { title: "Zabaglione Whisking", desc: "Whisked for 5 minutes. Folded with soft-peak cream to accommodate heavier almond biscuits." }
            ]
        }
    },
    pizza: {
        projectName: "Perfect Neapolitan Pizza Dough",
        baselineName: "Baseline Control Recipe v2.1",
        activeBatch: 8,
        defaultTweakCategory: "Time-Temp",
        defaultTweakText: "Extending cold fermentation to 72 hours (vs. 24 hours baseline) for superior lactic acid flavour development.",
        lab: "culinary",
        ingredientSections: {
            cream: "Dough Autolyse Base",
            soak: "Yeast & Salt Activation",
            assembly: "Plating & Dusting"
        },
        ingredients: {
            cream: [
                { 
                    name: "Tipo 00 Flour", 
                    baseWeight: 500, 
                    unit: "g",
                    tweakHighlighted: true,
                    baselineText: "100% Tipo 00 Flour",
                    testText: "90% Tipo 00 + 10% Whole Wheat Flour (&Delta; Tweak)"
                },
                { name: "Water (Room Temp)", baseWeight: 325, unit: "g" }
            ],
            soak: [
                { name: "Fine Sea Salt", baseWeight: 15, unit: "g" },
                { name: "Active Dry Yeast", baseWeight: 1.5, unit: "g" }
            ],
            assembly: [
                { name: "Semolina (for dusting)", baseWeight: 50, unit: "g" }
            ]
        },
        steps: [
            {
                phase: "mise-en-place",
                label: "Autolyse Phase",
                tweakReminder: "Flour Tweak: The 10% whole wheat content increases absorption; dough may feel slightly stickier.",
                timer: 1800,
                textVariants: {
                    beginner: "Weigh your flour and room-temperature water. Mix them together in a large bowl with a spoon until no dry flour is visible. Cover the bowl with a damp towel and let it sit on the counter for 30 minutes. This lets the flour absorb water naturally.",
                    professional: "Combine flour and water (65% hydration). Autolyse for 30 minutes.",
                    michelin: "Combine 90% Tipo 00, 10% Whole Wheat flour, and water at 16°C. Vacuum seal the autolyse mass at 90% vacuum to accelerate hydration at a cellular level. Rest 30 minutes."
                }
            },
            {
                phase: "execution",
                label: "Knead Dough",
                tweakReminder: "",
                timer: 600,
                textVariants: {
                    beginner: "Dissolve yeast in a tiny splash of water and add it to the autolysed dough. Add the salt. Knead by hand on a clean table for 10 minutes until the dough becomes smooth, soft, and no longer sticks to your hands.",
                    professional: "Add yeast slurry and salt. Knead by hand for 10 minutes until smooth and gluten window is achieved.",
                    michelin: "Incorporate yeast culture and salt. Knead using Rubaud method to oxygenate dough structure. Check temperature; maintain dough core at 23°C."
                },
                toolVariants: {
                    "tool-mixer": {
                        beginner: "Add yeast and salt. Mix in stand mixer with dough hook on low speed for 6 minutes until dough gathers around hook and looks smooth.",
                        professional: "Mix in stand mixer with dough hook on speed 2 for 6 minutes to achieve high gluten development.",
                        michelin: "Mix in stand mixer with spiral hook at 100 RPM for 5 minutes, checking dough temperature to ensure it does not exceed 24°C.",
                        timer: 360
                    }
                }
            },
            {
                phase: "execution",
                label: "Extended Cold Fermentation",
                tweakReminder: "Active Delta Tweak: Retard dough for a full 72 hours. Check dough daily for gas buildup and fermentation speed.",
                timer: 0,
                textVariants: {
                    beginner: "Place your kneaded dough ball into a bowl lightly coated with olive oil. Cover tightly with plastic wrap and put it in the back of the refrigerator (4°C) for 72 hours. Cold temperatures slow down the yeast and build deep sourdough-like flavors.",
                    professional: "Place in airtight container. Cold ferment at 4°C for 72 hours for deep flavor accumulation.",
                    michelin: "Store dough in temperature-controlled proofing cabinet at exactly 3.5°C for 72 hours. Check pH levels (target 5.2)."
                }
            },
            {
                phase: "assembly",
                label: "Dividing & Balling",
                tweakReminder: "",
                timer: 0,
                textVariants: {
                    beginner: "Take the dough out. Cut it into 3 equal pieces. Roll each piece into a tight, smooth ball. Place them on a baking sheet, cover with plastic, and let them sit at room temperature for 4 hours to warm up and double in size.",
                    professional: "Portion into 270g balls. Ball tightly and proof in boxes at 20°C for 4 hours.",
                    michelin: "Scale dough balls to exactly 265g. Shape into tight rounds. Proof at 18°C, 75% relative humidity for 4 hours."
                }
            },
            {
                phase: "assembly",
                label: "Stretch, Top & Bake",
                tweakReminder: "",
                timer: 90,
                textVariants: {
                    beginner: "Preheat your oven as hot as it goes (with a pizza stone inside). Take a dough ball, dust with flour, and press down from the center outwards with your fingers to stretch it into a circle. Add tomato sauce, mozzarella cheese, and bake for 5-8 minutes.",
                    professional: "Stretch dough by hand leaving a 1-inch rim (cornicione). Top with San Marzano tomatoes, fresh fior di latte, and bake at 900°F (482°C) for 90 seconds.",
                    michelin: "Hand-stretch dough ball preserving the micro-gas pockets in the rim. Apply vacuum-concentrated San Marzano gel, buffalo mozzarella, and cook at 485°C in a woodfired oven for exactly 85 seconds."
                }
            }
        ],
        comparison: {
            baseline: [
                { title: "Flour Composition", desc: "100% Caputo Tipo 00 flour." },
                { title: "Fermentation Time", desc: "24-hour cold ferment followed by 4 hours room temperature proofing." },
                { title: "Hydration Percentage", desc: "65% hydration (325g water to 500g flour)." }
            ],
            test: [
                { title: "Flour Composition", desc: "90% Caputo Tipo 00 + 10% organic stone-ground whole wheat.", isTweak: true },
                { title: "Fermentation Time", desc: "72-hour cold ferment for deep lactic acid fermentation & complex sugar breakdown.", isTweak: true },
                { title: "Hydration Percentage", desc: "68% hydration (340g water to 500g flour) to offset the thirstier whole wheat bran.", isTweak: true }
            ]
        }
    },
    croissant: {
        projectName: "Ultimate 27-Layer Croissants",
        baselineName: "Baseline Laminations v3.0",
        activeBatch: 3,
        defaultTweakCategory: "Technique",
        defaultTweakText: "Performing a single fold followed by a double fold (24 layers) instead of three single folds (27 layers) to compare puff height.",
        lab: "culinary",
        ingredientSections: {
            cream: "Dough Base (Détrempe)",
            soak: "Butter Block (Beurrage)",
            assembly: "Proofing & Baking"
        },
        ingredients: {
            cream: [
                { name: "Bread Flour", baseWeight: 500, unit: "g" },
                { name: "Unsalted Butter (Détrempe)", baseWeight: 50, unit: "g" },
                { name: "Water (Cold)", baseWeight: 140, unit: "g" },
                { name: "Whole Milk (Cold)", baseWeight: 140, unit: "g" }
            ],
            soak: [
                { 
                    name: "Butter Block (Beurrage)", 
                    baseWeight: 250, 
                    unit: "g",
                    tweakHighlighted: true,
                    baselineText: "Standard European butter (82% fat)",
                    testText: "Normandy Cultured Butter (84% fat) (&Delta; Tweak)"
                },
                { name: "Fine Sugar", baseWeight: 55, unit: "g" },
                { name: "Instant Yeast", baseWeight: 10, unit: "g" }
            ],
            assembly: [
                { name: "Egg (for egg wash)", baseWeight: 50, unit: "g" },
                { name: "Pinch of Salt", baseWeight: 1, unit: "g" }
            ]
        },
        steps: [
            {
                phase: "mise-en-place",
                label: "Butter Roll-Out",
                tweakReminder: "Active Delta Tweak: French butter block (84% fat) has a higher plasticity. Ensure it remains exactly at 14°C / 57°F.",
                timer: 0,
                textVariants: {
                    beginner: "Cut cold Normandy butter into blocks. Place between two sheets of baking parchment. Pound it with a rolling pin until it softens slightly, then roll it out into a flat, neat 19cm square. Place in the fridge to cool down.",
                    professional: "Pound cold butter block to soften; roll into a precise 19x19cm block. Rest at 14°C.",
                    michelin: "Vacuum sheet the 84% Normandy butter block between custom acetate templates to exactly 4mm uniform thickness. Rest at 13.5°C."
                }
            },
            {
                phase: "execution",
                label: "Butter Enclosure",
                tweakReminder: "",
                timer: 0,
                textVariants: {
                    beginner: "Roll your cold dough sheet into a 26cm square. Place the butter block diagonally in the center. Fold the corners of the dough over the butter block so they meet in the middle, like wrapping an envelope. Pinch all the seams tightly to seal the butter inside.",
                    professional: "Roll détrempe to 26x26cm. Position butter block diagonally, envelope-fold, and seal seams firmly.",
                    michelin: "Laminate the butter block (beurrage) diagonally in the détrempe. Seal edges precisely with zero overlaps to ensure perfectly balanced laminations."
                }
            },
            {
                phase: "execution",
                label: "Experimental Laminations",
                tweakReminder: "Technique Tweak: Perform 1 single fold and 1 double fold. Keep rolling motions fluid to prevent tearing of thin butter layers.",
                timer: 1800,
                textVariants: {
                    beginner: "Roll the dough out into a long rectangle (60cm long). Fold the top third down, and the bottom third up (like a letter). Wrap in plastic and chill for 30 minutes. Repeat this roll-out and folding process one more time.",
                    professional: "Roll band to 60cm. Execute 1 single fold and 1 double book fold. Chill for 30 minutes between rolling steps.",
                    michelin: "Roll sheet to exactly 5.5mm. Execute 1 single fold and 1 double fold. Check layers under magnification; check that ambient temperature is exactly 16°C."
                }
            },
            {
                phase: "assembly",
                label: "Cutting and Shaping",
                tweakReminder: "",
                timer: 0,
                textVariants: {
                    beginner: "Roll the dough out into a large sheet 4mm thick. Cut out triangles that are 9cm wide at the bottom and 28cm long. Cut a tiny slit in the middle of the base, and roll the triangle up starting from the wide base up to the point.",
                    professional: "Roll sheet to 4mm. Cut triangles 9x28cm. Roll tightly from the base.",
                    michelin: "Roll lamination sheet to 3.8mm. Trim edges using a straight ruler and rotary blade. Cut triangles to 9.2x28.5cm. Roll under constant tension to secure layers."
                }
            },
            {
                phase: "assembly",
                label: "Proofing & Baking",
                tweakReminder: "",
                timer: 1140,
                textVariants: {
                    beginner: "Place shaped croissants on a baking sheet. Let them rise at room temperature (about 25°C) for 2.5 hours until they are puffy and wobbly. Whisk egg and salt, brush over the top, and bake in oven at 375°F (190°C) for 18-20 minutes.",
                    professional: "Proof at 25°C for 2.5 hours. Brush with egg wash. Bake at 375°F (190°C) for 18-20 minutes.",
                    michelin: "Proof at exactly 24.5°C and 78% humidity for 150 minutes. Airbrush with yolk-cream emulsion wash. Bake in convection oven on low fan at 185°C for 18 minutes."
                }
            }
        ],
        comparison: {
            baseline: [
                { title: "Lamination Strategy", desc: "Three single letter folds (3 x 3 x 3 = 27 theoretical layers of butter)." },
                { title: "Butter Selection", desc: "82% fat standard European butter block." },
                { title: "Proofing Temperature", desc: "Proofed at 26°C (79°F) for 2 hours." }
            ],
            test: [
                { title: "Lamination Strategy", desc: "One single fold and one book fold (3 x 4 = 12 butter layers / 24 dough layers).", isTweak: true },
                { title: "Butter Selection", desc: "84% fat Normandy cultured butter block (higher plastic range).", isTweak: true },
                { title: "Proofing Temperature", desc: "Proofed at 24°C (75°F) for 2.5 hours to accommodate Normandy butter.", isTweak: true }
            ]
        }
    },
    carbonated_negroni: {
        projectName: "Clarified & Carbonated Negroni",
        baselineName: "Standard Negroni Control v1.0",
        activeBatch: 3,
        defaultTweakCategory: "Technique",
        defaultTweakText: "Clarifying vermouth and campari via milk-washing to achieve high carbonation stability.",
        lab: "drinks",
        ingredientSections: {
            cream: "Spirits & Liqueurs",
            soak: "Clarification Agent",
            assembly: "Dilution & Finish"
        },
        ingredients: {
            cream: [
                { name: "London Dry Gin", baseWeight: 90, unit: "g" },
                { name: "Campari Bitter", baseWeight: 90, unit: "g" },
                { name: "Sweet Vermouth", baseWeight: 90, unit: "g" }
            ],
            soak: [
                { 
                    name: "Whole Milk (Cold)", 
                    baseWeight: 30, 
                    unit: "g", 
                    tweakHighlighted: true,
                    baselineText: "No milk washing (cloudy control)",
                    testText: "Whole milk washing (&Delta; Tweak)"
                },
                { name: "Citric Acid Solution (10%)", baseWeight: 5, unit: "g" }
            ],
            assembly: [
                { name: "Purified Water (for dilution)", baseWeight: 45, unit: "g" },
                { name: "Orange Peel Twist", baseWeight: 5, unit: "g" }
            ]
        },
        steps: [
            {
                phase: "mise-en-place",
                label: "Prepare Ingredients",
                tweakReminder: "",
                timer: 0,
                textVariants: {
                    beginner: "Measure all spirits and prepare the whole milk in a glass vessel.",
                    professional: "Combine Campari and Sweet Vermouth. Cool milk to 4°C.",
                    michelin: "Weigh out spirits on a 0.01g scale. Combine vermouth and Campari. Chill whole milk to exactly 4°C."
                }
            },
            {
                phase: "execution",
                label: "Milk Clarification",
                tweakReminder: "Technique Focus: Milk clarify the red bitter base to strip proteins, yielding a transparent ruby hue.",
                timer: 600,
                textVariants: {
                    beginner: "Pour the combined spirits slowly into the cold milk. Add citric acid. The milk will curdle. Let it sit for 10 minutes, then filter it through a coffee filter until perfectly crystal clear.",
                    professional: "Slowly pour spirits into milk (never milk into spirits) to curdle. Let rest 10 min. Pass through double coffee filter.",
                    michelin: "Drop spirits into milk at 4°C. Let curdle for exactly 600s. Pass through a chilled Buchner funnel under vacuum filtration to achieve 100% clarity."
                }
            },
            {
                phase: "execution",
                label: "Dilution and Chilling",
                tweakReminder: "",
                timer: 300,
                textVariants: {
                    beginner: "Add the gin and water to the clarified mixture. Stir well and place in the freezer until it is very cold (around 28°F / -2°C).",
                    professional: "Incorporate gin and dilution water. Chill to -3°C.",
                    michelin: "Blend in London Dry Gin and dilution water. Target a final sugar density of 12 Brix. Supercool the batch to -4°C in a brine bath."
                }
            },
            {
                phase: "assembly",
                label: "Carbonation & Bottling",
                tweakReminder: "Active Delta Tweak: Clarifying vermouth and campari via milk-washing to achieve high carbonation stability.",
                timer: 120,
                textVariants: {
                    beginner: "Pour the cold cocktail into a carbonator bottle. Charge with CO2, shake, and let it sit for a minute before opening.",
                    professional: "Carbonate cocktail using a whipping siphon or carbonator rig at 40 PSI.",
                    michelin: "Transfer to a stainless steel carbonation keg. Pressurize with CO2 to exactly 45 PSI at -2°C. Agitate to dissolve gas. Bottle under counter-pressure."
                },
                toolVariants: {
                    "tool-siphon": {
                        beginner: "Pour the supercooled Negroni batch into your whipping siphon. Charge with 1 CO2 charger (soda charger), shake vigorously, and rest in ice bath.",
                        professional: "Charge supercooled batch in iSi siphon with 2 CO2 chargers. Release pressure slowly to prevent foaming.",
                        michelin: "Pour batch into siphon at -4°C. Charge with 2 CO2 chargers. Shake for 60s, rest in brine bath at -4°C for 5 minutes, then vent pressure rapidly to lock carbonation.",
                        timer: 60
                    }
                }
            },
            {
                phase: "assembly",
                label: "Garnish & Serve",
                tweakReminder: "",
                timer: 0,
                textVariants: {
                    beginner: "Pour into a chilled glass over a large ice cube. Express an orange peel over the glass.",
                    professional: "Serve in a double rocks glass over a clear ice block. Garnish with orange coin.",
                    michelin: "Pour into a chilled crystal tumbler over a custom-cut -10°C clear ice sphere. Express orange essential oils, discard peel."
                }
            }
        ],
        comparison: {
            baseline: [
                { title: "Clarity Vector", desc: "Standard unclarified Negroni (cloudy red vermouth and campari dispersion)." },
                { title: "Carbonation Level", desc: "Uncarbonated, standard stir-and-dilute ice method." }
            ],
            test: [
                { title: "Clarity Vector", desc: "Milk-clarified base. Proteins strip tannins and cloudiness, yielding a transparent ruby hue.", isTweak: true },
                { title: "Carbonation Level", desc: "Carbonated to 45 PSI at supercooled temperatures for sparkling mouthfeel.", isTweak: true }
            ]
        }
    },
    nitro_matcha: {
        projectName: "Nitro-Charged Matcha Lab",
        baselineName: "Whisked Matcha Latte Control v1.0",
        activeBatch: 2,
        defaultTweakCategory: "Technique",
        defaultTweakText: "Nitro-charging the matcha infusion using N2O to create a thick, velvety micro-foam structure.",
        lab: "drinks",
        ingredientSections: {
            cream: "Matcha Base",
            soak: "Sweetener & Liquid",
            assembly: "Foaming Agent & Garnish"
        },
        ingredients: {
            cream: [
                { name: "Ceremonial Grade Matcha", baseWeight: 4, unit: "g" },
                { name: "Water (filtered at 80°C)", baseWeight: 100, unit: "ml" }
            ],
            soak: [
                { name: "Oat Milk (Barista Blend)", baseWeight: 150, unit: "ml" },
                { name: "Agave Syrup", baseWeight: 10, unit: "g" }
            ],
            assembly: [
                { 
                    name: "Xanthan Gum (stabilizer)", 
                    baseWeight: 0.1, 
                    unit: "g", 
                    tweakHighlighted: true,
                    baselineText: "No stabilizer (separated latte)",
                    testText: "Xanthan gum emulsion stabilizer (&Delta; Tweak)"
                }
            ]
        },
        steps: [
            {
                phase: "mise-en-place",
                label: "Prepare Ingredients",
                tweakReminder: "",
                timer: 0,
                textVariants: {
                    beginner: "Measure matcha, heat water, and chill oat milk.",
                    professional: "Weigh matcha. Calibrate water temp to 80°C.",
                    michelin: "Weigh ceremonial matcha. Heat mineral-calibrated water to exactly 78°C."
                }
            },
            {
                phase: "execution",
                label: "Matcha Hydration",
                tweakReminder: "",
                timer: 180,
                textVariants: {
                    beginner: "Whisk the matcha powder and hot water together in a bowl using a bamboo whisk until frothy.",
                    professional: "Whisk matcha in traditional chawan with chasen to suspend particles.",
                    michelin: "Homogenize matcha and water at 10,000 RPM using a rotor-stator mixer to fully hydrate tea solids."
                }
            },
            {
                phase: "execution",
                label: "Milk Emulsion",
                tweakReminder: "",
                timer: 120,
                textVariants: {
                    beginner: "Mix oat milk, agave syrup, and a tiny pinch of xanthan gum. Whisk until smooth.",
                    professional: "Combine oat milk, agave, and xanthan gum. Blend to stabilize.",
                    michelin: "Blend oat milk, agave, and xanthan gum (0.1g) to build a stable shear-thinning emulsion."
                }
            },
            {
                phase: "assembly",
                label: "Charging & Pour",
                tweakReminder: "Active Delta Tweak: Nitro-charging the matcha infusion using N2O to create a thick, velvety micro-foam structure.",
                timer: 60,
                textVariants: {
                    beginner: "Pour the mixture into a whipping siphon, charge with 1 N2O charger, and shake. Pour matcha first, then foam on top.",
                    professional: "Pour matcha into glass. Charge sweetened milk in siphon with 1 N2O. Layer foam.",
                    michelin: "Pour matcha over clear ice block. Discharge stabilized nitrogen-oat milk foam through a flat-tip nozzle to create a crisp layered boundary."
                },
                toolVariants: {
                    "tool-siphon": {
                        beginner: "Pour the oat milk mix into your whipping siphon. Charge with 1 N2O charger, shake well, and express slowly over the matcha base.",
                        professional: "Charge milk base in iSi siphon with 1 N2O. Layer nitrogen foam over matcha base.",
                        michelin: "Charge stabilized milk base in iSi whip siphon with 2 N2O canisters. Purge siphon, rest in ice bath. Express through specialized draught nozzle to build a micro-foamed head.",
                        timer: 30
                    }
                }
            }
        ],
        comparison: {
            baseline: [
                { title: "Foam Stability", desc: "Whisked milk foam that collapses within 3 minutes of pouring." },
                { title: "Aeration gas", desc: "Atmospheric air whipped into milk." }
            ],
            test: [
                { title: "Foam Stability", desc: "Xanthan-stabilized emulsion maintaining velvet head for 20+ minutes.", isTweak: true },
                { title: "Aeration gas", desc: "Pure N2O micro-bubble infusion for sweet, creamy mouthfeel without dairy.", isTweak: true }
            ]
        }
    }
};

// Add PANTRY_DATABASE before State
const PANTRY_DATABASE = {
    pantry_focaccia: {
        projectName: "Rustic Pantry Focaccia",
        baselineName: "Basic Focaccia v1.0",
        activeBatch: 1,
        defaultTweakCategory: "Hydration",
        defaultTweakText: "Testing high hydration dough from pantry staples.",
        lab: "culinary",
        ingredientSections: {
            cream: "Base Ingredients",
            soak: "Liquids & Yeast",
            assembly: "Baking & Topping"
        },
        keywords: ["flour", "yeast", "oil", "water", "salt", "olive"],
        ingredients: {
            cream: [], 
            soak: [
                { name: "Bread Flour", baseWeight: 500, unit: "g" },
                { name: "Water", baseWeight: 400, unit: "g" },
                { name: "Salt", baseWeight: 10, unit: "g" },
                { name: "Instant Yeast", baseWeight: 5, unit: "g" }
            ],
            assembly: [
                { name: "Olive Oil", baseWeight: 50, unit: "g" }
            ]
        },
        steps: [
            {
                phase: "mise-en-place",
                label: "Autolyse",
                tweakReminder: "",
                timer: 1800,
                textVariants: {
                    beginner: "Mix flour and water and let sit for 30 minutes.",
                    professional: "Autolyse flour and water for 30 minutes.",
                    michelin: "Autolyse at 75F for 30 minutes to maximize extensibility."
                }
            }
        ],
        comparison: {
            baseline: [ { title: "Standard Focaccia", desc: "Original baseline control ingredients and techniques." } ],
            test: [ { title: "Pantry Batch", desc: "Testing high hydration dough from pantry staples.", isTweak: true } ]
        }
    },
    pantry_frittata: {
        projectName: "Fridge-Clearout Frittata",
        baselineName: "Standard Egg Base",
        activeBatch: 1,
        defaultTweakCategory: "Time-Temp",
        defaultTweakText: "Low and slow baking to avoid rubbery eggs.",
        lab: "culinary",
        ingredientSections: {
            cream: "Egg Base",
            soak: "Vegetables & Fillers",
            assembly: "Cheese & Garnish"
        },
        keywords: ["egg", "onion", "cheese", "milk", "bacon", "spinach", "vegetable"],
        ingredients: {
            cream: [
                { name: "Eggs", baseWeight: 300, unit: "g" },
                { name: "Milk", baseWeight: 50, unit: "g" }
            ],
            soak: [],
            assembly: [
                { name: "Mixed Veg/Cheese", baseWeight: 200, unit: "g" }
            ]
        },
        steps: [
            {
                phase: "execution",
                label: "Whip and Bake",
                tweakReminder: "",
                timer: 900,
                textVariants: {
                    beginner: "Whisk eggs, mix in veggies, and bake until set.",
                    professional: "Blend eggs and milk, fold in garnish, bake at 350F for 15m.",
                    michelin: "Homogenize eggs and milk, strain, gently fold ingredients. Bake gently in a water bath at 300F."
                }
            }
        ],
        comparison: {
            baseline: [ { title: "Standard Eggs", desc: "Original baseline control ingredients and techniques." } ],
            test: [ { title: "Pantry Batch", desc: "Low and slow baking to avoid rubbery eggs.", isTweak: true } ]
        }
    },
    pantry_cold_brew: {
        projectName: "Precision Cold Brew Concentrate",
        baselineName: "Standard Steeped Brew",
        activeBatch: 1,
        defaultTweakCategory: "Time-Temp",
        defaultTweakText: "Testing a warm-start 60°C bloom followed by 18-hour cold brew extraction.",
        lab: "drinks",
        ingredientSections: {
            cream: "Coffee Beans",
            soak: "Infusion Liquid",
            assembly: "Dilution & Serving"
        },
        keywords: ["coffee", "water", "ice", "milk"],
        ingredients: {
            cream: [
                { name: "Coffee Beans (Coarse Grind)", baseWeight: 100, unit: "g" }
            ],
            soak: [
                { name: "Filtered Water (Cold)", baseWeight: 500, unit: "g" }
            ],
            assembly: [
                { 
                    name: "Hot Water (Blooming)", 
                    baseWeight: 100, 
                    unit: "g", 
                    tweakHighlighted: true,
                    baselineText: "Cold water start",
                    testText: "60°C Hot Bloom (&Delta; Tweak)"
                }
            ]
        },
        steps: [
            {
                phase: "mise-en-place",
                label: "Grind Beans",
                timer: 0,
                textVariants: {
                    beginner: "Coarsely grind coffee beans. Heat 100g water.",
                    professional: "Coarse grind (1000 microns). Heat bloom water to 60°C.",
                    michelin: "Grind coffee to 950 microns. Calibrate bloom water to 60°C."
                }
            },
            {
                phase: "execution",
                label: "Hot Bloom & Steep",
                timer: 64800,
                textVariants: {
                    beginner: "Pour hot water over coffee to wet it for 1 minute. Add cold water, stir, and steep in fridge for 18 hours.",
                    professional: "Bloom with 60°C water for 60s, top with cold water. Cold steep at 4°C for 18 hours.",
                    michelin: "Vacuum seal coffee and bloom water for 60s. Add cold water, submerge in water bath at 4°C for 18 hours."
                }
            }
        ],
        comparison: {
            baseline: [ { title: "Acidity Level", desc: "Low acidity but less volatile aroma compounds." } ],
            test: [ { title: "Acidity Level", desc: "Warm bloom extracts highly volatile floral notes while retaining low-acidity base.", isTweak: true } ]
        }
    }
};

// 2. STATE MANAGER (Now tracking Skill Levels and Tools checklist)
const State = {
    activeLab: "culinary", // culinary, drinks
    notebooks: [
        { id: "culinary", name: "CULINARY LAB", theme: "culinary" },
        { id: "drinks", name: "DRINKS LAB", theme: "drinks" }
    ],
    activeProjectId: "tiramisu",
    scaleMultiplier: 1.0,
    currentTweakCategory: "Ingredients",
    currentTweakText: "",
    currentScreen: "screen-setup",
    
    // NEW Technical Engine parameters
    skillLevel: "beginner", // beginner, professional, michelin
    activeTools: new Set(["tool-whisk", "tool-doubleboiler"]), // Default tools
    toolsInventory: [],
    toolPhotoBase64: null,
    
    // Cooking view step state
    currentStepIndex: 0,
    activeCookingPhase: "mise-en-place",
    
    // Active Timer properties
    timerInterval: null,
    timerDuration: 0,
    timerRemaining: 0,
    timerState: "stopped", // stopped, running, paused, finished
    
    // Web Speech API
    speechRecognition: null,
    voiceListening: false,
    
    // Sensory analytics inputs
    evaluation: {
        texture: 3,
        structure: 4,
        flavor: 3,
        moisture: "perfect",
        structuralIntegrity: "held",
        verdict: "",
        nextAction: "",
        platingPhoto: null
    },
    
    // Recipe Creator Mode & Stepper State
    creatorMode: "guided", // 'guided' | 'detailed'
    creatorStep: 1 // 1: Concept, 2: Ingredients, 3: Steps, 4: Review
};

// 3. UI ELEMENT REFERENCES
const UI = {
    themeToggle: document.getElementById("themeToggle"),
    homeScreen: document.getElementById("homeScreen"),
    mainWorkspace: document.getElementById("mainWorkspace"),
    recipeGrid: document.getElementById("recipeGrid"),
    goHomeBtn: document.getElementById("goHomeBtn"),
    recipeSearchInput: document.getElementById("recipeSearchInput"),
    openPantryBtn: document.getElementById("openPantryBtn"),
    pantryModal: document.getElementById("pantryModal"),
    closePantryBtn: document.getElementById("closePantryBtn"),
    pantryIngredientsInput: document.getElementById("pantryIngredientsInput"),
    findPantryRecipesBtn: document.getElementById("findPantryRecipesBtn"),
    pantryResultsContainer: document.getElementById("pantryResultsContainer"),
    pantryRecipeList: document.getElementById("pantryRecipeList"),
    screenNavButtons: document.querySelectorAll(".nav-btn"),
    screenNavigation: document.getElementById("screenNavigation"),
    screens: document.querySelectorAll(".workspace-screen"),
    
    // Lab switchers & Dynamic UI titles
    culinaryLabTab: document.getElementById("culinaryLabTab"),
    drinksLabTab: document.getElementById("drinksLabTab"),
    ingredientSecHeader1: document.getElementById("ingredientSecHeader1"),
    ingredientSecHeader2: document.getElementById("ingredientSecHeader2"),
    ingredientSecHeader3: document.getElementById("ingredientSecHeader3"),
    creatorModalTitle: document.getElementById("creatorModalTitle"),
    creatorModalDesc: document.getElementById("creatorModalDesc"),
    
    // Scale controls
    scaleButtons: document.querySelectorAll(".scale-btn"),
    
    // Ingredient Lists
    creamIngredients: document.getElementById("creamIngredients"),
    soakIngredients: document.getElementById("soakIngredients"),
    assemblyIngredients: document.getElementById("assemblyIngredients"),
    leftPaneTweakText: document.getElementById("leftPaneTweakText"),
    
    // Screen 1: Setup Elements
    setupTweakTitle: document.getElementById("setupTweakTitle"),
    setupTweakCategory: document.getElementById("setupTweakCategory"),
    tweakCategory: document.getElementById("tweakCategory"),
    tweakDetails: document.getElementById("tweakDetails"),
    baselineComparisonBody: document.getElementById("baselineComparisonBody"),
    testComparisonBody: document.getElementById("testComparisonBody"),
    resetVariablesBtn: document.getElementById("resetVariablesBtn"),
    startBatchBtn: document.getElementById("startBatchBtn"),
    
    // Technical System Radio / Checkboxes
    skillRadios: document.getElementsByName("skillLevelRadio"),
    toolsChecklist: document.getElementById("toolsChecklist"),
    toolAdaptationPrompt: document.getElementById("toolAdaptationPrompt"),
    confirmAdaptBtn: document.getElementById("confirmAdaptBtn"),
    dismissAdaptBtn: document.getElementById("dismissAdaptBtn"),
    
    // Screen 2: Cooking view Elements
    labProjectTitle: document.getElementById("labProjectTitle"),
    macroTabs: document.querySelectorAll(".macro-tab"),
    stepNumberLabel: document.getElementById("stepNumberLabel"),
    stepPhaseLabel: document.getElementById("stepPhaseLabel"),
    activeStepText: document.getElementById("activeStepText"),
    stepProgressFill: document.getElementById("stepProgressFill"),
    
    // Cooking View Timers
    stepTimerContainer: document.getElementById("stepTimerContainer"),
    timerTime: document.getElementById("timerTime"),
    timerPlayPauseBtn: document.getElementById("timerPlayPauseBtn"),
    timerPlayIcon: document.getElementById("timerPlayIcon"),
    timerPauseIcon: document.getElementById("timerPauseIcon"),
    timerResetBtn: document.getElementById("timerResetBtn"),
    timerAudio: document.getElementById("timerAudio"),
    stepTweakReminder: document.getElementById("stepTweakReminder"),
    labTweakText: document.getElementById("labTweakText"),
    
    // Hands-Free Widgets
    gestureSensorZone: document.getElementById("gestureSensorZone"),
    gestureLight: document.getElementById("gestureLight"),
    gestureStatus: document.getElementById("gestureStatus"),
    simulateWaveBtn: document.getElementById("simulateWaveBtn"),
    toggleCameraBtn: document.getElementById("toggleCameraBtn"),
    webcamMockOverlay: document.getElementById("webcamMockOverlay"),
    webcamVideo: document.getElementById("webcamVideo"),
    voiceMicToggle: document.getElementById("voiceMicToggle"),
    micBtnText: document.getElementById("micBtnText"),
    voiceCommandLog: document.getElementById("voiceCommandLog"),
    prevStepBtn: document.getElementById("prevStepBtn"),
    nextStepBtn: document.getElementById("nextStepBtn"),
    completeBatchBtn: document.getElementById("completeBatchBtn"),
    
    // Screen 3: Evaluation Elements
    sliderTexture: document.getElementById("sliderTexture"),
    readoutTexture: document.getElementById("readoutTexture"),
    sliderStructure: document.getElementById("sliderStructure"),
    readoutStructure: document.getElementById("readoutStructure"),
    sliderFlavor: document.getElementById("sliderFlavor"),
    readoutFlavor: document.getElementById("readoutFlavor"),
    moistureMatrix: document.getElementById("moistureMatrix"),
    structureMatrix: document.getElementById("structureMatrix"),
    verdictNotesInput: document.getElementById("verdictNotesInput"),
    dictateVerdictBtn: document.getElementById("dictateVerdictBtn"),
    dictateBtnText: document.getElementById("dictateBtnText"),
    nextActionInput: document.getElementById("nextActionInput"),
    saveReportBtn: document.getElementById("saveReportBtn"),
    exportReportBtn: document.getElementById("exportReportBtn"),
    
    // Modals
    successModal: document.getElementById("successModal"),
    modalTitle: document.getElementById("modalTitle"),
    modalBody: document.getElementById("modalBody"),
    modalCloseBtn: document.getElementById("modalCloseBtn"),
    
    // Plating Photo Upload
    platingPhotoInput: document.getElementById("platingPhotoInput"),
    platingPhotoPreview: document.getElementById("platingPhotoPreview"),
    platingPhotoImage: document.getElementById("platingPhotoImage"),
    removePhotoBtn: document.getElementById("removePhotoBtn"),
    
    // NEW Recipe Creator elements
    openCreatorBtn: document.getElementById("openCreatorBtn"),
    recipeCreatorModal: document.getElementById("recipeCreatorModal"),
    closeCreatorBtn: document.getElementById("closeCreatorBtn"),
    newRecipeName: document.getElementById("newRecipeName"),
    newRecipeBaseline: document.getElementById("newRecipeBaseline"),
    newRecipeBatchNum: document.getElementById("newRecipeBatchNum"),
    newRecipeTweakCat: document.getElementById("newRecipeTweakCat"),
    newRecipeTweakText: document.getElementById("newRecipeTweakText"),
    ingredientInputRowsContainer: document.getElementById("ingredientInputRowsContainer"),
    addNewIngRowBtn: document.getElementById("addNewIngRowBtn"),
    stepInputRowsContainer: document.getElementById("stepInputRowsContainer"),
    addNewStepRowBtn: document.getElementById("addNewStepRowBtn"),
    saveNewRecipeBtn: document.getElementById("saveNewRecipeBtn"),
    
    // Guided Creator Elements
    viewToggleGuided: document.getElementById("viewToggleGuided"),
    viewToggleDetailed: document.getElementById("viewToggleDetailed"),
    creatorGuidedView: document.getElementById("creatorGuidedView"),
    creatorDetailedView: document.getElementById("creatorDetailedView"),
    guidedRecipeName: document.getElementById("guidedRecipeName"),
    guidedAutofillAiBtn: document.getElementById("guidedAutofillAiBtn"),
    guidedAutofillAiBtnText: document.getElementById("guidedAutofillAiBtnText"),
    guidedTweakCategory: document.getElementById("guidedTweakCategory"),
    guidedRecipeBaseline: document.getElementById("guidedRecipeBaseline"),
    guidedTweakText: document.getElementById("guidedTweakText"),
    guidedIngredientRowsContainer: document.getElementById("guidedIngredientRowsContainer"),
    guidedAddIngBtn: document.getElementById("guidedAddIngBtn"),
    guidedQuickPasteToggle: document.getElementById("guidedQuickPasteToggle"),
    guidedQuickPasteArea: document.getElementById("guidedQuickPasteArea"),
    guidedQuickPasteInput: document.getElementById("guidedQuickPasteInput"),
    guidedApplyQuickPasteBtn: document.getElementById("guidedApplyQuickPasteBtn"),
    guidedCancelQuickPasteBtn: document.getElementById("guidedCancelQuickPasteBtn"),
    guidedStepRowsContainer: document.getElementById("guidedStepRowsContainer"),
    guidedAddStepBtn: document.getElementById("guidedAddStepBtn"),
    guidedReviewCard: document.getElementById("guidedReviewCard"),
    guidedBackBtn: document.getElementById("guidedBackBtn"),
    guidedCancelBtn: document.getElementById("guidedCancelBtn"),
    guidedNextBtn: document.getElementById("guidedNextBtn"),
    guidedRegisterBtn: document.getElementById("guidedRegisterBtn"),
    guidedSwitchToDetailedBtn: document.getElementById("guidedSwitchToDetailedBtn"),
    detailedReturnToGuidedBtn: document.getElementById("detailedReturnToGuidedBtn"),
    
    // Kitchen Tools elements
    openToolsBtn: document.getElementById("openToolsBtn"),
    toolsScreen: document.getElementById("toolsScreen"),
    toolsGrid: document.getElementById("toolsGrid"),
    addNewToolBtn: document.getElementById("addNewToolBtn"),
    toolCreatorModal: document.getElementById("toolCreatorModal"),
    closeToolCreatorBtn: document.getElementById("closeToolCreatorBtn"),
    saveNewToolBtn: document.getElementById("saveNewToolBtn"),
    toolPhotoInput: document.getElementById("toolPhotoInput"),
    toolPhotoPreview: document.getElementById("toolPhotoPreview"),
    toolPhotoImage: document.getElementById("toolPhotoImage"),
    removeToolPhotoBtn: document.getElementById("removeToolPhotoBtn"),
    newToolName: document.getElementById("newToolName"),
    newToolDesc: document.getElementById("newToolDesc"),
    
    // BATCH Dynamic Lab Switcher & Notebook Creator UI Elements
    labSwitcher: document.getElementById("labSwitcher"),
    addNewLabTabBtn: document.getElementById("addNewLabTabBtn"),
    notebookCreatorModal: document.getElementById("notebookCreatorModal"),
    closeNotebookCreatorBtn: document.getElementById("closeNotebookCreatorBtn"),
    saveNewNotebookBtn: document.getElementById("saveNewNotebookBtn"),
    newNotebookName: document.getElementById("newNotebookName"),
    newNotebookTheme: document.getElementById("newNotebookTheme"),
    
    // BATCH Sync UI Elements
    openSyncBtn: document.getElementById("openSyncBtn"),
    syncModal: document.getElementById("syncModal"),
    closeSyncBtn: document.getElementById("closeSyncBtn"),
    closeSyncModalBtn: document.getElementById("closeSyncModalBtn"),
    syncConnectionStatus: document.getElementById("syncConnectionStatus"),
    syncLocalTime: document.getElementById("syncLocalTime"),
    syncCloudTime: document.getElementById("syncCloudTime"),
    syncStatusSummary: document.getElementById("syncStatusSummary"),
    syncNowBtn: document.getElementById("syncNowBtn"),
    forceUploadBtn: document.getElementById("forceUploadBtn"),
    forceDownloadBtn: document.getElementById("forceDownloadBtn"),
    
    // AI Autofill Creator Form Elements
    autofillAiBtn: document.getElementById("autofillAiBtn"),
    autofillAiBtnText: document.getElementById("autofillAiBtnText"),
    creatorSuggestedToolsContainer: document.getElementById("creatorSuggestedToolsContainer"),
    creatorSuggestedToolsList: document.getElementById("creatorSuggestedToolsList")
};

// 4. CORE APP FUNCTIONS

function updateLocalTimestamp() {
    localStorage.setItem("BATCH_LAST_UPDATED", Date.now().toString());
}

function loadNotebooks() {
    const raw = localStorage.getItem("BATCH_NOTEBOOKS_V1");
    if (raw) {
        try {
            State.notebooks = JSON.parse(raw);
        } catch(e) {
            console.error("Failed loading notebooks from local storage", e);
        }
    }
}

function saveNotebooks() {
    try {
        localStorage.setItem("BATCH_NOTEBOOKS_V1", JSON.stringify(State.notebooks));
        updateLocalTimestamp();
    } catch(e) {
        console.error("Failed saving notebooks to local storage", e);
    }
}

// Initialize Application
async function init() {
    loadNotebooks();
    loadUnifiedDatabase();
    loadToolsInventory();
    renderLabSwitcher();
    setupEventHandlers();
    
    // Show home screen
    UI.homeScreen.style.display = "block";
    UI.mainWorkspace.style.display = "none";
    UI.goHomeBtn.style.display = "none";
    if (UI.screenNavigation) UI.screenNavigation.style.display = "none";
    renderRecipeLibrary();
    setupVoiceRecognition();
    setupWebcamGestureMock();
    renderIngredients();
    renderComparisonTables();
    
    // Initialize Recipe Creator rows & guided flow
    addIngredientInputRow("", "", "g");
    addStepInputRow("", "mise-en-place", "", "", "", "", 0);
    initGuidedCreator();
    
    // Automatically Sync with server on startup
    try {
        await performStartupSync();
    } catch (e) {
        console.warn("Startup sync check failed. Continuing in local-only cache mode.", e);
    }
}

// Load Unified Database from localStorage
function loadUnifiedDatabase() {
    try {
        const saved = localStorage.getItem("BATCH_RECIPE_DATABASE_V2");
        if (saved) {
            const customDb = JSON.parse(saved);
            // Clear current memory database and load from customDb
            for (let key in RECIPE_DATABASE) {
                delete RECIPE_DATABASE[key];
            }
            for (let key in customDb) {
                RECIPE_DATABASE[key] = customDb[key];
            }
        }
    } catch(e) {
        console.error("Failed loading unified database", e);
    }
}

function saveUnifiedDatabase() {
    try {
        localStorage.setItem("BATCH_RECIPE_DATABASE_V2", JSON.stringify(RECIPE_DATABASE));
        updateLocalTimestamp();
    } catch(e) {
        console.error("Local storage save failed:", e);
    }
}

// Render Recipe Library Home Screen
function renderRecipeLibrary(filter = "") {
    UI.recipeGrid.innerHTML = "";
    
    for (let key in RECIPE_DATABASE) {
        const project = RECIPE_DATABASE[key];
        
        // Filter by active lab mode
        const projectLab = project.lab || "culinary";
        if (projectLab !== State.activeLab) continue;
        
        // Filter by text
        if (filter) {
            const searchStr = (project.projectName + " " + project.baselineName).toLowerCase();
            if (!searchStr.includes(filter.toLowerCase())) continue;
        }

        const card = document.createElement("div");
        card.className = "recipe-card-large";
        card.innerHTML = `
            <div class="card-batch-badge">Batch #${project.activeBatch}</div>
            <h3>${project.projectName}</h3>
            <span class="card-baseline">Baseline: ${project.baselineName}</span>
        `;
        
        card.addEventListener("click", () => {
            loadProjectState(key);
            UI.homeScreen.style.display = "none";
            UI.mainWorkspace.style.display = "grid"; // Split pane uses grid
            UI.goHomeBtn.style.display = "flex";
            if (UI.screenNavigation) UI.screenNavigation.style.display = "flex";
            
            // Re-bind screen navigation state
            UI.screens.forEach(s => s.classList.remove("active"));
            UI.screenNavButtons.forEach(btn => btn.classList.remove("active"));
            document.getElementById("screen-setup").classList.add("active");
            document.querySelector("[data-screen='screen-setup']").classList.add("active");
        });
        
        UI.recipeGrid.appendChild(card);
    }
}

// Load dynamic project details
function loadProjectState(projectId) {
    const project = RECIPE_DATABASE[projectId];
    State.activeProjectId = projectId;
    State.currentTweakCategory = project.defaultTweakCategory;
    State.currentTweakText = project.defaultTweakText;
    
    // Load config inputs
    UI.tweakCategory.value = State.currentTweakCategory;
    UI.tweakDetails.value = State.currentTweakText;
    
    // Sync setup screen labels
    UI.setupTweakTitle.textContent = `Variable Tweak: ${State.currentTweakText}`;
    UI.setupTweakCategory.textContent = State.currentTweakCategory;
    UI.setupTweakCategory.className = `tweak-badge badge-${State.currentTweakCategory.toLowerCase().replace(" ", "-")}`;
    
    // Left Formulation panel
    UI.leftPaneTweakText.innerHTML = `<strong>Tweak Active:</strong> ${State.currentTweakText}`;
    
    // Sync Cooking view
    UI.labProjectTitle.textContent = project.projectName;
    document.querySelectorAll(".lab-batch-badge").forEach(el => {
        el.textContent = `BATCH #${project.activeBatch} IN PROGRESS`;
    });
    document.querySelectorAll(".batch-indicator").forEach(el => {
        el.textContent = `BATCH #${project.activeBatch} SETUP`;
    });
    
    // Sync evaluation headers
    document.querySelector(".report-overview-header p").textContent = `Record sensory analytics for Batch #${project.activeBatch} to calibrate the next iteration.`;
    document.querySelector(".input-banner").textContent = `Batch #${project.activeBatch} Experimental Analytics`;
    document.querySelector(".ref-banner").textContent = `Batch #${project.activeBatch - 1} Reference (Baseline Control)`;
    document.querySelector(".ref-summary-card h4").textContent = `Batch #${project.activeBatch - 1} Review`;
    document.querySelector(".prefix-lock").textContent = `For Batch #${project.activeBatch + 1}, I should...`;
    
    // Set step index back to start
    State.currentStepIndex = 0;
    
    // Reset timer
    resetTimer();
    
    // Re-render
    renderIngredients();
    renderComparisonTables();
    syncCookingStep();
    
    // Fetch Suggested Tools dynamically
    fetchSuggestedTools(project);
}

// Render dynamic ingredient lists with formulas scaled
function renderIngredients() {
    const project = RECIPE_DATABASE[State.activeProjectId];
    const scale = State.scaleMultiplier;
    
    // Dynamically set Left Pane section headers based on recipe metadata
    const getSectionHeader = (secKey, fallback) => {
        if (project.ingredientSections && project.ingredientSections[secKey]) {
            return project.ingredientSections[secKey];
        }
        return fallback;
    };
    
    if (UI.ingredientSecHeader1) {
        UI.ingredientSecHeader1.textContent = getSectionHeader("cream", "Zabaglione & Cream");
    }
    if (UI.ingredientSecHeader2) {
        UI.ingredientSecHeader2.textContent = getSectionHeader("soak", "Ladyfinger Soak");
    }
    if (UI.ingredientSecHeader3) {
        UI.ingredientSecHeader3.textContent = getSectionHeader("assembly", "Assembly & Dusting");
    }
    
    // Map list render
    const populateList = (sectionKey, element) => {
        element.innerHTML = "";
        
        // Safety check if ingredient section is empty or missing in custom recipe
        if (!project.ingredients[sectionKey] || project.ingredients[sectionKey].length === 0) {
            const li = document.createElement("li");
            li.className = "ingredient-item";
            li.innerHTML = `<span class="ingredient-name ink-muted">None</span>`;
            element.appendChild(li);
            return;
        }
        
        project.ingredients[sectionKey].forEach(ing => {
            const scaledVal = (ing.baseWeight * scale).toFixed(0);
            const isTweakItem = ing.tweakHighlighted;
            
            const li = document.createElement("li");
            li.className = `ingredient-item ${isTweakItem ? 'highlighted-tweak' : ''}`;
            
            // Format name display
            let displayName = ing.name;
            if (isTweakItem) {
                displayName = `${ing.name}*`;
                li.setAttribute("title", `Tweak Applied: ${ing.testText}`);
            }
            
            li.innerHTML = `
                <span class="ingredient-name">${displayName}</span>
                <span class="ingredient-weight">${scaledVal}${ing.unit}</span>
            `;
            element.appendChild(li);
        });
    };
    
    populateList("cream", UI.creamIngredients);
    populateList("soak", UI.soakIngredients);
    populateList("assembly", UI.assemblyIngredients);
}

// Render Comparison Baseline vs Test Formulation
function renderComparisonTables() {
    const project = RECIPE_DATABASE[State.activeProjectId];
    
    const renderCol = (list, element, isTestCol) => {
        element.innerHTML = "";
        if (!list || list.length === 0) {
            element.innerHTML = `<div class="comparison-item-desc">No dynamic deltas specified.</div>`;
            return;
        }
        
        list.forEach(item => {
            const card = document.createElement("div");
            card.className = `comparison-item ${item.isTweak ? 'tweak-highlighted' : ''}`;
            
            card.innerHTML = `
                <div class="comparison-item-header ${item.isTweak ? 'tweak-highlighted' : ''}">
                    <span>${item.title}</span>
                </div>
                <div class="comparison-item-desc">${item.desc}</div>
            `;
            element.appendChild(card);
        });
    };
    
    renderCol(project.comparison.baseline, UI.baselineComparisonBody, false);
    renderCol(project.comparison.test, UI.testComparisonBody, true);
}

// Dynamic Instruction Compiler Engine (TECHNICAL SYSTEM)
function compileActiveStepText(step) {
    const skill = State.skillLevel; // beginner, professional, michelin
    const tools = State.activeTools; // Set of checked tool IDs
    
    let compiledText = "";
    let compiledTimer = step.timer || 0;
    let toolOverrideActive = false;
    
    // Create an ordered priority array for tools
    const TOOL_PRIORITY = ["tool-chambervac", "tool-siphon", "tool-mixer", "tool-sousvide", "tool-doubleboiler", "tool-whisk"];
    
    if (step.toolVariants) {
        // Find if any of the active tools are registered in this step's overrides by priority
        for (let priorityTool of TOOL_PRIORITY) {
            if (tools.has(priorityTool) && step.toolVariants[priorityTool]) {
                const variant = step.toolVariants[priorityTool];
                
                // Get the text variant for the active skill level under this tool
                if (variant[skill]) {
                    compiledText = variant[skill];
                } else if (variant.beginner) {
                    // Fallback to beginner text of this tool
                    compiledText = variant.beginner;
                }
                
                // Update timer if tool variant specifies one
                if (variant.timer !== undefined) {
                    compiledTimer = variant.timer;
                }
                
                toolOverrideActive = true;
                break; // Use the highest priority tool override found
            }
        }
    }
    
    // If no tool-specific override is active, use the standard skill variants
    if (!toolOverrideActive) {
        if (step.textVariants) {
            if (step.textVariants[skill]) {
                compiledText = step.textVariants[skill];
            } else if (step.textVariants.beginner) {
                compiledText = step.textVariants.beginner;
            }
        } else {
            // Hard fallback to step text
            compiledText = step.text || "No instruction text provided.";
        }
    }
    
    return {
        text: compiledText,
        timer: compiledTimer
    };
}

// Sync focus step display in Active Lab mode
function syncCookingStep() {
    const project = RECIPE_DATABASE[State.activeProjectId];
    const step = project.steps[State.currentStepIndex];
    
    if (!step) return;
    
    State.activeCookingPhase = step.phase;
    
    // Update labels
    UI.stepNumberLabel.textContent = `Step ${State.currentStepIndex + 1} of ${project.steps.length}`;
    UI.stepPhaseLabel.textContent = step.phase.replace("-", " ").toUpperCase();
    
    // Technical System compile
    const compilation = compileActiveStepText(step);
    
    // Large focus text
    UI.activeStepText.innerHTML = compilation.text;
    
    // Highlight step changes/tweaks if applicable
    if (step.tweakReminder) {
        UI.stepTweakReminder.style.display = "block";
        UI.labTweakText.innerHTML = `<strong>Tweak Adjustment:</strong> ${step.tweakReminder}`;
        UI.activeStepText.classList.add("tweak-active-step");
    } else {
        UI.stepTweakReminder.style.display = "none";
        UI.activeStepText.classList.remove("tweak-active-step");
    }
    
    // Setup integrated step timer
    if (compilation.timer > 0) {
        UI.stepTimerContainer.style.display = "flex";
        initializeTimer(compilation.timer);
    } else {
        UI.stepTimerContainer.style.display = "none";
        resetTimer();
    }
    
    // Macro Phase Navigation Highlight
    UI.macroTabs.forEach(tab => {
        if (tab.dataset.phase === step.phase) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });
    
    // Progress Fill
    const progressPercent = ((State.currentStepIndex + 1) / project.steps.length) * 100;
    UI.stepProgressFill.style.width = `${progressPercent}%`;
    
    // Back and Next button visibility
    UI.prevStepBtn.disabled = State.currentStepIndex === 0;
    if (State.currentStepIndex === project.steps.length - 1) {
        UI.nextStepBtn.style.display = "none";
        UI.completeBatchBtn.style.display = "inline-flex";
    } else {
        UI.nextStepBtn.style.display = "inline-flex";
        UI.completeBatchBtn.style.display = "none";
    }
}

// 5. INTERACTIVE TIMERS SYSTEM
function initializeTimer(durationSeconds) {
    resetTimer();
    State.timerDuration = durationSeconds;
    State.timerRemaining = durationSeconds;
    updateTimerUI();
}

function startTimer() {
    if (State.timerState === "running") return;
    
    State.timerState = "running";
    UI.timerTime.classList.add("timer-active");
    UI.timerTime.classList.remove("timer-finished");
    
    UI.timerPlayIcon.style.display = "none";
    UI.timerPauseIcon.style.display = "block";
    
    State.timerInterval = setInterval(() => {
        State.timerRemaining--;
        updateTimerUI();
        
        if (State.timerRemaining <= 0) {
            triggerTimerAlarm();
        }
    }, 1000);
}

function pauseTimer() {
    if (State.timerState !== "running") return;
    
    clearInterval(State.timerInterval);
    State.timerState = "paused";
    UI.timerTime.classList.remove("timer-active");
    
    UI.timerPlayIcon.style.display = "block";
    UI.timerPauseIcon.style.display = "none";
}

function resetTimer() {
    clearInterval(State.timerInterval);
    State.timerState = "stopped";
    UI.timerTime.className = "timer-time";
    
    UI.timerPlayIcon.style.display = "block";
    UI.timerPauseIcon.style.display = "none";
    
    const currentStep = RECIPE_DATABASE[State.activeProjectId].steps[State.currentStepIndex];
    if (currentStep) {
        // Compile timer dynamically
        const comp = compileActiveStepText(currentStep);
        if (comp.timer > 0) {
            State.timerRemaining = comp.timer;
        } else {
            State.timerRemaining = 0;
        }
    } else {
        State.timerRemaining = 0;
    }
    updateTimerUI();
}

function updateTimerUI() {
    const mins = Math.floor(State.timerRemaining / 60);
    const secs = State.timerRemaining % 60;
    UI.timerTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function triggerTimerAlarm() {
    clearInterval(State.timerInterval);
    State.timerState = "finished";
    UI.timerTime.className = "timer-time timer-finished";
    
    UI.timerPlayIcon.style.display = "block";
    UI.timerPauseIcon.style.display = "none";
    
    // Play sound via Web Audio API synthesizer for full robustness
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        
        // Pulse sound
        osc.start();
        setTimeout(() => osc.stop(), 800);
    } catch(e) {
        // Fallback to audio element
        UI.timerAudio.play().catch(err => console.log("Audio play failed: ", err));
    }
}

// 6. HANDS-FREE CONTROLS (SPEECH & GESTURES)

// Speech Recognition setup (Web Speech API)
function setupVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        UI.voiceMicToggle.disabled = true;
        UI.micBtnText.textContent = "Voice Commands Unsupported";
        return;
    }
    
    State.speechRecognition = new SpeechRecognition();
    State.speechRecognition.continuous = true;
    State.speechRecognition.interimResults = false;
    State.speechRecognition.lang = 'en-US';
    
    State.speechRecognition.onstart = () => {
        State.voiceListening = true;
        UI.voiceMicToggle.classList.add("listening");
        UI.micBtnText.textContent = "Listening...";
        addVoiceLog("Voice assistant activated.", true);
    };
    
    State.speechRecognition.onresult = (event) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript.trim().toLowerCase();
        
        addVoiceLog(`"${transcript}"`, false);
        processVoiceCommand(transcript);
    };
    
    State.speechRecognition.onerror = (event) => {
        console.error("Speech Recognition Error: ", event.error);
        if (event.error === 'not-allowed') {
            addVoiceLog("Microphone access denied.", true);
            stopVoiceListening();
        }
    };
    
    State.speechRecognition.onend = () => {
        if (State.voiceListening) {
            // Keep listening unless explicitly stopped
            State.speechRecognition.start();
        } else {
            stopVoiceListening();
        }
    };
}

function toggleVoiceListening() {
    if (!State.speechRecognition) return;
    
    if (State.voiceListening) {
        stopVoiceListening();
    } else {
        try {
            State.speechRecognition.start();
        } catch(e) {
            console.log("Speech already started: ", e);
        }
    }
}

function stopVoiceListening() {
    State.voiceListening = false;
    if (State.speechRecognition) {
        State.speechRecognition.stop();
    }
    UI.voiceMicToggle.classList.remove("listening");
    UI.micBtnText.textContent = "Enable Voice Commands";
    addVoiceLog("Voice assistant idle.", true);
}

function processVoiceCommand(cmd) {
    // Basic navigation commands
    if (cmd.includes("next") || cmd.includes("forward") || cmd.includes("advance")) {
        addVoiceLog("Command recognized: NEXT STEP", true);
        navigateStep(1);
    } else if (cmd.includes("back") || cmd.includes("previous") || cmd.includes("prev")) {
        addVoiceLog("Command recognized: PREVIOUS STEP", true);
        navigateStep(-1);
    } else if (cmd.includes("repeat") || cmd.includes("say again") || cmd.includes("read")) {
        addVoiceLog("Command recognized: REPEAT STEP", true);
        speakActiveStep();
    } else if (cmd.includes("timer") || cmd.includes("start") || cmd.includes("play")) {
        if (State.timerDuration > 0) {
            addVoiceLog("Command recognized: START TIMER", true);
            startTimer();
        }
    } else if (cmd.includes("pause") || cmd.includes("stop")) {
        if (State.timerDuration > 0) {
            addVoiceLog("Command recognized: PAUSE TIMER", true);
            pauseTimer();
        }
    }
}

function addVoiceLog(text, isAction) {
    UI.voiceCommandLog.innerHTML = "";
    const span = document.createElement("span");
    if (isAction) {
        span.className = "voice-action-recognized";
    } else {
        span.className = "voice-transcript";
    }
    span.textContent = text;
    UI.voiceCommandLog.appendChild(span);
}

// Text-to-Speech Synthesis: Speaks the current focus step aloud
function speakActiveStep() {
    if (!window.speechSynthesis) return;
    
    // Cancel ongoing synthesis
    window.speechSynthesis.cancel();
    
    const stepText = document.getElementById("activeStepText").textContent;
    const utterance = new SpeechSynthesisUtterance(stepText);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}

// Hover gesture detection simulation
function setupWebcamGestureMock() {
    let webcamActive = false;
    let localStream = null;
    let detectInterval = null;
    
    UI.toggleCameraBtn.addEventListener("click", () => {
        if (!webcamActive) {
            // Request camera stream for high fidelity gesture simulation
            navigator.mediaDevices.getUserMedia({ video: { width: 120, height: 90 } })
                .then(stream => {
                    localStream = stream;
                    UI.webcamVideo.srcObject = stream;
                    UI.webcamMockOverlay.style.display = "block";
                    UI.toggleCameraBtn.textContent = "Disable Camera Tracking";
                    UI.gestureStatus.textContent = "Camera tracking active. Wave hand!";
                    webcamActive = true;
                    startMotionDetection();
                })
                .catch(err => {
                    console.error("Camera access failed:", err);
                    alert("Camera access denied or unsupported. Use the wave simulator button instead.");
                });
        } else {
            stopCamera();
        }
    });

    function stopCamera() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        clearInterval(detectInterval);
        UI.webcamMockOverlay.style.display = "none";
        UI.toggleCameraBtn.textContent = "Enable Camera Tracking";
        UI.gestureStatus.textContent = "Wave hand here to advance";
        webcamActive = false;
    }

    // A lightweight frame-differencing algorithm inside canvas to simulate hand waving!
    function startMotionDetection() {
        const video = UI.webcamVideo;
        const canvas = UI.gestureCanvas;
        const ctx = canvas.getContext("2d");
        let lastFrameData = null;
        let motionThreshold = 150000; // Calibrated for gesture wave sensitivity

        detectInterval = setInterval(() => {
            if (video.paused || video.ended) return;
            
            // Draw video to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            if (lastFrameData) {
                let diff = 0;
                const length = currentFrame.data.length;
                for (let i = 0; i < length; i += 4) {
                    const rDiff = Math.abs(currentFrame.data[i] - lastFrameData.data[i]);
                    const gDiff = Math.abs(currentFrame.data[i+1] - lastFrameData.data[i+1]);
                    const bDiff = Math.abs(currentFrame.data[i+2] - lastFrameData.data[i+2]);
                    
                    if (rDiff + gDiff + bDiff > 80) {
                        diff++;
                    }
                }
                
                // If massive amount of frame difference (like a waving hand) is detected:
                if (diff > 500) { // Number of changed pixels
                    triggerWaveGesture();
                }
            }
            lastFrameData = currentFrame;
        }, 150);
    }
}

// Triggers the wave gesture animation and advances the step
function triggerWaveGesture() {
    UI.gestureLight.classList.add("detecting");
    UI.gestureStatus.textContent = "Hand Wave Detected!";
    
    // Throttle gesture triggers
    if (UI.gestureLight.classList.contains("throttled")) return;
    UI.gestureLight.classList.add("throttled");
    
    setTimeout(() => {
        UI.gestureLight.classList.remove("detecting");
        UI.gestureStatus.textContent = "Wave hand here to advance";
        UI.gestureLight.classList.remove("throttled");
    }, 1500);

    // Advance to next step
    navigateStep(1);
}

// 7. EVENT HANDLERS SETUP
function selectLab(labId) {
    State.activeLab = labId;
    
    // Find active notebook to apply theme
    const notebook = State.notebooks.find(n => n.id === labId) || { theme: "culinary" };
    
    // Update active class on switcher tabs
    document.querySelectorAll("#labSwitcher .lab-tab").forEach(tab => {
        if (tab.getAttribute("data-lab") === labId) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });
    
    if (notebook.theme === "drinks") {
        document.documentElement.classList.add("theme-drinks");
    } else {
        document.documentElement.classList.remove("theme-drinks");
    }
    
    // Set headers text variant placeholders based on active theme
    if (UI.creatorModalTitle) {
        if (notebook.theme === "drinks") {
            UI.creatorModalTitle.textContent = "Create Custom Drinks Formulation";
            UI.creatorModalDesc.textContent = "Register a new master drinks project and configure its technical parameters.";
        } else {
            UI.creatorModalTitle.textContent = "Create Custom Culinary Formulation";
            UI.creatorModalDesc.textContent = "Register a new master culinary project and configure its technical parameters.";
        }
    }
    
    // If workspace is active, go home
    UI.mainWorkspace.style.display = "none";
    if (UI.toolsScreen) UI.toolsScreen.style.display = "none";
    UI.goHomeBtn.style.display = "none";
    if (UI.screenNavigation) UI.screenNavigation.style.display = "none";
    UI.homeScreen.style.display = "block";
    
    // Rerender home screen
    renderRecipeLibrary(UI.recipeSearchInput.value);
}

function renderLabSwitcher() {
    if (!UI.labSwitcher) return;
    UI.labSwitcher.innerHTML = "";
    State.notebooks.forEach(notebook => {
        const btn = document.createElement("button");
        btn.className = `lab-tab ${State.activeLab === notebook.id ? "active" : ""}`;
        btn.textContent = notebook.name;
        btn.setAttribute("data-lab", notebook.id);
        btn.addEventListener("click", () => selectLab(notebook.id));
        UI.labSwitcher.appendChild(btn);
    });
}

function setupEventHandlers() {
    
    // Lab Tab Switchers (dynamic "+" click handler)
    if (UI.addNewLabTabBtn) {
        UI.addNewLabTabBtn.addEventListener("click", () => {
            UI.newNotebookName.value = "";
            UI.newNotebookTheme.value = "culinary";
            UI.notebookCreatorModal.classList.add("active");
        });
    }
    
    if (UI.closeNotebookCreatorBtn) {
        UI.closeNotebookCreatorBtn.addEventListener("click", () => {
            UI.notebookCreatorModal.classList.remove("active");
        });
    }
    
    if (UI.saveNewNotebookBtn) {
        UI.saveNewNotebookBtn.addEventListener("click", () => {
            const name = UI.newNotebookName.value.trim();
            const theme = UI.newNotebookTheme.value;
            if (!name) {
                alert("Please enter a notebook name.");
                return;
            }
            const id = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
            // Check for duplicate ID
            if (State.notebooks.some(n => n.id === id)) {
                alert("A notebook with this name already exists.");
                return;
            }
            State.notebooks.push({ id, name: name.toUpperCase(), theme });
            saveNotebooks();
            renderLabSwitcher();
            UI.notebookCreatorModal.classList.remove("active");
            selectLab(id);
            showToast(`Notebook "${name}" created!`);
        });
    }
    
    // Sync Button Click handlers
    if (UI.openSyncBtn) {
        UI.openSyncBtn.addEventListener("click", () => {
            openSyncModal();
        });
    }
    
    if (UI.closeSyncBtn) {
        UI.closeSyncBtn.addEventListener("click", () => {
            UI.syncModal.classList.remove("active");
        });
    }
    
    if (UI.closeSyncModalBtn) {
        UI.closeSyncModalBtn.addEventListener("click", () => {
            UI.syncModal.classList.remove("active");
        });
    }

    const saveGeminiApiKeyBtn = document.getElementById("saveGeminiApiKeyBtn");
    const geminiApiKeyInput = document.getElementById("geminiApiKeyInput");
    if (saveGeminiApiKeyBtn && geminiApiKeyInput) {
        saveGeminiApiKeyBtn.addEventListener("click", () => {
            const val = geminiApiKeyInput.value.trim();
            if (val) {
                localStorage.setItem("BATCH_GEMINI_API_KEY", val);
                showToast("Gemini API key saved to device storage!");
            } else {
                localStorage.removeItem("BATCH_GEMINI_API_KEY");
                geminiApiKeyInput.value = "";
                showToast("Gemini key cleared.");
            }
        });
    }
    
    if (UI.syncNowBtn) {
        UI.syncNowBtn.addEventListener("click", async () => {
            UI.syncNowBtn.disabled = true;
            const originalText = UI.syncNowBtn.innerHTML;
            UI.syncNowBtn.innerHTML = "Syncing...";
            try {
                await performManualSyncAutoDetect();
            } finally {
                UI.syncNowBtn.disabled = false;
                UI.syncNowBtn.innerHTML = originalText;
            }
        });
    }
    
    if (UI.forceUploadBtn) {
        UI.forceUploadBtn.addEventListener("click", async () => {
            if (confirm("Are you sure you want to force upload? This will overwrite all cloud data with your local database.")) {
                UI.forceUploadBtn.disabled = true;
                try {
                    await uploadToCloud();
                    await updateSyncModalDisplay();
                    showToast("Force upload completed successfully.");
                } catch(e) {
                    alert("Force upload failed: " + e.message);
                } finally {
                    UI.forceUploadBtn.disabled = false;
                }
            }
        });
    }
    
    if (UI.forceDownloadBtn) {
        UI.forceDownloadBtn.addEventListener("click", async () => {
            if (confirm("Are you sure you want to force download? This will overwrite all your local data with the cloud files.")) {
                UI.forceDownloadBtn.disabled = true;
                try {
                    await downloadFromCloud();
                    await updateSyncModalDisplay();
                    showToast("Force download completed successfully.");
                } catch(e) {
                    alert("Force download failed: " + e.message);
                } finally {
                    UI.forceDownloadBtn.disabled = false;
                }
            }
        });
    }
    
    // AI Autofill Button click handler
    if (UI.autofillAiBtn) {
        UI.autofillAiBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const name = UI.newRecipeName.value.trim();
            if (!name) {
                alert("Please enter a Master Project Name first.");
                UI.newRecipeName.focus();
                return;
            }
            
            UI.autofillAiBtn.classList.add("loading");
            UI.autofillAiBtnText.textContent = "Autofilling...";
            
            try {
                let data;
                try {
                    const response = await fetch('/api/autofill-recipe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, lab: State.activeLab })
                    });
                    if (response.ok) {
                        data = await response.json();
                    }
                } catch(netErr) {
                    console.warn("Server unreachable, falling back to direct Gemini...", netErr);
                }

                if (!data) {
                    data = await callStandaloneAutofill(name, State.activeLab);
                }

                populateCreatorFormWithAI(data);
                showToast("Form successfully populated by AI!");
            } catch(err) {
                console.error("AI Autofill failed:", err);
                alert("AI Autofill failed: " + err.message);
            } finally {
                UI.autofillAiBtn.classList.remove("loading");
                UI.autofillAiBtnText.textContent = "Autofill with AI";
            }
        });
    }

    // Theme Toggle
    UI.themeToggle.addEventListener("click", () => {
        const activeTheme = document.documentElement.getAttribute("data-theme");
        const nextTheme = activeTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", nextTheme);
        UI.themeToggle.setAttribute("aria-label", `Switch to ${activeTheme} mode`);
    });

    // Home button navigation
    UI.goHomeBtn.addEventListener("click", () => {
        UI.mainWorkspace.style.display = "none";
        if (UI.toolsScreen) UI.toolsScreen.style.display = "none";
        UI.goHomeBtn.style.display = "none";
        if (UI.screenNavigation) UI.screenNavigation.style.display = "none";
        UI.homeScreen.style.display = "block";
        renderRecipeLibrary(UI.recipeSearchInput.value);
    });

    // Recipe Search Input (Library Filter)
    UI.recipeSearchInput.addEventListener("input", (e) => {
        renderRecipeLibrary(e.target.value);
    });

    // Technical System Skill Level Radios (NEW FUNCTIONALITY)
    UI.skillRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            if (e.target.checked) {
                State.skillLevel = e.target.value;
                // Sync instructions dynamically
                syncCookingStep();
            }
        });
    });

    // Dynamic Tool Adaptation Prompt handlers
    UI.confirmAdaptBtn.addEventListener("click", adaptRecipeStepsToTools);
    UI.dismissAdaptBtn.addEventListener("click", () => {
        UI.toolAdaptationPrompt.style.display = "none";
    });

    // Scale Recipe Formulation Weights
    UI.scaleButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            UI.scaleButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            State.scaleMultiplier = parseFloat(btn.dataset.scale);
            renderIngredients();
        });
    });

    // Screen Nav Switchers
    UI.screenNavButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetScreen = btn.dataset.screen;
            switchScreen(targetScreen);
        });
    });

    // Variable Tweaker Form Changes
    UI.tweakCategory.addEventListener("change", (e) => {
        State.currentTweakCategory = e.target.value;
        UI.setupTweakCategory.textContent = State.currentTweakCategory;
        UI.setupTweakCategory.className = `tweak-badge badge-${State.currentTweakCategory.toLowerCase().replace(" ", "-")}`;
        
        // Update comparison labels
        updateTweakVariablesText();
    });

    UI.tweakDetails.addEventListener("input", (e) => {
        State.currentTweakText = e.target.value;
        UI.setupTweakTitle.textContent = `Variable Tweak: ${State.currentTweakText}`;
        UI.leftPaneTweakText.innerHTML = `<strong>Tweak Active:</strong> ${State.currentTweakText}`;
        
        updateTweakVariablesText();
    });

    // Reset setup form
    UI.resetVariablesBtn.addEventListener("click", () => {
        const project = RECIPE_DATABASE[State.activeProjectId];
        UI.tweakCategory.value = project.defaultTweakCategory;
        UI.tweakDetails.value = project.defaultTweakText;
        
        State.currentTweakCategory = project.defaultTweakCategory;
        State.currentTweakText = project.defaultTweakText;
        
        UI.setupTweakTitle.textContent = `Variable Tweak: ${State.currentTweakText}`;
        UI.setupTweakCategory.textContent = State.currentTweakCategory;
        UI.setupTweakCategory.className = `tweak-badge badge-${State.currentTweakCategory.toLowerCase().replace(" ", "-")}`;
        UI.leftPaneTweakText.innerHTML = `<strong>Tweak Active:</strong> ${State.currentTweakText}`;
        
        updateTweakVariablesText();
    });

    // Start Batch click -> advance to active lab
    UI.startBatchBtn.addEventListener("click", () => {
        switchScreen("screen-lab");
    });

    // Manual navigation buttons
    UI.prevStepBtn.addEventListener("click", () => navigateStep(-1));
    UI.nextStepBtn.addEventListener("click", () => navigateStep(1));
    UI.completeBatchBtn.addEventListener("click", () => switchScreen("screen-report"));

    // Macro Phase tabs inside Cooking mode
    UI.macroTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetPhase = tab.dataset.phase;
            const project = RECIPE_DATABASE[State.activeProjectId];
            
            // Find first step matching that phase
            const firstStepIdx = project.steps.findIndex(s => s.phase === targetPhase);
            if (firstStepIdx !== -1) {
                State.currentStepIndex = firstStepIdx;
                syncCookingStep();
            }
        });
    });

    // Active Timer actions
    UI.timerPlayPauseBtn.addEventListener("click", () => {
        if (State.timerState === "running") {
            pauseTimer();
        } else {
            startTimer();
        }
    });

    UI.timerResetBtn.addEventListener("click", resetTimer);

    // Hands-Free simulators
    UI.simulateWaveBtn.addEventListener("click", triggerWaveGesture);
    UI.voiceMicToggle.addEventListener("click", toggleVoiceListening);

    // Evaluation Sliders readouts
    const bindSliderReadout = (slider, readout, labelsMap) => {
        slider.addEventListener("input", (e) => {
            const val = e.target.value;
            readout.textContent = labelsMap[val];
        });
    };

    bindSliderReadout(UI.sliderTexture, UI.readoutTexture, {
        1: "Extremely Soft / Fluffy",
        2: "Slightly Soft",
        3: "Balanced Texture",
        4: "Dense / Rich",
        5: "Very Heavy / Dense"
    });

    bindSliderReadout(UI.sliderStructure, UI.readoutStructure, {
        1: "Completely Collapsed",
        2: "Slight Slump",
        3: "Perfect Balance",
        4: "Held Shape Perfectly",
        5: "Too Rigid / Rubbery"
    });

    bindSliderReadout(UI.sliderFlavor, UI.readoutFlavor, {
        1: "Cloyingly Sweet",
        2: "Leaning Sweet",
        3: "Optimal Sweet-Bitter Balance",
        4: "Richly Bitter",
        5: "Intensely Bitter / Harsh"
    });

    // Quick Matrix Tap buttons selector
    const bindMatrixButtons = (container) => {
        const buttons = container.querySelectorAll(".matrix-btn");
        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                buttons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });
    };

    bindMatrixButtons(UI.moistureMatrix);
    bindMatrixButtons(UI.structureMatrix);

    // Dictate Notes in evaluation
    setupDictationForNotes();

    // Lock and Save evaluation data
    UI.saveReportBtn.addEventListener("click", saveBatchAnalyticsReport);
    UI.exportReportBtn.addEventListener("click", exportBatchReportData);

    UI.modalCloseBtn.addEventListener("click", () => {
        UI.successModal.classList.remove("active");
        switchScreen("screen-setup");
    });
    
    // ==========================================
    // RECIPE CREATOR MODAL HANDLERS (NEW FUNCTIONALITY)
    // ==========================================
    UI.openCreatorBtn.addEventListener("click", () => {
        if (UI.creatorModalTitle && UI.creatorModalDesc) {
            if (State.activeLab === "drinks") {
                UI.creatorModalTitle.textContent = "Create Custom Beverage Formulation";
                UI.creatorModalDesc.textContent = "Register a new master drinks project and configure its technical parameters.";
            } else {
                UI.creatorModalTitle.textContent = "Create Custom Culinary Formulation";
                UI.creatorModalDesc.textContent = "Register a new master culinary project and configure its technical parameters.";
            }
        }
        
        // Refresh default rows so placeholders update correctly
        if (UI.creatorSuggestedToolsContainer) {
            UI.creatorSuggestedToolsContainer.style.display = "none";
            UI.creatorSuggestedToolsList.innerHTML = "";
            State.currentSuggestedTools = null;
        }
        // Reset to Guided view on step 1 by default
        switchCreatorMode("guided");
        setGuidedStep(1);
        
        // Reset inputs in both views
        if (UI.guidedRecipeName) UI.guidedRecipeName.value = "";
        if (UI.guidedTweakText) UI.guidedTweakText.value = "";
        UI.newRecipeName.value = "";
        UI.newRecipeTweakText.value = "";
        
        // Refresh default rows so placeholders update correctly
        if (UI.creatorSuggestedToolsContainer) {
            UI.creatorSuggestedToolsContainer.style.display = "none";
            UI.creatorSuggestedToolsList.innerHTML = "";
            State.currentSuggestedTools = null;
        }
        UI.ingredientInputRowsContainer.innerHTML = "";
        addIngredientInputRow("", "", State.activeLab === "drinks" ? "ml" : "g");
        
        UI.stepInputRowsContainer.innerHTML = "";
        addStepInputRow("", "mise-en-place", "", "", "", "", 0);
        
        if (UI.guidedIngredientRowsContainer) {
            UI.guidedIngredientRowsContainer.innerHTML = "";
            addGuidedIngredientRow("", "", State.activeLab === "drinks" ? "ml" : "g");
        }
        if (UI.guidedStepRowsContainer) {
            UI.guidedStepRowsContainer.innerHTML = "";
            addGuidedStepRow("", "mise-en-place", "", "", "", "", 0);
        }
        
        UI.recipeCreatorModal.classList.add("active");
    });
    
    UI.closeCreatorBtn.addEventListener("click", (e) => {
        e.preventDefault();
        UI.recipeCreatorModal.classList.remove("active");
    });
    
    UI.addNewIngRowBtn.addEventListener("click", () => {
        addIngredientInputRow("", "", "g");
    });
    
    UI.addNewStepRowBtn.addEventListener("click", () => {
        addStepInputRow("", "mise-en-place", "", "", "", "", 0);
    });
    
    UI.saveNewRecipeBtn.addEventListener("click", saveCreatedRecipe);

    // ==========================================
    // PLATING PHOTO HANDLERS (NEW FUNCTIONALITY)
    // ==========================================
    UI.platingPhotoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const base64Str = evt.target.result;
                State.evaluation.platingPhoto = base64Str;
                UI.platingPhotoImage.src = base64Str;
                UI.platingPhotoPreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    });

    UI.removePhotoBtn.addEventListener("click", () => {
        State.evaluation.platingPhoto = null;
        UI.platingPhotoImage.src = "";
        UI.platingPhotoPreview.style.display = "none";
        UI.platingPhotoInput.value = "";
    });

    // ==========================================
    // PANTRY MODAL HANDLERS (NEW FUNCTIONALITY)
    // ==========================================
    UI.openPantryBtn.addEventListener("click", () => {
        UI.pantryModal.classList.add("active");
    });
    
    UI.closePantryBtn.addEventListener("click", (e) => {
        e.preventDefault();
        UI.pantryModal.classList.remove("active");
    });
    
    UI.findPantryRecipesBtn.addEventListener("click", () => {
        analyzePantryIngredients(UI.pantryIngredientsInput.value);
    });

    // ==========================================
    // KITCHEN TOOLS HANDLERS (NEW FUNCTIONALITY)
    // ==========================================
    if (UI.openToolsBtn) {
        UI.openToolsBtn.addEventListener("click", () => {
            UI.mainWorkspace.style.display = "none";
            UI.homeScreen.style.display = "none";
            UI.toolsScreen.style.display = "block";
            UI.goHomeBtn.style.display = "flex";
            if (UI.screenNavigation) UI.screenNavigation.style.display = "none";
            renderToolsGrid();
        });
    }

    if (UI.addNewToolBtn) {
        UI.addNewToolBtn.addEventListener("click", () => {
            // Clear inputs
            UI.newToolName.value = "";
            UI.newToolDesc.value = "";
            UI.toolPhotoInput.value = "";
            UI.toolPhotoPreview.style.display = "none";
            UI.toolPhotoImage.src = "";
            State.toolPhotoBase64 = null;
            
            UI.toolCreatorModal.classList.add("active");
        });
    }

    if (UI.closeToolCreatorBtn) {
        UI.closeToolCreatorBtn.addEventListener("click", (e) => {
            e.preventDefault();
            UI.toolCreatorModal.classList.remove("active");
        });
    }

    if (UI.toolPhotoInput) {
        UI.toolPhotoInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const base64Str = evt.target.result;
                    State.toolPhotoBase64 = base64Str;
                    UI.toolPhotoImage.src = base64Str;
                    UI.toolPhotoPreview.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (UI.removeToolPhotoBtn) {
        UI.removeToolPhotoBtn.addEventListener("click", () => {
            State.toolPhotoBase64 = null;
            UI.toolPhotoImage.src = "";
            UI.toolPhotoPreview.style.display = "none";
            UI.toolPhotoInput.value = "";
        });
    }

    if (UI.saveNewToolBtn) {
        UI.saveNewToolBtn.addEventListener("click", (e) => {
            e.preventDefault();
            
            const name = UI.newToolName.value.trim();
            const desc = UI.newToolDesc.value.trim();
            
            if (!name || !desc) {
                alert("Please fill in the tool name and description.");
                return;
            }
            
            const newToolObj = {
                id: "tool-custom-" + Date.now(),
                name: name,
                description: desc,
                photo: State.toolPhotoBase64
            };
            
            State.toolsInventory.push(newToolObj);
            saveToolsInventory();
            renderToolsGrid();
            
            UI.toolCreatorModal.classList.remove("active");
        });
    }
}

// Add Ingredient Row in Recipe Creator Modal (NEW FUNCTIONALITY)
function addIngredientInputRow(name, weight, unit) {
    const row = document.createElement("div");
    row.className = "ing-input-row";
    
    const label1 = State.activeLab === "drinks" ? "Section 1 (Spirits / Base)" : "Section 1 (Cream / Flour)";
    const label2 = State.activeLab === "drinks" ? "Section 2 (Sweeteners / Modifiers)" : "Section 2 (Soak / Liquid)";
    const label3 = State.activeLab === "drinks" ? "Section 3 (Garnish / Dilution)" : "Section 3 (Assembly)";
    
    row.innerHTML = `
        <div class="form-group">
            <input type="text" class="styled-input ing-name-input" placeholder="Ingredient name (e.g., ${State.activeLab === 'drinks' ? 'Gin' : 'Mascarpone'})" value="${name}" required>
        </div>
        <div class="form-group">
            <input type="number" class="styled-input ing-weight-input" placeholder="Amount (e.g., ${State.activeLab === 'drinks' ? '90' : '500'})" value="${weight}" required>
        </div>
        <div class="form-group">
            <input type="text" class="styled-input ing-unit-input" placeholder="Unit (e.g., ${State.activeLab === 'drinks' ? 'ml' : 'g'})" value="${unit}">
        </div>
        <div class="form-group">
            <select class="styled-select-sm ing-sec-input">
                <option value="cream">${label1}</option>
                <option value="soak">${label2}</option>
                <option value="assembly">${label3}</option>
            </select>
        </div>
        <button type="button" class="remove-row-btn" title="Remove Ingredient">X</button>
    `;
    
    // Bind remove button
    row.querySelector(".remove-row-btn").addEventListener("click", () => {
        row.remove();
    });
    
    UI.ingredientInputRowsContainer.appendChild(row);
}

// Add Step Card in Recipe Creator Modal (NEW FUNCTIONALITY)
function addStepInputRow(label, phase, defaultText, beginnerText, proText, michelinText, timer) {
    const card = document.createElement("div");
    card.className = "step-input-card";
    
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    
    card.innerHTML = `
        <div class="step-card-header">
            <h5>Step Calibration Parameters</h5>
            <button type="button" class="remove-row-btn" title="Remove Step">Remove Step</button>
        </div>
        <div class="step-card-body">
            <div class="step-row-flex">
                <div class="form-group">
                    <label>Step Label</label>
                    <input type="text" class="styled-input step-label-input" placeholder="Step title (e.g., ${State.activeLab === 'drinks' ? 'Clarify Base' : 'Whisk Cream'})" value="${label}" required>
                </div>
                <div class="form-group">
                    <label>Cooking Phase</label>
                    <select class="styled-select-sm step-phase-input">
                        <option value="mise-en-place" ${phase === 'mise-en-place' ? 'selected' : ''}>Mise en Place</option>
                        <option value="execution" ${phase === 'execution' ? 'selected' : ''}>Execution</option>
                        <option value="assembly" ${phase === 'assembly' ? 'selected' : ''}>Assembly</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Timer (secs)</label>
                    <input type="number" class="styled-input step-timer-input" placeholder="Timer in seconds (e.g. 240)" value="${timer}">
                </div>
            </div>
            
            <div class="form-group" style="margin-top:6px;">
                <label>Step Tweak Reminder (Delta Highlight)</label>
                <input type="text" class="styled-input step-tweak-input" placeholder="What should be calibrated? (e.g., Reduced soak time to prevent collapsing)">
            </div>

            <div class="form-group" style="margin-top:6px;">
                <label>1. Laidback / Home-kitchen Explanation</label>
                <textarea class="styled-textarea step-beg-input" placeholder="Simple, straightforward instructions for standard home kitchens..." style="min-height:45px;"></textarea>
            </div>
            
            <div class="form-group" style="margin-top:6px;">
                <label>2. Elevated / Restaurant-kitchen Directions</label>
                <textarea class="styled-textarea step-pro-input" placeholder="Concise directions using culinary terms and professional techniques..." style="min-height:45px;"></textarea>
            </div>

            <div class="form-group" style="margin-top:6px;">
                <label>3. Precise / Kitchen-lab Details</label>
                <textarea class="styled-textarea step-mich-input" placeholder="Ultra-precise parameters (e.g., core temperatures, weights, vacuum pressure, molecular plating)..." style="min-height:45px;"></textarea>
            </div>
        </div>
    `;
    
    // Bind remove button
    card.querySelector(".remove-row-btn").addEventListener("click", () => {
        card.remove();
    });
    
    UI.stepInputRowsContainer.appendChild(card);
}

// Compile and Save new custom recipe (NEW FUNCTIONALITY)
function saveCreatedRecipe(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    // If in guided mode, sync into the detailed form first
    if (State.creatorMode === "guided") {
        syncGuidedToDetailed();
    }
    
    const name = UI.newRecipeName.value.trim();
    const baseline = UI.newRecipeBaseline.value.trim() || "Baseline Control v1.0";
    const batch = parseInt(UI.newRecipeBatchNum.value) || 1;
    const tweakCategory = UI.newRecipeTweakCat.value;
    const tweakDetails = UI.newRecipeTweakText.value.trim() || "Calibrating recipe setup variables.";
    
    if (!name) {
        UI.newRecipeName.focus();
        UI.newRecipeName.style.borderColor = "var(--tweak-color)";
        setTimeout(() => UI.newRecipeName.style.borderColor = "var(--rule-color)", 1500);
        return;
    }
    
    // 1. Compile Ingredients
    const ingredients = {
        cream: [],
        soak: [],
        assembly: []
    };
    
    let hasValidationError = false;
    const ingRows = UI.ingredientInputRowsContainer.querySelectorAll(".ing-input-row");
    ingRows.forEach(row => {
        const iName = row.querySelector(".ing-name-input").value.trim();
        const weightInputStr = row.querySelector(".ing-weight-input").value.trim();
        const iWeight = parseFloat(weightInputStr);
        const iUnit = row.querySelector(".ing-unit-input").value.trim() || "g";
        const iSec = row.querySelector(".ing-sec-input").value;
        
        if (iName) {
            if (isNaN(iWeight)) {
                hasValidationError = true;
                row.querySelector(".ing-weight-input").style.borderColor = "var(--tweak-color)";
            } else {
                row.querySelector(".ing-weight-input").style.borderColor = "var(--rule-color)";
                ingredients[iSec].push({
                    name: iName,
                    baseWeight: iWeight,
                    unit: iUnit
                });
            }
        }
    });

    if (hasValidationError) {
        alert("Please provide valid numerical weights for all named ingredients.");
        return;
    }
    
    // 2. Compile Steps
    const steps = [];
    const stepCards = UI.stepInputRowsContainer.querySelectorAll(".step-input-card");
    stepCards.forEach(card => {
        const sLabel = card.querySelector(".step-label-input").value.trim();
        const sPhase = card.querySelector(".step-phase-input").value;
        const sTimer = parseInt(card.querySelector(".step-timer-input").value) || 0;
        const sTweak = card.querySelector(".step-tweak-input").value.trim();
        
        const begText = card.querySelector(".step-beg-input").value.trim() || "Step instruction not populated.";
        const proText = card.querySelector(".step-pro-input").value.trim() || begText;
        const michText = card.querySelector(".step-mich-input").value.trim() || proText;
        
        if (sLabel) {
            steps.push({
                phase: sPhase,
                label: sLabel,
                timer: sTimer,
                tweakReminder: sTweak,
                textVariants: {
                    beginner: begText,
                    professional: proText,
                    michelin: michText
                }
            });
        }
    });
    
    if (steps.length === 0) {
        alert("Please add at least one instruction step to register the recipe.");
        return;
    }
    
    // Unique key generator
    const recipeKey = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    // 3. Create recipe object
    const newRecipeObject = {
        projectName: name,
        baselineName: baseline,
        activeBatch: batch,
        defaultTweakCategory: tweakCategory,
        defaultTweakText: tweakDetails,
        ingredients: ingredients,
        steps: steps,
        lab: State.activeLab,
        suggestedTools: State.currentSuggestedTools || null,
        ingredientSections: State.activeLab === "drinks" ? {
            cream: "Spirits & Liqueurs",
            soak: "Sweeteners & Modifiers",
            assembly: "Dilution & Garnish"
        } : {
            cream: "Cream & Flour",
            soak: "Soak & Liquids",
            assembly: "Assembly & Dusting"
        },
        // Simple default comparison tables
        comparison: {
            baseline: [
                { title: "Standard Formulation", desc: "Original baseline control ingredients and techniques." }
            ],
            test: [
                { title: "Batch Tweak", desc: tweakDetails, isTweak: true }
            ]
        }
    };
    
    // 4. Save into Database
    RECIPE_DATABASE[recipeKey] = newRecipeObject;
    
    // 5. Store in unified local storage
    saveUnifiedDatabase();
    
    // 6. Reload UI, select new recipe, close modal
    loadProjectState(recipeKey);
    UI.recipeCreatorModal.classList.remove("active");
    UI.homeScreen.style.display = "none";
    UI.mainWorkspace.style.display = "grid";
    UI.goHomeBtn.style.display = "flex";
    if (UI.screenNavigation) UI.screenNavigation.style.display = "flex";
    
    UI.screens.forEach(s => s.classList.remove("active"));
    UI.screenNavButtons.forEach(btn => btn.classList.remove("active"));
    document.getElementById("screen-setup").classList.add("active");
    document.querySelector("[data-screen='screen-setup']").classList.add("active");
    
    // Clear inputs in Creator Form
    UI.newRecipeName.value = "";
    UI.newRecipeTweakText.value = "";
    if (UI.guidedRecipeName) UI.guidedRecipeName.value = "";
    if (UI.guidedTweakText) UI.guidedTweakText.value = "";
    UI.ingredientInputRowsContainer.innerHTML = "";
    UI.stepInputRowsContainer.innerHTML = "";
    if (UI.guidedIngredientRowsContainer) UI.guidedIngredientRowsContainer.innerHTML = "";
    if (UI.guidedStepRowsContainer) UI.guidedStepRowsContainer.innerHTML = "";
    State.currentSuggestedTools = null;
    
    // Reinitialize creator default rows
    addIngredientInputRow("", "", State.activeLab === "drinks" ? "ml" : "g");
    addStepInputRow("", "mise-en-place", "", "", "", "", 0);
    if (UI.guidedIngredientRowsContainer) addGuidedIngredientRow("", "", State.activeLab === "drinks" ? "ml" : "g");
    if (UI.guidedStepRowsContainer) addGuidedStepRow("", "mise-en-place", "", "", "", "", 0);
    
    // Close modal
    UI.recipeCreatorModal.classList.remove("active");
    
    // Success confirmation
    alert(`Success: "${name}" has been registered in your BATCH Recipe Library!`);
}

// ==========================================
// PANTRY SUGGESTION ENGINE
// ==========================================
async function analyzePantryIngredients(text) {
    if (!text.trim()) {
        UI.pantryResultsContainer.style.display = "none";
        return;
    }

    UI.pantryResultsContainer.style.display = "block";
    UI.pantryRecipeList.innerHTML = `<p class='ink-muted'>Consulting ${State.activeLab === 'drinks' ? 'Master Mixologist' : 'Culinary God'} via Gemini... please wait...</p>`;

    try {
        let generatedRecipe;
        try {
            const response = await fetch('/api/generate-recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ingredients: text,
                    type: State.activeLab
                })
            });

            if (response.ok) {
                generatedRecipe = await response.json();
            }
        } catch (netErr) {
            console.warn("Backend not available, trying direct Gemini...", netErr);
        }

        if (!generatedRecipe) {
            generatedRecipe = await callStandaloneGenerateRecipe(text, State.activeLab);
        }
        
        // Render result card
        UI.pantryRecipeList.innerHTML = "";
        const card = document.createElement("div");
        card.className = "recipe-card";
        card.innerHTML = `
            <div class="card-title">${generatedRecipe.projectName}</div>
            <div class="card-meta">Gemini AI Match</div>
        `;
        card.addEventListener("click", () => {
            importPantryRecipe(generatedRecipe);
        });
        UI.pantryRecipeList.appendChild(card);

    } catch (error) {
        console.error("API Error:", error);
        UI.pantryRecipeList.innerHTML = `<p class='ink-muted' style="color:var(--tweak-color);">Error: ${error.message}. Make sure your local Node server is running and API key is saved!</p>`;
    }
}

function importPantryRecipe(recipeData) {
    const newKey = "gemini_" + Date.now();
    
    // Inject into main DB
    RECIPE_DATABASE[newKey] = recipeData;
    
    saveUnifiedDatabase();
    
    // Go to project
    loadProjectState(newKey);
    UI.homeScreen.style.display = "none";
    UI.mainWorkspace.style.display = "grid";
    UI.goHomeBtn.style.display = "flex";
    if (UI.screenNavigation) UI.screenNavigation.style.display = "flex";
    
    UI.screens.forEach(s => s.classList.remove("active"));
    UI.screenNavButtons.forEach(btn => btn.classList.remove("active"));
    document.getElementById("screen-setup").classList.add("active");
    document.querySelector("[data-screen='screen-setup']").classList.add("active");
    
    UI.pantryModal.classList.remove("active");
    UI.pantryIngredientsInput.value = "";
    UI.pantryResultsContainer.style.display = "none";
}

// Switch between panels / screens
function switchScreen(screenId) {
    UI.screens.forEach(screen => {
        if (screen.id === screenId) {
            screen.classList.add("active-screen");
        } else {
            screen.classList.remove("active-screen");
        }
    });

    UI.screenNavButtons.forEach(btn => {
        if (btn.dataset.screen === screenId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    State.currentScreen = screenId;
    
    // Stop voices if screen leaves cooking view
    if (screenId !== "screen-lab") {
        stopVoiceListening();
        pauseTimer();
    }
}

// Step navigation
function navigateStep(direction) {
    const project = RECIPE_DATABASE[State.activeProjectId];
    const targetIdx = State.currentStepIndex + direction;
    
    if (targetIdx >= 0 && targetIdx < project.steps.length) {
        State.currentStepIndex = targetIdx;
        syncCookingStep();
    }
}

// Sync the tweak details dynamically inside the recipe bodies
function updateTweakVariablesText() {
    const project = RECIPE_DATABASE[State.activeProjectId];
    
    // Find the delta/tweak element in test list and update
    if (project.comparison && project.comparison.test) {
        project.comparison.test.forEach(item => {
            if (item.isTweak) {
                item.desc = State.currentTweakText;
            }
        });
    }
    
    // Update ingredients object tweak texts
    for (let key in project.ingredients) {
        project.ingredients[key].forEach(ing => {
            if (ing.tweakHighlighted) {
                ing.testText = `${State.currentTweakText} (&Delta; Tweak)`;
            }
        });
    }

    renderComparisonTables();
    renderIngredients();
    
    // Sync lab step if showing a tweak
    const step = project.steps[State.currentStepIndex];
    if (step) {
        const comp = compileActiveStepText(step);
        if (step.tweakReminder) {
            UI.labTweakText.innerHTML = `<strong>Tweak Adjustment:</strong> ${State.currentTweakText}`;
        }
    }
    
    saveUnifiedDatabase();
}

// Voice dictate note in the verdict textarea
function setupDictationForNotes() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        UI.dictateVerdictBtn.style.display = "none";
        return;
    }

    const dictation = new SpeechRecognition();
    dictation.continuous = false;
    dictation.interimResults = false;
    dictation.lang = 'en-US';

    let dictating = false;

    UI.dictateVerdictBtn.addEventListener("click", () => {
        if (!dictating) {
            dictation.start();
        } else {
            dictation.stop();
        }
    });

    dictation.onstart = () => {
        dictating = true;
        UI.dictateVerdictBtn.classList.add("listening");
        UI.dictateBtnText.textContent = "Listening Dictation...";
    };

    dictation.onresult = (e) => {
        const text = e.results[0][0].transcript;
        const currentText = UI.verdictNotesInput.value;
        UI.verdictNotesInput.value = currentText ? `${currentText} ${text}` : text;
    };

    dictation.onend = () => {
        dictating = false;
        UI.dictateVerdictBtn.classList.remove("listening");
        UI.dictateBtnText.textContent = "Dictate Notes";
    };

    dictation.onerror = (e) => {
        console.error("Dictation error: ", e);
        dictating = false;
        UI.dictateVerdictBtn.classList.remove("listening");
        UI.dictateBtnText.textContent = "Dictate Notes";
    };
}

// Lock in sensory evaluation data and trigger modal
function saveBatchAnalyticsReport() {
    const nextAction = UI.nextActionInput.value.trim();
    if (!nextAction) {
        UI.nextActionInput.style.borderColor = "var(--tweak-color)";
        UI.nextActionInput.focus();
        // Trigger alert effect
        setTimeout(() => {
            UI.nextActionInput.style.borderColor = "var(--rule-color)";
        }, 1500);
        return;
    }

    // Save states
    const project = RECIPE_DATABASE[State.activeProjectId];
    State.evaluation.texture = UI.sliderTexture.value;
    State.evaluation.structure = UI.sliderStructure.value;
    State.evaluation.flavor = UI.sliderFlavor.value;
    State.evaluation.verdict = UI.verdictNotesInput.value;
    State.evaluation.nextAction = nextAction;
    
    // Moisture matrix active
    const activeMoistureBtn = UI.moistureMatrix.querySelector(".matrix-btn.active");
    State.evaluation.moisture = activeMoistureBtn ? activeMoistureBtn.dataset.val : "perfect";
    
    // Structure matrix active
    const activeStructureBtn = UI.structureMatrix.querySelector(".matrix-btn.active");
    State.evaluation.structuralIntegrity = activeStructureBtn ? activeStructureBtn.dataset.val : "held";

    // Setup next batch configuration trigger
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    
    modalTitle.textContent = `Batch #${project.activeBatch} Saved Successfully!`;
    modalBody.innerHTML = `
        <strong>Project:</strong> ${project.projectName}<br>
        <strong>Sensory Vectors Recorded:</strong><br>
        - Texture rating: ${State.evaluation.texture}/5 (${UI.readoutTexture.textContent})<br>
        - Structural integrity: ${UI.readoutStructure.textContent} (Matrix: ${State.evaluation.structuralIntegrity})<br>
        - Flavor balance: ${State.evaluation.flavor}/5 (${UI.readoutFlavor.textContent})<br><br>
        <strong>Calibration Locked for Batch #${project.activeBatch + 1}:</strong><br>
        "For Batch #${project.activeBatch + 1}, I should ${State.evaluation.nextAction}"
    `;

    // Save reports array
    if (!project.reports) project.reports = [];
    
    project.reports.push({
        batchNumber: project.activeBatch,
        tweakCategory: State.currentTweakCategory,
        deltaTweakDetails: State.currentTweakText,
        evaluation: { ...State.evaluation },
        timestamp: new Date().toISOString()
    });

    // Increment batch counter locally
    project.activeBatch++;
    
    saveUnifiedDatabase();

    UI.successModal.classList.add("active");
}

// Export data to console / JSON format for laboratory data export
function exportBatchReportData() {
    const project = RECIPE_DATABASE[State.activeProjectId];
    
    const exportData = {
        projectName: project.projectName,
        batchNumber: project.activeBatch,
        tweakCategory: State.currentTweakCategory,
        deltaTweakDetails: State.currentTweakText,
        sensoryEvaluation: {
            textureVector: State.evaluation.texture,
            structureVector: State.evaluation.structure,
            flavorVector: State.evaluation.flavor,
            moistureMatrix: State.evaluation.moisture,
            structuralIntegrityMatrix: State.evaluation.structuralIntegrity,
            notesVerdict: UI.verdictNotesInput.value,
            nextCalibrationAction: UI.nextActionInput.value,
            platingPhotoBase64: State.evaluation.platingPhoto
        },
        timestamp: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BATCH_${project.activeBatch}_LAB_REPORT.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// ==========================================
// DYNAMIC KITCHEN TOOL ENGINE & ADAPTATION
// ==========================================
async function fetchSuggestedTools(recipe) {
    UI.toolsChecklist.innerHTML = "<p class='ink-muted' style='font-size: 0.85rem; font-style: italic;'>Consulting Gemini for tools...</p>";
    UI.toolAdaptationPrompt.style.display = "none";
    
    let tools = [];
    if (recipe.suggestedTools && recipe.suggestedTools.length > 0) {
        tools = recipe.suggestedTools;
        renderDynamicTools(tools);
        return;
    }
    
    try {
        let fetchedTools;
        try {
            const response = await fetch('/api/suggest-tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipe })
            });
            
            if (response.ok) {
                fetchedTools = await response.json();
            }
        } catch (netErr) {
            console.warn("Backend unavailable, trying direct Gemini for tools...", netErr);
        }

        if (fetchedTools && Array.isArray(fetchedTools) && fetchedTools.length > 0) {
            tools = fetchedTools;
        } else {
            tools = await callStandaloneSuggestTools(recipe);
        }
    } catch (e) {
        console.warn("Direct tool suggestions failed. Falling back to local default list.", e);
        const name = (recipe.projectName || '').toLowerCase();
        if (name.includes("tiramisu")) {
            tools = ["Balloon Whisk", "Stand Mixer", "Double Boiler Setup", "iSi Whipping Siphon"];
        } else if (name.includes("pizza")) {
            tools = ["Stand Mixer", "Baking Stone / Steel", "Pizza Peel", "Balloon Whisk"];
        } else if (name.includes("croissant")) {
            tools = ["Stand Mixer", "Rolling Pin", "Pastry Brush", "Balloon Whisk"];
        } else {
            tools = ["Balloon Whisk", "Stand Mixer", "Double Boiler Setup", "iSi Whipping Siphon", "Sous-Vide Immersion Circulator", "Chamber Vacuum Sealer"];
        }
    }
    
    renderDynamicTools(tools);
}

function mapToolNameToId(name) {
    const norm = name.toLowerCase();
    if (norm.includes("whisk")) return "tool-whisk";
    if (norm.includes("mixer")) return "tool-mixer";
    if (norm.includes("double boiler") || norm.includes("bain-marie")) return "tool-doubleboiler";
    if (norm.includes("siphon")) return "tool-siphon";
    if (norm.includes("sous-vide") || norm.includes("circulator")) return "tool-sousvide";
    if (norm.includes("chamber vac") || norm.includes("vacuum sealer")) return "tool-chambervac";
    return `tool-custom-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
}

function renderDynamicTools(toolNames) {
    UI.toolsChecklist.innerHTML = "";
    State.activeTools.clear();
    
    toolNames.forEach((tool, index) => {
        const toolId = mapToolNameToId(tool);
        const isDefaultChecked = toolId === "tool-whisk" || toolId === "tool-doubleboiler" || index === 0;
        if (isDefaultChecked) {
            State.activeTools.add(toolId);
        }
        
        const label = document.createElement("label");
        label.className = "check-label";
        label.innerHTML = `
            <input type="checkbox" id="${toolId}" class="tool-checkbox" data-name="${tool}" ${isDefaultChecked ? 'checked' : ''}>
            <span class="custom-check-box"></span>
            <span class="check-text">${tool}</span>
        `;
        
        const checkbox = label.querySelector("input");
        checkbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                State.activeTools.add(toolId);
            } else {
                State.activeTools.delete(toolId);
            }
            
            syncCookingStep();
            renderIngredients();
            
            UI.toolAdaptationPrompt.style.display = "block";
            resetAdaptationPromptUI();
        });
        
        UI.toolsChecklist.appendChild(label);
    });
}

function resetAdaptationPromptUI() {
    UI.toolAdaptationPrompt.innerHTML = `
        <p style="margin-bottom: 8px;"><strong>Optimize Steps?</strong> Rebuild preparation instructions based on your selected tools?</p>
        <button id="confirmAdaptBtn" class="action-btn primary-btn btn-sm" style="padding: 4px 8px; font-size: 0.75rem;">Yes, Adapt Steps</button>
        <button id="dismissAdaptBtn" class="action-btn secondary-btn btn-sm" style="padding: 4px 8px; font-size: 0.75rem;">No</button>
    `;
    document.getElementById("confirmAdaptBtn").addEventListener("click", adaptRecipeStepsToTools);
    document.getElementById("dismissAdaptBtn").addEventListener("click", () => {
        UI.toolAdaptationPrompt.style.display = "none";
    });
}

async function adaptRecipeStepsToTools() {
    UI.toolAdaptationPrompt.innerHTML = "<p class='ink-muted' style='font-size: 0.85rem; font-style: italic;'>Rewriting steps via Gemini... please wait...</p>";
    
    const project = RECIPE_DATABASE[State.activeProjectId];
    const selectedToolsArray = [];
    
    // Grab selected tool display names
    UI.toolsChecklist.querySelectorAll(".tool-checkbox:checked").forEach(chk => {
        selectedToolsArray.push(chk.dataset.name);
    });
    
    try {
        let adaptedSteps;
        try {
            const response = await fetch('/api/adapt-steps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    steps: project.steps,
                    selectedTools: selectedToolsArray
                })
            });
            
            if (response.ok) {
                adaptedSteps = await response.json();
            }
        } catch (netErr) {
            console.warn("Backend unavailable, trying direct Gemini for step adaptation...", netErr);
        }

        if (!adaptedSteps) {
            adaptedSteps = await callStandaloneAdaptSteps(project.steps, selectedToolsArray);
        }
        
        project.steps = adaptedSteps;
        saveUnifiedDatabase();
        
        syncCookingStep();
        
        UI.toolAdaptationPrompt.style.display = "none";
        showToast("Success: Recipe steps updated to use your available tools!");
    } catch (e) {
        console.error("Step adaptation error:", e);
        UI.toolAdaptationPrompt.innerHTML = `
            <p style="margin-bottom: 8px; color: var(--tweak-color);"><strong>Adaptation Failed:</strong> ${e.message}</p>
            <button id="confirmAdaptBtn" class="action-btn primary-btn btn-sm" style="padding: 4px 8px; font-size: 0.75rem;">Try Again</button>
            <button id="dismissAdaptBtn" class="action-btn secondary-btn btn-sm" style="padding: 4px 8px; font-size: 0.75rem;">Close</button>
        `;
        document.getElementById("confirmAdaptBtn").addEventListener("click", adaptRecipeStepsToTools);
        document.getElementById("dismissAdaptBtn").addEventListener("click", () => {
            UI.toolAdaptationPrompt.style.display = "none";
        });
    }
}

// =========================================================================
// KITCHEN TOOLS INVENTORY STATE & RENDERING (NEW FUNCTIONALITY)
// =========================================================================

const DEFAULT_TOOLS = [
    {
        id: "tool-whisk",
        name: "Balloon Whisk",
        description: "A wire balloon whisk for manual whipping, emulsifying, and folding ingredients.",
        photo: null
    },
    {
        id: "tool-mixer",
        name: "Stand Mixer",
        description: "Planetary stand mixer with hook and paddle attachments for kneading and whipping.",
        photo: null
    },
    {
        id: "tool-doubleboiler",
        name: "Double Boiler Setup",
        description: "Bain-marie setup for gentle indirect heat, tempering chocolate, or whipping custards.",
        photo: null
    },
    {
        id: "tool-siphon",
        name: "iSi Whipping Siphon",
        description: "Pressurized nitrous oxide (N2O) gas charging siphon for rapid foams and infusions.",
        photo: null
    },
    {
        id: "tool-chambervac",
        name: "Chamber Vacuum Sealer",
        description: "Chamber sealer for fast marinating, compression, de-aerating, and uniform sheeting.",
        photo: null
    }
];

function loadToolsInventory() {
    const raw = localStorage.getItem("BATCH_TOOLS_INVENTORY_V1");
    if (raw) {
        try {
            State.toolsInventory = JSON.parse(raw);
        } catch (e) {
            console.error("Error parsing tools inventory:", e);
            State.toolsInventory = [...DEFAULT_TOOLS];
        }
    } else {
        State.toolsInventory = [...DEFAULT_TOOLS];
    }
}

function saveToolsInventory() {
    localStorage.setItem("BATCH_TOOLS_INVENTORY_V1", JSON.stringify(State.toolsInventory));
    updateLocalTimestamp();
}

function renderToolsGrid() {
    if (!UI.toolsGrid) return;
    
    UI.toolsGrid.innerHTML = "";
    
    State.toolsInventory.forEach(tool => {
        const card = document.createElement("div");
        card.className = "tool-card";
        
        let imgContent = "";
        if (tool.photo) {
            imgContent = `<img src="${tool.photo}" class="tool-card-img" alt="${tool.name}">`;
        } else {
            imgContent = `
                <svg class="tool-card-fallback-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
            `;
        }
        
        card.innerHTML = `
            <div class="tool-card-img-container">
                ${imgContent}
            </div>
            <div class="tool-card-info">
                <h3>${tool.name}</h3>
                <p>${tool.description}</p>
                <button class="remove-tool-btn" data-id="${tool.id}">Remove</button>
            </div>
        `;
        
        card.querySelector(".remove-tool-btn").addEventListener("click", () => {
            if (confirm(`Are you sure you want to remove "${tool.name}" from your kitchen inventory?`)) {
                State.toolsInventory = State.toolsInventory.filter(t => t.id !== tool.id);
                saveToolsInventory();
                renderToolsGrid();
            }
        });
        
        UI.toolsGrid.appendChild(card);
    });
}

// =========================================================================
// CLOUD PERSISTENCE SYNC ENGINE & AI AUTOFILL METHODS (NEW FUNCTIONALITY)
// =========================================================================

function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        background: rgba(15, 23, 42, 0.95);
        color: #fff;
        padding: 12px 24px;
        border-radius: 50px;
        font-size: 0.85rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.1);
        margin-top: 8px;
        pointer-events: auto;
        animation: toastSlideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    `;
    toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" style="margin-right: 4px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s ease forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

async function performStartupSync() {
    try {
        const response = await fetch('/api/sync');
        if (!response.ok) throw new Error("Sync status request failed.");
        const cloudData = await response.json();
        
        const localLastUpdated = parseInt(localStorage.getItem("BATCH_LAST_UPDATED")) || 0;
        const cloudLastUpdated = parseInt(cloudData.lastUpdated) || 0;
        
        console.log(`Sync status: Local updated = ${localLastUpdated}, Cloud updated = ${cloudLastUpdated}`);
        
        if (localLastUpdated === 0 && cloudLastUpdated === 0) {
            // First run, nothing to sync, push defaults to server
            await uploadToCloud();
        } else if (localLastUpdated > cloudLastUpdated) {
            // Local is newer, upload local changes to cloud
            console.log("Local changes are newer. Uploading to server.");
            await uploadToCloud();
            showToast("Local database synced to cloud.");
        } else if (cloudLastUpdated > localLastUpdated) {
            // Cloud is newer, download cloud changes to local
            console.log("Server changes are newer. Downloading to client.");
            await downloadFromCloudData(cloudData);
            showToast("Downloaded latest database from cloud.");
        } else {
            console.log("Local and server states are in sync.");
        }
    } catch (e) {
        console.warn("Startup synchronization check failed:", e);
    }
}

async function performManualSyncAutoDetect() {
    try {
        const response = await fetch('/api/sync');
        if (!response.ok) throw new Error("Could not check sync status");
        const cloudData = await response.json();
        
        const localTime = parseInt(localStorage.getItem("BATCH_LAST_UPDATED")) || 0;
        const cloudTime = parseInt(cloudData.lastUpdated) || 0;
        
        if (localTime > cloudTime) {
            await uploadToCloud();
            showToast("Local changes uploaded to cloud.");
        } else if (cloudTime > localTime) {
            await downloadFromCloudData(cloudData);
            showToast("Latest changes downloaded from cloud.");
        } else {
            showToast("Everything is already up to date.");
        }
        await updateSyncModalDisplay();
    } catch (e) {
        console.error(e);
        alert("Sync failed: " + e.message);
    }
}

async function uploadToCloud() {
    const localLastUpdated = parseInt(localStorage.getItem("BATCH_LAST_UPDATED")) || Date.now();
    
    const payload = {
        recipes: RECIPE_DATABASE,
        tools: State.toolsInventory,
        notebooks: State.notebooks,
        lastUpdated: localLastUpdated
    };
    
    const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error("Cloud upload request failed.");
    }
    
    const resData = await response.json();
    if (resData.lastUpdated) {
        localStorage.setItem("BATCH_LAST_UPDATED", resData.lastUpdated.toString());
    }
}

async function downloadFromCloud() {
    const response = await fetch('/api/sync');
    if (!response.ok) throw new Error("Cloud download request failed.");
    const cloudData = await response.json();
    await downloadFromCloudData(cloudData);
}

async function downloadFromCloudData(cloudData) {
    if (!cloudData) return;
    
    // Save to local storage
    if (cloudData.recipes) {
        localStorage.setItem("BATCH_RECIPE_DATABASE_V2", JSON.stringify(cloudData.recipes));
        // Clear memory database and reload
        for (let key in RECIPE_DATABASE) {
            delete RECIPE_DATABASE[key];
        }
        for (let key in cloudData.recipes) {
            RECIPE_DATABASE[key] = cloudData.recipes[key];
        }
    }
    
    if (cloudData.tools) {
        localStorage.setItem("BATCH_TOOLS_INVENTORY_V1", JSON.stringify(cloudData.tools));
        State.toolsInventory = cloudData.tools;
    }
    
    if (cloudData.notebooks) {
        localStorage.setItem("BATCH_NOTEBOOKS_V1", JSON.stringify(cloudData.notebooks));
        State.notebooks = cloudData.notebooks;
    }
    
    if (cloudData.lastUpdated) {
        localStorage.setItem("BATCH_LAST_UPDATED", cloudData.lastUpdated.toString());
    }
    
    // Refresh UI
    renderLabSwitcher();
    if (!State.notebooks.some(n => n.id === State.activeLab)) {
        State.activeLab = State.notebooks[0] ? State.notebooks[0].id : "culinary";
    }
    selectLab(State.activeLab);
    renderToolsGrid();
}

function openSyncModal() {
    if (!UI.syncModal) return;
    UI.syncModal.classList.add("active");
    const geminiApiKeyInput = document.getElementById("geminiApiKeyInput");
    if (geminiApiKeyInput) {
        geminiApiKeyInput.value = localStorage.getItem("BATCH_GEMINI_API_KEY") || "";
    }
    updateSyncModalDisplay();
}

async function updateSyncModalDisplay() {
    if (!UI.syncModal) return;
    
    const localTime = parseInt(localStorage.getItem("BATCH_LAST_UPDATED")) || 0;
    UI.syncLocalTime.textContent = localTime === 0 ? "Never" : new Date(localTime).toLocaleString();
    UI.syncCloudTime.textContent = "Checking...";
    UI.syncConnectionStatus.textContent = "Checking...";
    UI.syncConnectionStatus.className = "badge-status";
    UI.syncStatusSummary.textContent = "Checking...";
    
    try {
        const response = await fetch('/api/sync');
        if (!response.ok) throw new Error("Sync status query failed.");
        const cloudData = await response.json();
        
        const cloudTime = parseInt(cloudData.lastUpdated) || 0;
        UI.syncCloudTime.textContent = cloudTime === 0 ? "Never" : new Date(cloudTime).toLocaleString();
        
        UI.syncConnectionStatus.textContent = "Connected";
        UI.syncConnectionStatus.className = "badge-status online";
        
        if (localTime === 0 && cloudTime === 0) {
            UI.syncStatusSummary.textContent = "No data synchronized";
            UI.syncStatusSummary.style.color = "var(--tweak-color)";
        } else if (Math.abs(localTime - cloudTime) < 2000) {
            UI.syncStatusSummary.textContent = "Up to date";
            UI.syncStatusSummary.style.color = "var(--rent-badge)";
        } else if (localTime > cloudTime) {
            UI.syncStatusSummary.textContent = "Local changes pending upload";
            UI.syncStatusSummary.style.color = "var(--brand-accent)";
        } else {
            UI.syncStatusSummary.textContent = "Cloud updates pending download";
            UI.syncStatusSummary.style.color = "var(--tweak-color)";
        }
    } catch(err) {
        UI.syncConnectionStatus.textContent = "Offline";
        UI.syncConnectionStatus.className = "badge-status offline";
        UI.syncCloudTime.textContent = "Unavailable";
        UI.syncStatusSummary.textContent = "Unable to reach server";
        UI.syncStatusSummary.style.color = "var(--tweak-color)";
    }
}

function populateCreatorFormWithAI(data) {
    if (!data) return;
    
    if (UI.newRecipeBaseline) UI.newRecipeBaseline.value = data.baselineName || "Baseline Control v1.0";
    if (UI.newRecipeTweakCat) UI.newRecipeTweakCat.value = data.defaultTweakCategory || "Ingredients";
    if (UI.newRecipeTweakText) UI.newRecipeTweakText.value = data.defaultTweakText || "";
    
    UI.ingredientInputRowsContainer.innerHTML = "";
    const sections = ["cream", "soak", "assembly"];
    sections.forEach(section => {
        if (data.ingredients && data.ingredients[section]) {
            data.ingredients[section].forEach(ing => {
                addIngredientInputRow(ing.name, ing.baseWeight, ing.unit, section);
            });
        }
    });
    if (UI.ingredientInputRowsContainer.children.length === 0) {
        addIngredientInputRow("", "", State.activeLab === "drinks" ? "ml" : "g");
    }
    
    UI.stepInputRowsContainer.innerHTML = "";
    if (data.steps && data.steps.length > 0) {
        data.steps.forEach(step => {
            const beg = step.textVariants ? (step.textVariants.beginner || "") : "";
            const pro = step.textVariants ? (step.textVariants.professional || "") : "";
            const mich = step.textVariants ? (step.textVariants.michelin || "") : "";
            addStepInputRow(
                step.label || "", 
                step.phase || "mise-en-place", 
                step.tweakReminder || "", 
                beg, 
                pro, 
                mich, 
                step.timer || 0
            );
        });
    } else {
        addStepInputRow("", "mise-en-place", "", "", "", "", 0);
    }
    
    if (UI.creatorSuggestedToolsContainer && UI.creatorSuggestedToolsList) {
        UI.creatorSuggestedToolsList.innerHTML = "";
        if (data.suggestedTools && data.suggestedTools.length > 0) {
            State.currentSuggestedTools = data.suggestedTools;
            data.suggestedTools.forEach(toolName => {
                const badge = document.createElement("span");
                badge.className = "creator-tool-badge";
                badge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"/></svg> ${toolName}`;
                UI.creatorSuggestedToolsList.appendChild(badge);
            });
            UI.creatorSuggestedToolsContainer.style.display = "block";
        } else {
            State.currentSuggestedTools = null;
            UI.creatorSuggestedToolsContainer.style.display = "none";
        }
    }
    
    // Sync into Guided Form automatically
    if (UI.guidedRecipeName && UI.newRecipeName) UI.guidedRecipeName.value = UI.newRecipeName.value;
    syncDetailedToGuided();
}

// ==========================================
// GUIDED RECIPE CREATOR ENGINE (SIMPLIFIED FLOW)
// ==========================================

function initGuidedCreator() {
    // Mode toggles
    if (UI.viewToggleGuided) {
        UI.viewToggleGuided.addEventListener("click", () => switchCreatorMode("guided"));
    }
    if (UI.viewToggleDetailed) {
        UI.viewToggleDetailed.addEventListener("click", () => switchCreatorMode("detailed"));
    }
    if (UI.guidedSwitchToDetailedBtn) {
        UI.guidedSwitchToDetailedBtn.addEventListener("click", () => switchCreatorMode("detailed"));
    }
    if (UI.detailedReturnToGuidedBtn) {
        UI.detailedReturnToGuidedBtn.addEventListener("click", () => switchCreatorMode("guided"));
    }

    // Stepper milestone navigation
    document.querySelectorAll(".stepper-step").forEach(el => {
        el.addEventListener("click", () => {
            const targetStep = parseInt(el.dataset.step);
            if (targetStep) setGuidedStep(targetStep);
        });
    });

    // Guided footer controls
    if (UI.guidedNextBtn) {
        UI.guidedNextBtn.addEventListener("click", () => setGuidedStep(State.creatorStep + 1));
    }
    if (UI.guidedBackBtn) {
        UI.guidedBackBtn.addEventListener("click", () => setGuidedStep(State.creatorStep - 1));
    }
    if (UI.guidedCancelBtn) {
        UI.guidedCancelBtn.addEventListener("click", (e) => {
            e.preventDefault();
            UI.recipeCreatorModal.classList.remove("active");
        });
    }
    if (UI.guidedRegisterBtn) {
        UI.guidedRegisterBtn.addEventListener("click", saveCreatedRecipe);
    }

    // Ingredients Quick Paste & Add
    if (UI.guidedAddIngBtn) {
        UI.guidedAddIngBtn.addEventListener("click", () => {
            addGuidedIngredientRow("", "", State.activeLab === "drinks" ? "ml" : "g");
        });
    }
    if (UI.guidedQuickPasteToggle) {
        UI.guidedQuickPasteToggle.addEventListener("click", () => {
            if (UI.guidedQuickPasteArea) {
                const isShown = UI.guidedQuickPasteArea.style.display === "block";
                UI.guidedQuickPasteArea.style.display = isShown ? "none" : "block";
                if (!isShown && UI.guidedQuickPasteInput) {
                    UI.guidedQuickPasteInput.focus();
                }
            }
        });
    }
    if (UI.guidedCancelQuickPasteBtn) {
        UI.guidedCancelQuickPasteBtn.addEventListener("click", () => {
            if (UI.guidedQuickPasteArea) UI.guidedQuickPasteArea.style.display = "none";
        });
    }
    if (UI.guidedApplyQuickPasteBtn) {
        UI.guidedApplyQuickPasteBtn.addEventListener("click", () => {
            const rawText = UI.guidedQuickPasteInput?.value || "";
            parseQuickPasteIngredients(rawText);
        });
    }

    // Guided Add Step
    if (UI.guidedAddStepBtn) {
        UI.guidedAddStepBtn.addEventListener("click", () => {
            addGuidedStepRow("", "execution", "", "", "", "", 0);
        });
    }

    // Guided Autofill with AI
    if (UI.guidedAutofillAiBtn) {
        UI.guidedAutofillAiBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const name = UI.guidedRecipeName?.value.trim();
            if (!name) {
                alert("Please enter a Formulation / Recipe Name first.");
                UI.guidedRecipeName?.focus();
                return;
            }

            UI.guidedAutofillAiBtn.classList.add("loading");
            if (UI.guidedAutofillAiBtnText) UI.guidedAutofillAiBtnText.textContent = "Autofilling...";

            try {
                const response = await fetch('/api/autofill-recipe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, lab: State.activeLab })
                });

                if (!response.ok) {
                    throw new Error("API request failed with status: " + response.status);
                }

                const data = await response.json();
                UI.newRecipeName.value = name;
                populateCreatorFormWithAI(data);
                showToast("Formulation generated with AI!");
            } catch(err) {
                console.error("Guided AI Autofill failed:", err);
                alert("AI Autofill failed. Make sure server is running and GEMINI_API_KEY is set in .env.");
            } finally {
                UI.guidedAutofillAiBtn.classList.remove("loading");
                if (UI.guidedAutofillAiBtnText) UI.guidedAutofillAiBtnText.textContent = "Autofill with AI";
            }
        });
    }
}

function switchCreatorMode(mode) {
    if (mode === "detailed") {
        syncGuidedToDetailed();
        if (UI.creatorGuidedView) UI.creatorGuidedView.style.display = "none";
        if (UI.creatorDetailedView) UI.creatorDetailedView.style.display = "flex";
        if (UI.viewToggleGuided) UI.viewToggleGuided.classList.remove("active");
        if (UI.viewToggleDetailed) UI.viewToggleDetailed.classList.add("active");
        State.creatorMode = "detailed";
    } else {
        syncDetailedToGuided();
        if (UI.creatorGuidedView) UI.creatorGuidedView.style.display = "flex";
        if (UI.creatorDetailedView) UI.creatorDetailedView.style.display = "none";
        if (UI.viewToggleGuided) UI.viewToggleGuided.classList.add("active");
        if (UI.viewToggleDetailed) UI.viewToggleDetailed.classList.remove("active");
        State.creatorMode = "guided";
        setGuidedStep(State.creatorStep || 1);
    }
}

function setGuidedStep(stepNum) {
    if (stepNum < 1) stepNum = 1;
    if (stepNum > 4) stepNum = 4;

    // Validate when advancing forward
    if (stepNum > State.creatorStep) {
        if (State.creatorStep === 1) {
            const name = UI.guidedRecipeName?.value.trim();
            if (!name) {
                UI.guidedRecipeName?.focus();
                showToast("Please enter a formulation name first");
                return;
            }
        } else if (State.creatorStep === 2) {
            let hasAtLeastOne = false;
            if (UI.guidedIngredientRowsContainer) {
                UI.guidedIngredientRowsContainer.querySelectorAll(".guided-ing-row").forEach(row => {
                    const n = row.querySelector(".guided-ing-name")?.value.trim();
                    if (n) hasAtLeastOne = true;
                });
            }
            if (!hasAtLeastOne) {
                showToast("Please add at least one ingredient to continue");
                return;
            }
        } else if (State.creatorStep === 3) {
            let hasAtLeastOne = false;
            if (UI.guidedStepRowsContainer) {
                UI.guidedStepRowsContainer.querySelectorAll(".guided-step-item").forEach(card => {
                    const l = card.querySelector(".guided-step-label")?.value.trim();
                    const t = card.querySelector(".guided-step-text")?.value.trim();
                    if (l || t) hasAtLeastOne = true;
                });
            }
            if (!hasAtLeastOne) {
                showToast("Please define at least one preparation step");
                return;
            }
        }
    }

    State.creatorStep = stepNum;

    // Update stepper milestones
    document.querySelectorAll(".stepper-step").forEach(el => {
        const num = parseInt(el.dataset.step);
        el.classList.remove("active", "completed");
        if (num < stepNum) {
            el.classList.add("completed");
        } else if (num === stepNum) {
            el.classList.add("active");
        }
    });

    // Update visible step pane
    document.querySelectorAll(".guided-step-pane").forEach(pane => pane.classList.remove("active"));
    const activePane = document.getElementById(`guidedStepPane${stepNum}`);
    if (activePane) activePane.classList.add("active");

    // Update footer buttons
    if (UI.guidedBackBtn) {
        UI.guidedBackBtn.style.display = stepNum === 1 ? "none" : "inline-flex";
    }
    if (UI.guidedNextBtn) {
        if (stepNum === 1) {
            UI.guidedNextBtn.style.display = "inline-flex";
            UI.guidedNextBtn.textContent = "Next: Ingredients →";
        } else if (stepNum === 2) {
            UI.guidedNextBtn.style.display = "inline-flex";
            UI.guidedNextBtn.textContent = "Next: Method & Steps →";
        } else if (stepNum === 3) {
            UI.guidedNextBtn.style.display = "inline-flex";
            UI.guidedNextBtn.textContent = "Next: Review Formulation →";
        } else if (stepNum === 4) {
            UI.guidedNextBtn.style.display = "none";
        }
    }
    if (UI.guidedRegisterBtn) {
        UI.guidedRegisterBtn.style.display = stepNum === 4 ? "inline-flex" : "none";
    }

    if (stepNum === 4) {
        renderGuidedReview();
    }
}

function addGuidedIngredientRow(name = "", weight = "", unit = "", section = "cream") {
    if (!UI.guidedIngredientRowsContainer) return;
    const row = document.createElement("div");
    row.className = "guided-ing-row";
    
    const label1 = State.activeLab === "drinks" ? "Section 1 (Spirits / Base)" : "Section 1 (Cream / Flour)";
    const label2 = State.activeLab === "drinks" ? "Section 2 (Sweeteners / Modifiers)" : "Section 2 (Soak / Liquid)";
    const label3 = State.activeLab === "drinks" ? "Section 3 (Garnish / Dilution)" : "Section 3 (Assembly)";
    
    const defaultUnit = unit || (State.activeLab === "drinks" ? "ml" : "g");

    row.innerHTML = `
        <div style="flex: 2;">
            <input type="text" class="styled-input guided-ing-name" placeholder="e.g. ${State.activeLab === 'drinks' ? 'London Dry Gin' : 'Bread Flour'}" value="${name}">
        </div>
        <div style="flex: 1;">
            <input type="number" class="styled-input guided-ing-weight" placeholder="e.g. ${State.activeLab === 'drinks' ? '45' : '500'}" value="${weight}">
        </div>
        <div style="flex: 0.8;">
            <input type="text" class="styled-input guided-ing-unit" placeholder="g" value="${defaultUnit}">
        </div>
        <div style="flex: 1.5;">
            <select class="styled-select-sm guided-ing-sec" style="width: 100%;">
                <option value="cream" ${section === 'cream' ? 'selected' : ''}>${label1}</option>
                <option value="soak" ${section === 'soak' ? 'selected' : ''}>${label2}</option>
                <option value="assembly" ${section === 'assembly' ? 'selected' : ''}>${label3}</option>
            </select>
        </div>
        <button type="button" class="remove-row-btn guided-remove-ing-btn" title="Remove Ingredient" style="width: 30px;">&times;</button>
    `;

    row.querySelector(".guided-remove-ing-btn").addEventListener("click", () => {
        row.remove();
        if (UI.guidedIngredientRowsContainer.children.length === 0) {
            addGuidedIngredientRow("", "", State.activeLab === "drinks" ? "ml" : "g");
        }
    });

    UI.guidedIngredientRowsContainer.appendChild(row);
}

function addGuidedStepRow(label = "", phase = "mise-en-place", defaultText = "", beginnerText = "", proText = "", michelinText = "", timer = 0) {
    if (!UI.guidedStepRowsContainer) return;
    const card = document.createElement("div");
    card.className = "guided-step-item";
    
    const stepCount = UI.guidedStepRowsContainer.children.length + 1;
    const primaryText = defaultText || beginnerText || proText || "";

    card.innerHTML = `
        <div class="guided-step-item-header">
            <span class="guided-step-item-num">Step <span class="step-idx">${stepCount}</span></span>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="guided-step-advanced-toggle">⚙️ Advanced Calibrations</button>
                <button type="button" class="remove-row-btn guided-remove-step-btn" title="Remove Step">&times; Remove</button>
            </div>
        </div>
        
        <div class="step-row-flex" style="display: grid; grid-template-columns: 1.5fr 1fr 90px; gap: 8px;">
            <div class="form-group">
                <label style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--ink-subtle);">Step Label</label>
                <input type="text" class="styled-input guided-step-label" placeholder="e.g. Autolyse, Whip Sabayon, Emulsify..." value="${label}">
            </div>
            <div class="form-group">
                <label style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--ink-subtle);">Phase</label>
                <select class="styled-select-sm guided-step-phase" style="width: 100%;">
                    <option value="mise-en-place" ${phase === 'mise-en-place' ? 'selected' : ''}>Mise en Place</option>
                    <option value="execution" ${phase === 'execution' ? 'selected' : ''}>Execution</option>
                    <option value="assembly" ${phase === 'assembly' ? 'selected' : ''}>Assembly</option>
                </select>
            </div>
            <div class="form-group">
                <label style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--ink-subtle);">Timer (sec)</label>
                <input type="number" class="styled-input guided-step-timer" placeholder="0" value="${timer}">
            </div>
        </div>

        <div class="form-group" style="margin-top: 4px;">
            <label style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--ink-subtle);">Directions & Method</label>
            <textarea class="styled-textarea guided-step-text" placeholder="Describe step instructions clearly..." style="min-height: 52px;">${primaryText}</textarea>
        </div>

        <!-- Collapsible Advanced Drawer for 3 Tiers -->
        <div class="guided-step-advanced-drawer">
            <div class="form-group">
                <label style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--ink-subtle);">Tweak Reminder (Delta Highlight)</label>
                <input type="text" class="styled-input guided-step-tweak" placeholder="e.g. Active Delta Tweak reminder..." value="${defaultText && defaultText !== primaryText ? defaultText : ''}">
            </div>
            <div class="form-group">
                <label style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--ink-subtle);">Restaurant Chef Variant</label>
                <textarea class="styled-textarea guided-step-pro" placeholder="Professional high-speed instructions (optional)..." style="min-height: 40px;">${proText}</textarea>
            </div>
            <div class="form-group">
                <label style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--ink-subtle);">Michelin Lab Variant</label>
                <textarea class="styled-textarea guided-step-mich" placeholder="Precise temperatures, vacuum, molecular parameters (optional)..." style="min-height: 40px;">${michelinText}</textarea>
            </div>
        </div>
    `;

    // Advanced toggle
    const toggleBtn = card.querySelector(".guided-step-advanced-toggle");
    const drawer = card.querySelector(".guided-step-advanced-drawer");
    toggleBtn.addEventListener("click", () => {
        const isHidden = drawer.style.display === "none" || !drawer.style.display;
        drawer.style.display = isHidden ? "flex" : "none";
        toggleBtn.textContent = isHidden ? "▲ Hide Calibrations" : "⚙️ Advanced Calibrations";
    });

    // Remove
    card.querySelector(".guided-remove-step-btn").addEventListener("click", () => {
        card.remove();
        if (UI.guidedStepRowsContainer) {
            Array.from(UI.guidedStepRowsContainer.children).forEach((c, idx) => {
                const idxEl = c.querySelector(".step-idx");
                if (idxEl) idxEl.textContent = idx + 1;
            });
            if (UI.guidedStepRowsContainer.children.length === 0) {
                addGuidedStepRow("", "mise-en-place", "", "", "", "", 0);
            }
        }
    });

    UI.guidedStepRowsContainer.appendChild(card);
}

function parseQuickPasteIngredients(text) {
    if (!text || !text.trim()) return;
    const lines = text.split(/[\n,;]+/);
    let count = 0;
    
    // Clear initial empty row if only 1 empty row exists
    if (UI.guidedIngredientRowsContainer && UI.guidedIngredientRowsContainer.children.length === 1) {
        const firstRow = UI.guidedIngredientRowsContainer.children[0];
        const firstName = firstRow.querySelector(".guided-ing-name")?.value.trim();
        if (!firstName) {
            UI.guidedIngredientRowsContainer.innerHTML = "";
        }
    }

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Match patterns like "500g Flour", "350 ml Cold Water", "2 eggs", "10.5 g Salt"
        const match = trimmed.match(/^([\d\.\/]+)\s*([a-zA-Z%]+)?\s+(?:of\s+)?(.*)$/);
        if (match) {
            let amount = parseFloat(match[1]) || "";
            let unit = match[2] || (State.activeLab === "drinks" ? "ml" : "g");
            let name = match[3] || "";
            addGuidedIngredientRow(name, amount, unit, "cream");
            count++;
        } else {
            addGuidedIngredientRow(trimmed, "", State.activeLab === "drinks" ? "ml" : "g", "cream");
            count++;
        }
    });

    if (count > 0) {
        showToast(`Parsed ${count} ingredients into table!`);
        if (UI.guidedQuickPasteArea) UI.guidedQuickPasteArea.style.display = "none";
        if (UI.guidedQuickPasteInput) UI.guidedQuickPasteInput.value = "";
    }
}

function renderGuidedReview() {
    if (!UI.guidedReviewCard) return;
    
    const name = UI.guidedRecipeName?.value.trim() || "Untitled Formulation";
    const baseline = UI.guidedRecipeBaseline?.value.trim() || "Baseline Control v1.0";
    const tweakCat = UI.guidedTweakCategory?.value || "Ingredients";
    const tweakText = UI.guidedTweakText?.value.trim() || "Calibrating baseline variables.";

    // Collect ingredients
    const ings = [];
    if (UI.guidedIngredientRowsContainer) {
        UI.guidedIngredientRowsContainer.querySelectorAll(".guided-ing-row").forEach(row => {
            const iName = row.querySelector(".guided-ing-name")?.value.trim();
            const iWeight = row.querySelector(".guided-ing-weight")?.value.trim();
            const iUnit = row.querySelector(".guided-ing-unit")?.value.trim() || "g";
            if (iName) {
                ings.push(`${iName} (${iWeight || '0'}${iUnit})`);
            }
        });
    }

    // Collect steps & calculate total time
    const steps = [];
    let totalSecs = 0;
    if (UI.guidedStepRowsContainer) {
        UI.guidedStepRowsContainer.querySelectorAll(".guided-step-item").forEach(item => {
            const sLabel = item.querySelector(".guided-step-label")?.value.trim() || "Instruction Step";
            const sTimer = parseInt(item.querySelector(".guided-step-timer")?.value) || 0;
            totalSecs += sTimer;
            steps.push(`${sLabel} ${sTimer > 0 ? `(${Math.round(sTimer / 60)} min)` : ''}`);
        });
    }

    const totalMinutes = Math.round(totalSecs / 60);

    UI.guidedReviewCard.innerHTML = `
        <div class="review-headline">
            <h4>${name}</h4>
            <span class="review-baseline">Reference: ${baseline} &bull; Initial Batch #1</span>
        </div>

        <div class="review-pill-grid">
            <div class="review-pill">
                <label>Active Delta Tweak</label>
                <span style="color: var(--accent);">${tweakText}</span>
            </div>
            <div class="review-pill">
                <label>Category & Scope</label>
                <span>${tweakCat} &bull; ${State.activeLab === 'drinks' ? 'Beverage Lab' : 'Culinary Food Lab'}</span>
            </div>
        </div>

        <div class="review-lists-split">
            <div class="review-list-box">
                <h5>${ings.length} Formulated Ingredients</h5>
                <ul>
                    ${ings.length > 0 ? ings.map(i => `<li>&bull; ${i}</li>`).join('') : '<li style="color:var(--ink-muted); font-style:italic;">No ingredients added</li>'}
                </ul>
            </div>
            <div class="review-list-box">
                <h5>${steps.length} Preparation Steps ${totalMinutes > 0 ? `(~${totalMinutes} mins)` : ''}</h5>
                <ul>
                    ${steps.length > 0 ? steps.map((s, idx) => `<li>${idx + 1}. ${s}</li>`).join('') : '<li style="color:var(--ink-muted); font-style:italic;">No steps added</li>'}
                </ul>
            </div>
        </div>

        <div style="background: var(--bg-page); border: 1px dashed var(--rule-color); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.75rem; color: var(--ink-muted); display: flex; justify-content: space-between; align-items: center;">
            <span>💡 <em>Need to inspect raw baseline matrices or multi-tier chef text?</em></span>
            <button type="button" class="action-btn btn-sm secondary-btn" id="reviewSwitchToDetailedBtn">Switch to Detailed Sheet</button>
        </div>
    `;

    const reviewSwitchBtn = document.getElementById("reviewSwitchToDetailedBtn");
    if (reviewSwitchBtn) {
        reviewSwitchBtn.addEventListener("click", () => switchCreatorMode("detailed"));
    }
}

function syncGuidedToDetailed() {
    if (UI.guidedRecipeName && UI.newRecipeName) UI.newRecipeName.value = UI.guidedRecipeName.value;
    if (UI.guidedRecipeBaseline && UI.newRecipeBaseline) UI.newRecipeBaseline.value = UI.guidedRecipeBaseline.value;
    if (UI.guidedTweakCategory && UI.newRecipeTweakCat) UI.newRecipeTweakCat.value = UI.guidedTweakCategory.value;
    if (UI.guidedTweakText && UI.newRecipeTweakText) UI.newRecipeTweakText.value = UI.guidedTweakText.value;

    // Sync ingredients
    if (UI.guidedIngredientRowsContainer && UI.ingredientInputRowsContainer) {
        UI.ingredientInputRowsContainer.innerHTML = "";
        const rows = UI.guidedIngredientRowsContainer.querySelectorAll(".guided-ing-row");
        rows.forEach(row => {
            const name = row.querySelector(".guided-ing-name")?.value || "";
            const weight = row.querySelector(".guided-ing-weight")?.value || "";
            const unit = row.querySelector(".guided-ing-unit")?.value || "g";
            const sec = row.querySelector(".guided-ing-sec")?.value || "cream";
            addIngredientInputRow(name, weight, unit, sec);
        });
        if (UI.ingredientInputRowsContainer.children.length === 0) {
            addIngredientInputRow("", "", State.activeLab === "drinks" ? "ml" : "g");
        }
    }

    // Sync steps
    if (UI.guidedStepRowsContainer && UI.stepInputRowsContainer) {
        UI.stepInputRowsContainer.innerHTML = "";
        const cards = UI.guidedStepRowsContainer.querySelectorAll(".guided-step-item");
        cards.forEach(card => {
            const label = card.querySelector(".guided-step-label")?.value || "";
            const phase = card.querySelector(".guided-step-phase")?.value || "mise-en-place";
            const timer = parseInt(card.querySelector(".guided-step-timer")?.value) || 0;
            const mainText = card.querySelector(".guided-step-text")?.value || "";
            const tweak = card.querySelector(".guided-step-tweak")?.value || "";
            const proText = card.querySelector(".guided-step-pro")?.value || mainText;
            const michText = card.querySelector(".guided-step-mich")?.value || proText;
            addStepInputRow(label, phase, tweak, mainText, proText, michText, timer);
        });
        if (UI.stepInputRowsContainer.children.length === 0) {
            addStepInputRow("", "mise-en-place", "", "", "", "", 0);
        }
    }
}

function syncDetailedToGuided() {
    if (UI.guidedRecipeName && UI.newRecipeName) UI.guidedRecipeName.value = UI.newRecipeName.value;
    if (UI.guidedRecipeBaseline && UI.newRecipeBaseline) UI.guidedRecipeBaseline.value = UI.newRecipeBaseline.value;
    if (UI.guidedTweakCategory && UI.newRecipeTweakCat) UI.guidedTweakCategory.value = UI.newRecipeTweakCat.value;
    if (UI.guidedTweakText && UI.newRecipeTweakText) UI.guidedTweakText.value = UI.newRecipeTweakText.value;

    // Sync ingredients
    if (UI.guidedIngredientRowsContainer && UI.ingredientInputRowsContainer) {
        UI.guidedIngredientRowsContainer.innerHTML = "";
        const rows = UI.ingredientInputRowsContainer.querySelectorAll(".ing-input-row");
        rows.forEach(row => {
            const name = row.querySelector(".ing-name-input")?.value || "";
            const weight = row.querySelector(".ing-weight-input")?.value || "";
            const unit = row.querySelector(".ing-unit-input")?.value || "g";
            const sec = row.querySelector(".ing-sec-input")?.value || "cream";
            addGuidedIngredientRow(name, weight, unit, sec);
        });
        if (UI.guidedIngredientRowsContainer.children.length === 0) {
            addGuidedIngredientRow("", "", State.activeLab === "drinks" ? "ml" : "g");
        }
    }

    // Sync steps
    if (UI.guidedStepRowsContainer && UI.stepInputRowsContainer) {
        UI.guidedStepRowsContainer.innerHTML = "";
        const cards = UI.stepInputRowsContainer.querySelectorAll(".step-input-card");
        cards.forEach(card => {
            const label = card.querySelector(".step-label-input")?.value || "";
            const phase = card.querySelector(".step-phase-input")?.value || "mise-en-place";
            const timer = parseInt(card.querySelector(".step-timer-input")?.value) || 0;
            const tweak = card.querySelector(".step-tweak-input")?.value || "";
            const begText = card.querySelector(".step-beg-input")?.value || "";
            const proText = card.querySelector(".step-pro-input")?.value || "";
            const michText = card.querySelector(".step-mich-input")?.value || "";
            addGuidedStepRow(label, phase, tweak, begText, proText, michText, timer);
        });
        if (UI.guidedStepRowsContainer.children.length === 0) {
            addGuidedStepRow("", "mise-en-place", "", "", "", "", 0);
        }
    }
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", init);
