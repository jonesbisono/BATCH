/* ==========================================================================
   BATCH APPLICATION LOGIC & STATE ENGINE
   ========================================================================== */

// 1. DYNAMIC RECIPE DATABASE (With Adaptive Technical Instructions)
let RECIPE_DATABASE = {
    tiramisu: {
        projectName: "The Ultimate From-Scratch Tiramisu",
        baselineName: "Baseline Control Recipe v1.0",
        activeBatch: 5,
        defaultTweakCategory: "Ingredients",
        defaultTweakText: "Swapping standard ladyfingers for homemade almond flour Savoiardi.",
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
    }
};

// 2. STATE MANAGER (Now tracking Skill Levels and Tools checklist)
const State = {
    activeProjectId: "tiramisu",
    scaleMultiplier: 1.0,
    currentTweakCategory: "Ingredients",
    currentTweakText: "",
    currentScreen: "screen-setup",
    
    // NEW Technical Engine parameters
    skillLevel: "beginner", // beginner, professional, michelin
    activeTools: new Set(["tool-whisk", "tool-doubleboiler"]), // Default tools
    
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
    }
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
    screens: document.querySelectorAll(".workspace-screen"),
    
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
    saveNewRecipeBtn: document.getElementById("saveNewRecipeBtn")
};

// 4. CORE APP FUNCTIONS

// Initialize Application
function init() {
    loadUnifiedDatabase();
    setupEventHandlers();
    
    // Show home screen
    UI.homeScreen.style.display = "block";
    UI.mainWorkspace.style.display = "none";
    UI.goHomeBtn.style.display = "none";
    renderRecipeLibrary();
    setupVoiceRecognition();
    setupWebcamGestureMock();
    renderIngredients();
    renderComparisonTables();
    
    // Initialize Recipe Creator rows
    addIngredientInputRow("", "", "g");
    addStepInputRow("", "mise-en-place", "", "", "", "", 0);
}

// Load Unified Database from localStorage
function loadUnifiedDatabase() {
    try {
        const saved = localStorage.getItem("BATCH_RECIPE_DATABASE_V2");
        if (saved) {
            const customDb = JSON.parse(saved);
            for (let key in customDb) {
                RECIPE_DATABASE[key] = customDb[key];
            }
        }
    } catch(e) {
        console.error("Failed loading unified database", e);
    }
    // Library will be rendered when home screen is shown
}

function saveUnifiedDatabase() {
    try {
        localStorage.setItem("BATCH_RECIPE_DATABASE_V2", JSON.stringify(RECIPE_DATABASE));
    } catch(e) {
        console.error("Local storage save failed:", e);
    }
}

// Render Recipe Library Home Screen
function renderRecipeLibrary(filter = "") {
    UI.recipeGrid.innerHTML = "";
    
    for (let key in RECIPE_DATABASE) {
        const project = RECIPE_DATABASE[key];
        
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
function setupEventHandlers() {
    
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
        UI.goHomeBtn.style.display = "none";
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
}

// Add Ingredient Row in Recipe Creator Modal (NEW FUNCTIONALITY)
function addIngredientInputRow(name, weight, unit) {
    const row = document.createElement("div");
    row.className = "ing-input-row";
    
    row.innerHTML = `
        <div class="form-group">
            <input type="text" class="styled-input ing-name-input" placeholder="e.g. Mascarpone" value="${name}" required>
        </div>
        <div class="form-group">
            <input type="number" class="styled-input ing-weight-input" placeholder="500" value="${weight}" required>
        </div>
        <div class="form-group">
            <input type="text" class="styled-input ing-unit-input" placeholder="g" value="${unit}">
        </div>
        <div class="form-group">
            <select class="styled-select-sm ing-sec-input">
                <option value="cream">Section 1 (Cream/Flour)</option>
                <option value="soak">Section 2 (Soak/Liquid)</option>
                <option value="assembly">Section 3 (Assembly)</option>
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
                    <input type="text" class="styled-input step-label-input" placeholder="e.g. Whisk Zabaglione" value="${label}" required>
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
                    <input type="number" class="styled-input step-timer-input" placeholder="e.g. 240" value="${timer}">
                </div>
            </div>
            
            <div class="form-group" style="margin-top:6px;">
                <label>Step Tweak Reminder (Delta Highlight)</label>
                <input type="text" class="styled-input step-tweak-input" placeholder="Leave blank if no dynamic tweak highlight is needed.">
            </div>

            <div class="form-group" style="margin-top:6px;">
                <label>1. Beginner Explanation (Complete Dumb)</label>
                <textarea class="styled-textarea step-beg-input" placeholder="Detailed step-by-step description for beginners..." style="min-height:45px;"></textarea>
            </div>
            
            <div class="form-group" style="margin-top:6px;">
                <label>2. Professional description</label>
                <textarea class="styled-textarea step-pro-input" placeholder="Standard terminology and instructions for professional chefs..." style="min-height:45px;"></textarea>
            </div>

            <div class="form-group" style="margin-top:6px;">
                <label>3. Michelin Star details</label>
                <textarea class="styled-textarea step-mich-input" placeholder="Ultra-precision details, molecular parameters, and plating instructions..." style="min-height:45px;"></textarea>
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
    e.preventDefault();
    
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
    
    UI.screens.forEach(s => s.classList.remove("active"));
    UI.screenNavButtons.forEach(btn => btn.classList.remove("active"));
    document.getElementById("screen-setup").classList.add("active");
    document.querySelector("[data-screen='screen-setup']").classList.add("active");
    
    // Clear inputs in Creator Form
    UI.newRecipeName.value = "";
    UI.newRecipeTweakText.value = "";
    UI.ingredientInputRowsContainer.innerHTML = "";
    UI.stepInputRowsContainer.innerHTML = "";
    
    // Reinitialize creator default rows
    addIngredientInputRow("", "", "g");
    addStepInputRow("", "mise-en-place", "", "", "", "", 0);
    
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
    UI.pantryRecipeList.innerHTML = "<p class='ink-muted'>Consulting Culinary God via Gemini... please wait...</p>";

    try {
        const response = await fetch('/api/generate-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: text })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to connect to backend API");
        }

        const generatedRecipe = await response.json();
        
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
    try {
        const response = await fetch('/api/suggest-tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipe })
        });
        
        if (response.ok) {
            tools = await response.json();
        } else {
            throw new Error("Failed to suggest tools");
        }
    } catch (e) {
        console.warn("Backend tool suggestions failed. Falling back to local default list.", e);
        const name = recipe.projectName.toLowerCase();
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
        const response = await fetch('/api/adapt-steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steps: project.steps,
                selectedTools: selectedToolsArray
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to adapt steps");
        }
        
        const adaptedSteps = await response.json();
        project.steps = adaptedSteps;
        saveUnifiedDatabase();
        
        syncCookingStep();
        
        UI.toolAdaptationPrompt.style.display = "none";
        alert("Success: Recipe steps updated to use your available tools!");
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

// Initialize on page load
window.addEventListener("DOMContentLoaded", init);
