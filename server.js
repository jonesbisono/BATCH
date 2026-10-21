const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');
const ngrok = require('@ngrok/ngrok');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Security HTTP Headers with CSP configured for app assets
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            mediaSrc: ["'self'", "https://assets.mixkit.co"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Permissive in dev if needed, or enforce strict list
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Sync-API-Key']
}));

// Request body parser with payload size restriction to prevent DoS
app.use(express.json({ limit: '500kb' }));

// Serve static frontend files ONLY from public directory
app.use(express.static(path.join(__dirname, 'public'), {
    dotfiles: 'ignore',
    index: 'index.html'
}));

// Rate Limiters
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 AI requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests. Please slow down.' }
});

const syncLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60, // 60 sync operations per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many sync requests. Please try again later.' }
});

app.use('/api/', generalLimiter);

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

// Helper: Sanitize string input to prevent prompt injection / oversized buffers
function sanitizeString(input, maxLength = 500) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, maxLength);
}

// Unified AI Provider Engine (supports OpenAI GPT-4o / GPT-4o-mini and Google Gemini)
function getAIProvider() {
    if (process.env.AI_PROVIDER) {
        return process.env.AI_PROVIDER.toLowerCase();
    }
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    return null;
}

async function executeAIRequest({ systemPrompt, userPrompt }) {
    const provider = getAIProvider();

    if (!provider) {
        throw new Error('No AI provider configured. Please set OPENAI_API_KEY or GEMINI_API_KEY in your .env file.');
    }

    if (provider === 'openai') {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set in the .env file.');
        }
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7
        });

        let text = completion.choices[0]?.message?.content?.trim() || '{}';
        text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        return JSON.parse(text);
    } else {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set in the .env file.');
        }
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        const response = await ai.models.generateContent({
            model: model,
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json'
            }
        });

        let text = response.text.trim();
        text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        return JSON.parse(text);
    }
}

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

app.post('/api/generate-recipe', aiLimiter, async (req, res) => {
    try {
        const { ingredients, type } = req.body;

        if (!ingredients || typeof ingredients !== 'string') {
            return res.status(400).json({ error: 'Valid ingredients string is required.' });
        }

        const sanitizedIngredients = sanitizeString(ingredients, 1000);
        const sanitizedType = sanitizeString(type, 50);

        if (!sanitizedIngredients) {
            return res.status(400).json({ error: 'Ingredients cannot be empty.' });
        }

        let systemPrompt = SYSTEM_PROMPT;
        let userInstruction = `Please create a recipe using these ingredients: ${sanitizedIngredients}`;

        if (sanitizedType === 'drinks') {
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
            userInstruction = `Please create a beverage or drink formulation using these ingredients: ${sanitizedIngredients}`;
        }

        const recipeData = await executeAIRequest({
            systemPrompt: systemPrompt,
            userPrompt: userInstruction
        });

        // Inject or enforce correct properties
        recipeData.lab = sanitizedType === 'drinks' ? 'drinks' : 'culinary';
        if (!recipeData.ingredientSections) {
            recipeData.ingredientSections = sanitizedType === 'drinks' ? {
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

app.post('/api/suggest-tools', aiLimiter, async (req, res) => {
    try {
        const { recipe } = req.body;
        if (!recipe || typeof recipe !== 'object') {
            return res.status(400).json({ error: 'Valid recipe details object is required.' });
        }

        const projectName = sanitizeString(recipe.projectName || '', 200);
        if (!projectName) {
            return res.status(400).json({ error: 'Recipe project name is required.' });
        }

        const prompt = `
        Analyze this recipe: "${projectName}".
        Ingredients: ${JSON.stringify(recipe.ingredients || {})}.
        Steps: ${JSON.stringify(Array.isArray(recipe.steps) ? recipe.steps.map(s => sanitizeString(s?.label || '', 100)) : [])}.

        Suggest 4-6 kitchen tools that are either essential or can be used to optimize/modernize this recipe. Include standard tools (like a Whisk, Stand Mixer, Double Boiler) and advanced tools if relevant (like an iSi Whipping Siphon, Sous-Vide Circulator, Chamber Vacuum Sealer, Blowtorch, Chinois).
        
        Output MUST be a pure JSON array of strings (the tool names). Example: ["Stand Mixer", "Balloon Whisk", "iSi Whipping Siphon"].
        No markdown, no backticks, no comments.
        `;

        const parsed = await executeAIRequest({
            systemPrompt: "You are an expert culinary and bar equipment consultant. Output must be a pure JSON array of tool names.",
            userPrompt: prompt
        });

        res.json(Array.isArray(parsed) ? parsed : (parsed.tools || []));
    } catch (error) {
        console.error('Error suggesting tools:', error);
        res.status(500).json({ error: 'Failed to suggest tools.', details: error.message });
    }
});

app.post('/api/adapt-steps', aiLimiter, async (req, res) => {
    try {
        const { steps, selectedTools } = req.body;
        if (!Array.isArray(steps) || !Array.isArray(selectedTools)) {
            return res.status(400).json({ error: 'Steps and selectedTools must be arrays.' });
        }

        if (steps.length > 50 || selectedTools.length > 50) {
            return res.status(400).json({ error: 'Array length exceeds maximum allowed limit.' });
        }

        const safeTools = selectedTools.map(t => sanitizeString(String(t), 100));

        const systemInstruction = `
        You are a Michelin-starred Chef and a master of Culinary Arts. 
        You will be given a list of recipe steps and a list of kitchen tools that are currently available to the cook.
        
        Your task is to modify the recipe's steps (specifically the 'timer' and the 'textVariants': 'beginner', 'professional', and 'michelin') to leverage the available tools.
        
        Available Tools: ${JSON.stringify(safeTools)}.
        
        For example:
        - If "Stand Mixer" is available, update whipping/kneading steps to use the stand mixer instead of hand mixing, and reduce the timer accordingly.
        - If "iSi Whipping Siphon" is available, update aerating/foaming steps (like whipped cream or sabayon) to use the siphon, and adapt Michelin instructions to charge it with N2O.
        - If "Sous-Vide" is available, update slow cooking/tempering steps (like cooking eggs or custards) to use water bath temperatures.
        - If a step does not benefit from any of the available tools, leave its text and timer exactly as they are.

        Output MUST be a pure JSON array matching this exact step structure for each step:
        [
            {
                "phase": "mise-en-place" | "execution" | "assembly",
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

        const parsed = await executeAIRequest({
            systemPrompt: systemInstruction,
            userPrompt: `Modify these steps: ${JSON.stringify(steps)}`
        });

        res.json(Array.isArray(parsed) ? parsed : (parsed.steps || []));
    } catch (error) {
        console.error('Error adapting steps:', error);
        res.status(500).json({ error: 'Failed to adapt steps.', details: error.message });
    }
});

app.get('/api/sync', syncLimiter, (req, res) => {
    try {
        // Optional API key protection if configured
        if (process.env.SYNC_API_KEY) {
            const clientKey = req.headers['x-sync-api-key'] || req.query.apiKey;
            if (clientKey !== process.env.SYNC_API_KEY) {
                return res.status(401).json({ error: 'Unauthorized. Invalid or missing sync API key.' });
            }
        }

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

app.post('/api/sync', syncLimiter, (req, res) => {
    try {
        // Optional API key protection if configured
        if (process.env.SYNC_API_KEY) {
            const clientKey = req.headers['x-sync-api-key'] || req.query.apiKey;
            if (clientKey !== process.env.SYNC_API_KEY) {
                return res.status(401).json({ error: 'Unauthorized. Invalid or missing sync API key.' });
            }
        }

        initializeDataFiles();
        const { recipes, tools, notebooks, lastUpdated } = req.body;

        // Strict schema and type validation to prevent corruption or malicious payloads
        if (!recipes || typeof recipes !== 'object' || Array.isArray(recipes)) {
            return res.status(400).json({ error: 'Valid recipes object is required for sync.' });
        }
        if (!Array.isArray(tools)) {
            return res.status(400).json({ error: 'Valid tools array is required for sync.' });
        }
        if (!Array.isArray(notebooks)) {
            return res.status(400).json({ error: 'Valid notebooks array is required for sync.' });
        }

        const timestamp = typeof lastUpdated === 'number' ? lastUpdated : Date.now();

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

app.post('/api/autofill-recipe', aiLimiter, async (req, res) => {
    try {
        const { name, lab } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Recipe name is required.' });
        }

        const sanitizedName = sanitizeString(name, 200);
        const sanitizedLab = sanitizeString(lab, 50);

        if (!sanitizedName) {
            return res.status(400).json({ error: 'Recipe name cannot be empty.' });
        }

        const parsed = await executeAIRequest({
            systemPrompt: systemPrompt,
            userPrompt: `Generate recipe for: "${sanitizedName}"`
        });

        res.json(parsed);
    } catch (error) {
        console.error('Error autofilling recipe:', error);
        res.status(500).json({ error: 'Failed to autofill recipe.', details: error.message });
    }
});

// Start Server
app.listen(port, () => {
    const activeProvider = getAIProvider();
    if (!activeProvider) {
        console.warn('WARNING: Neither OPENAI_API_KEY nor GEMINI_API_KEY is set in .env — AI features will be disabled until configured.');
    } else {
        console.log(`BATCH Culinary Lab server running at http://localhost:${port}`);
        console.log(`Active AI Provider: ${activeProvider.toUpperCase()}`);
    }

    // Optional ngrok tunnel (opt-in via ENABLE_NGROK=true)
    if (process.env.ENABLE_NGROK === 'true' && process.env.NGROK_AUTHTOKEN) {
        ngrok.forward({ addr: port, authtoken_from_env: true })
            .then(listener => {
                console.log(`ngrok tunnel securely established at: ${listener.url()}`);
            })
            .catch(err => {
                console.error('Error establishing ngrok tunnel:', err);
            });
    } else {
        console.log('ngrok tunnel disabled. Set ENABLE_NGROK=true and NGROK_AUTHTOKEN in .env to enable public tunneling.');
    }
});
