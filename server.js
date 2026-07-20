const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');
const ngrok = require('@ngrok/ngrok');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('./')); // Serve static frontend files

const RECIPES_FILE = path.join(__dirname, 'data', 'recipes.json');
const TOOLS_FILE = path.join(__dirname, 'data', 'tools.json');
const NOTEBOOKS_FILE = path.join(__dirname, 'data', 'notebooks.json');
const SYNC_FILE = path.join(__dirname, 'data', 'sync.json');

function initializeDataFiles() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(RECIPES_FILE)) {
        fs.writeFileSync(RECIPES_FILE, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(TOOLS_FILE)) {
        fs.writeFileSync(TOOLS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(NOTEBOOKS_FILE)) {
        const defaultNotebooks = [
            { id: "culinary", name: "CULINARY LAB", theme: "culinary" },
            { id: "drinks", name: "DRINKS LAB", theme: "drinks" }
        ];
        fs.writeFileSync(NOTEBOOKS_FILE, JSON.stringify(defaultNotebooks, null, 2));
    }
    if (!fs.existsSync(SYNC_FILE)) {
        fs.writeFileSync(SYNC_FILE, JSON.stringify({ lastUpdated: Date.now() }, null, 2));
    }
}

// Call on startup
initializeDataFiles();

const SYSTEM_PROMPT = `
You are the greatest culinary historian and most technically, culturally and ethnically diverse chef, master of the culinary arts in all aspects, and forms, with knowledge of techniques from all over the world and cultures throughout history classic, modern and contemporary. That knowledge made you very precise to the gram and flexible enough to develop alternatives when ingredients are scarce. You guide some of your ideas based on the book from Nathan Myhrvold: Modernist Cuisine, Modernist Bread and Modernist pizza. And other references would be:

* The French Laundry Cookbook, Thomas Keller
* On food and Cooking, Harold McGee
* The Science of Spice, Dr. Stuart Farrimond
* The Flavor Bible, Karen Page and Andrew Dornenburg
* The Family Meal: Home cooking with Ferran Adrià
* El Bulli: 1998-2002
* Modern Gastronomy: A to Z - 1st Edition - Ferran Adria
* The Aviary Cocktail Book, Grant Achatz 
* Alinea, Grant Achatz

With this you will be basically a cooking god.

When given a list of pantry ingredients, you must generate a BATCH application compatible JSON recipe object. 
The output MUST be pure JSON with NO markdown formatting, NO backticks, and NO additional text. 

The JSON schema must exactly follow this structure:
{
    "projectName": "Name of the Recipe",
    "baselineName": "Name of the baseline control version",
    "activeBatch": 1,
    "defaultTweakCategory": "Ingredient",
    "defaultTweakText": "Testing ingredient replacements based on pantry availability.",
    "keywords": ["list", "of", "ingredients", "used"],
    "ingredients": {
        "cream": [
            { "name": "Ingredient Name", "baseWeight": 100, "unit": "g" }
        ],
        "soak": [
            { "name": "Ingredient Name", "baseWeight": 100, "unit": "g" }
        ],
        "assembly": [
            { "name": "Ingredient Name", "baseWeight": 100, "unit": "g" }
        ]
    },
    "steps": [
        {
            "phase": "mise-en-place",
            "label": "Preparation Step",
            "tweakReminder": "",
            "timer": 300,
            "textVariants": {
                "beginner": "Simple instruction for beginner.",
                "professional": "Instruction for professional.",
                "michelin": "Precise instruction for Michelin chef."
            }
        }
    ],
    "comparison": {
        "baseline": [
            { "title": "Standard Baseline", "desc": "Standard control ingredients." }
        ],
        "test": [
            { "title": "Pantry Batch", "desc": "Pantry adaptation.", "isTweak": true }
        ]
    }
}
Important rules for JSON:
- Weights MUST be numbers, not strings.
- Units should be 'g' or 'ml' where possible.
- The 'phase' in steps must be one of: 'mise-en-place', 'execution', 'assembly'.
- Group ingredients logically into 'cream' (often fats/solids/dough), 'soak' (liquids/marinades/fillings), and 'assembly' (garnishes/final additions).
`;

app.post('/api/generate-recipe', async (req, res) => {
    try {
        const { ingredients, type } = req.body;
        
        if (!ingredients) {
            return res.status(400).json({ error: 'Ingredients are required.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not set in the .env file. Please add it and restart the server.' });
        }

        // Initialize client lazily per-request so server starts even without a key
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        let systemPrompt = SYSTEM_PROMPT;
        let userInstruction = `Please create a recipe using these ingredients: ${ingredients}`;
        
        if (type === 'drinks') {
            systemPrompt = `
You are the greatest mixologist, bar director, and liquid chemist in the world, with deep knowledge of molecular gastronomy, cocktail history, coffee and tea chemistry, and modern bar techniques (drawing from Harold McGee's "On Food and Cooking", Dave Arnold's "Liquid Intelligence", and Grant Achatz's "The Aviary Cocktail Book").

When given a list of pantry/bar ingredients, you must generate a BATCH drinks lab compatible JSON drinks/beverage formulation object.
The output MUST be pure JSON with NO markdown formatting, NO backticks, and NO additional text.

The JSON schema must exactly follow this structure:
{
    "projectName": "Name of the Drink / Beverage",
    "baselineName": "Name of the baseline control version",
    "activeBatch": 1,
    "defaultTweakCategory": "Technique",
    "defaultTweakText": "Testing clarification or carbonation or temperature controls.",
    "keywords": ["list", "of", "ingredients", "used"],
    "lab": "drinks",
    "ingredientSections": {
        "cream": "Spirits & Liqueurs (or Base)",
        "soak": "Sweeteners & Modifiers (or Acids)",
        "assembly": "Dilution & Garnish (or Finish)"
    },
    "ingredients": {
        "cream": [
            { "name": "Ingredient Name", "baseWeight": 45, "unit": "g" }
        ],
        "soak": [
            { "name": "Ingredient Name", "baseWeight": 20, "unit": "g" }
        ],
        "assembly": [
            { "name": "Ingredient Name", "baseWeight": 30, "unit": "g" }
        ]
    },
    "steps": [
        {
            "phase": "mise-en-place",
            "label": "Preparation Step",
            "tweakReminder": "",
            "timer": 120,
            "textVariants": {
                "beginner": "Simple instruction for beginner.",
                "professional": "Instruction for professional.",
                "michelin": "Precise instruction for Michelin-level bartender."
            }
        }
    ],
    "comparison": {
        "baseline": [
            { "title": "Standard Baseline", "desc": "Standard control ingredients." }
        ],
        "test": [
            { "title": "Pantry Batch", "desc": "Pantry adaptation.", "isTweak": true }
        ]
    }
}
Important rules for JSON:
- Weights MUST be numbers, not strings.
- Units should be 'g', 'ml', or 'drop' where possible.
- The 'phase' in steps must be one of: 'mise-en-place', 'execution', 'assembly'.
- Group ingredients logically into 'cream' (spirits, primary liquors, main brew bases), 'soak' (syrups, modifiers, sweeteners, acid adjusters), and 'assembly' (dilution water, ice, garnishes, custom oils, final toppings).
- Ensure the "lab": "drinks" property is explicitly included!
`;
            userInstruction = `Please create a beverage or drink formulation using these ingredients: ${ingredients}`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userInstruction,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json"
            }
        });

        let recipeJsonStr = response.text.trim();
        recipeJsonStr = recipeJsonStr.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const recipeData = JSON.parse(recipeJsonStr);
        
        // Inject or enforce correct properties
        recipeData.lab = type === 'drinks' ? 'drinks' : 'culinary';
        if (!recipeData.ingredientSections) {
            recipeData.ingredientSections = type === 'drinks' ? {
                cream: "Spirits & Liqueurs",
                soak: "Sweeteners & Modifiers",
                assembly: "Dilution & Garnish"
            } : {
                cream: "Cream & Flour",
                soak: "Soak & Liquids",
                assembly: "Assembly & Dusting"
            };
        }
        
        res.json(recipeData);

    } catch (error) {
        console.error('Error generating recipe:', error);
        res.status(500).json({ error: 'Failed to generate recipe.', details: error.message });
    }
});

app.post('/api/suggest-tools', async (req, res) => {
    try {
        const { recipe } = req.body;
        if (!recipe) {
            return res.status(400).json({ error: 'Recipe details are required.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not set.' });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
        Analyze this recipe: "${recipe.projectName}".
        Ingredients: ${JSON.stringify(recipe.ingredients)}.
        Steps: ${JSON.stringify(recipe.steps.map(s => s.label))}.

        Suggest 4-6 kitchen tools that are either essential or can be used to optimize/modernize this recipe. Include standard tools (like a Whisk, Stand Mixer, Double Boiler) and advanced tools if relevant (like an iSi Whipping Siphon, Sous-Vide Circulator, Chamber Vacuum Sealer, Blowtorch, Chinois).
        
        Output MUST be a pure JSON array of strings (the tool names). Example: ["Stand Mixer", "Balloon Whisk", "iSi Whipping Siphon"].
        No markdown, no backticks, no comments.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        let text = response.text.trim();
        console.log("Raw suggested tools response:", JSON.stringify(text));
        text = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        res.json(JSON.parse(text));
    } catch (error) {
        console.error('Error suggesting tools:', error);
        res.status(500).json({ error: 'Failed to suggest tools.', details: error.message });
    }
});

app.post('/api/adapt-steps', async (req, res) => {
    try {
        const { steps, selectedTools } = req.body;
        if (!steps || !selectedTools) {
            return res.status(400).json({ error: 'Steps and selectedTools are required.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not set.' });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const systemInstruction = `
        You are a Michelin-starred Chef and a master of Culinary Arts. 
        You will be given a list of recipe steps and a list of kitchen tools that are currently available to the cook.
        
        Your task is to modify the recipe's steps (specifically the 'timer' and the 'textVariants': 'beginner', 'professional', and 'michelin') to leverage the available tools.
        
        Available Tools: ${JSON.stringify(selectedTools)}.
        
        For example:
        - If "Stand Mixer" is available, update whipping/kneading steps to use the stand mixer instead of hand mixing, and reduce the timer accordingly.
        - If "iSi Whipping Siphon" is available, update aerating/foaming steps (like whipped cream or sabayon) to use the siphon, and adapt Michelin instructions to charge it with N2O.
        - If "Sous-Vide" is available, update slow cooking/tempering steps (like cooking eggs or custards) to use water bath temperatures.
        - If a step does not benefit from any of the available tools, leave its text and timer exactly as they are.

        Output MUST be a pure JSON array matching this exact step structure for each step:
        [
            {
                "phase": "mise-en-place" / "execution" / "assembly",
                "label": "Step Label",
                "tweakReminder": "Reminder text if any",
                "timer": 300,
                "textVariants": {
                    "beginner": "Beginner instructions...",
                    "professional": "Professional instructions...",
                    "michelin": "Michelin instructions..."
                }
            }
        ]
        
        No markdown, no backticks, no comments.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Modify these steps: ${JSON.stringify(steps)}`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json"
            }
        });

        let text = response.text.trim();
        text = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        res.json(JSON.parse(text));
    } catch (error) {
        console.error('Error adapting steps:', error);
        res.status(500).json({ error: 'Failed to adapt steps.', details: error.message });
    }
});

app.get('/api/sync', (req, res) => {
    try {
        initializeDataFiles();
        const recipes = JSON.parse(fs.readFileSync(RECIPES_FILE, 'utf8'));
        const tools = JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8'));
        const notebooks = JSON.parse(fs.readFileSync(NOTEBOOKS_FILE, 'utf8'));
        const syncInfo = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf8'));
        
        res.json({
            lastUpdated: syncInfo.lastUpdated || 0,
            recipes,
            tools,
            notebooks
        });
    } catch (err) {
        console.error('Error in GET /api/sync:', err);
        res.status(500).json({ error: 'Failed to retrieve cloud sync data.', details: err.message });
    }
});

app.post('/api/sync', (req, res) => {
    try {
        initializeDataFiles();
        const { recipes, tools, notebooks, lastUpdated } = req.body;
        
        if (!recipes || !tools || !notebooks) {
            return res.status(400).json({ error: 'Recipes, tools, and notebooks are required for sync.' });
        }
        
        const timestamp = lastUpdated || Date.now();
        
        fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
        fs.writeFileSync(TOOLS_FILE, JSON.stringify(tools, null, 2));
        fs.writeFileSync(NOTEBOOKS_FILE, JSON.stringify(notebooks, null, 2));
        fs.writeFileSync(SYNC_FILE, JSON.stringify({ lastUpdated: timestamp }, null, 2));
        
        res.json({ success: true, lastUpdated: timestamp });
    } catch (err) {
        console.error('Error in POST /api/sync:', err);
        res.status(500).json({ error: 'Failed to save cloud sync data.', details: err.message });
    }
});

app.post('/api/autofill-recipe', async (req, res) => {
    try {
        const { name, lab } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Recipe name is required.' });
        }
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not set.' });
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const systemPrompt = `
        You are a Michelin-starred chef and master mixologist.
        The user wants to formulate a recipe named: "${name}" for the lab type: "${lab}".
        
        Generate a complete recipe formulation in the BATCH application compatible JSON schema.
        
        Rules for ingredients:
        - If lab is 'drinks' (or custom mixology), group into:
          - 'cream' (Spirits, liqueurs, main brew bases)
          - 'soak' (Sweeteners, syrups, modifiers, acid adjusters)
          - 'assembly' (Dilution water, ice, garnishes, custom oils, final toppings)
        - If lab is 'culinary' (or anything else), group into:
          - 'cream' (Fats, solids, flour, dairy, dough bases)
          - 'soak' (Liquids, marinades, syrups, soaking agents)
          - 'assembly' (Garnishes, toppings, dustings, final touches)
        
        Rules for steps:
        - Group into phases: 'mise-en-place', 'execution', 'assembly'.
        - Provide 'timer' in seconds (number, e.g. 300 for 5 minutes). Use 0 if a timer is not needed.
        - Provide 'tweakReminder' (e.g. "Focus on hydration level" or "Whip to ribbon stage").
        - Provide three 'textVariants':
          - 'beginner': simple instructions using basic tools.
          - 'professional': elevated kitchen terminology and techniques.
          - 'michelin': ultra-precise parameters, temperatures, and molecular terminology.
        
        Provide a 'suggestedTools' array containing 3-6 tool names required or recommended (e.g., ["Stand Mixer", "Whipping Siphon", "Balloon Whisk"]).
        
        Output MUST be a pure JSON object matching this structure:
        {
            "baselineName": "Baseline Control v1.0",
            "defaultTweakCategory": "Ingredients" | "Technique" | "Time-Temp",
            "defaultTweakText": "Testing default parameters and hydration.",
            "ingredients": {
                "cream": [ { "name": "...", "baseWeight": 100, "unit": "g" } ],
                "soak": [ ... ],
                "assembly": [ ... ]
            },
            "steps": [
                {
                    "phase": "mise-en-place" | "execution" | "assembly",
                    "label": "Step Title",
                    "tweakReminder": "...",
                    "timer": 300,
                    "textVariants": {
                        "beginner": "...",
                        "professional": "...",
                        "michelin": "..."
                    }
                }
            ],
            "suggestedTools": ["Tool A", "Tool B"]
        }
        
        Do not output any markdown formatting, backticks, or extra text. Pure JSON only.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate recipe for: "${name}"`,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json"
            }
        });
        
        let text = response.text.trim();
        text = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        res.json(JSON.parse(text));
    } catch (error) {
        console.error('Error autofilling recipe:', error);
        res.status(500).json({ error: 'Failed to autofill recipe.', details: error.message });
    }
});

app.listen(port, () => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('WARNING: GEMINI_API_KEY is not set in .env — Pantry AI will not work until you add it.');
    }
    console.log(`BATCH Culinary Lab server running at http://localhost:${port}`);
    
    // Establish ngrok tunnel
    ngrok.forward({ addr: port, authtoken_from_env: true })
        .then(listener => {
            console.log(`ngrok tunnel established at: ${listener.url()}`);
        })
        .catch(err => {
            console.error('Error establishing ngrok tunnel. Make sure your NGROK_AUTHTOKEN is set in .env if required.', err);
        });
});
