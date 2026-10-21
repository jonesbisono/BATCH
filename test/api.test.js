const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RECIPES_FILE = path.join(__dirname, '..', 'data', 'recipes.json');
const NOTEBOOKS_FILE = path.join(__dirname, '..', 'data', 'notebooks.json');
const TOOLS_FILE = path.join(__dirname, '..', 'data', 'tools.json');

test('Data Files & Presets Integrity', async (t) => {
    await t.test('data/recipes.json exists and is valid JSON', () => {
        assert.ok(fs.existsSync(RECIPES_FILE), 'recipes.json must exist');
        const content = fs.readFileSync(RECIPES_FILE, 'utf8');
        const parsed = JSON.parse(content);
        assert.ok(typeof parsed === 'object' && parsed !== null, 'recipes.json must be an object');
        assert.ok(Object.keys(parsed).length > 0, 'recipes.json should have preset recipes');
    });

    await t.test('all preset recipes follow the expected BATCH schema', () => {
        const recipes = JSON.parse(fs.readFileSync(RECIPES_FILE, 'utf8'));
        for (const [key, recipe] of Object.entries(recipes)) {
            assert.ok(recipe.projectName, `Recipe ${key} must have projectName`);
            assert.ok(recipe.ingredients, `Recipe ${key} must have ingredients object`);
            assert.ok(recipe.steps, `Recipe ${key} must have steps array`);
            assert.ok(Array.isArray(recipe.steps), `Recipe ${key} steps must be an array`);
            
            // Check step structure
            recipe.steps.forEach((step, idx) => {
                assert.ok(step.phase, `Step ${idx} in ${key} must have a phase`);
                assert.ok(['mise-en-place', 'execution', 'assembly'].includes(step.phase), 
                    `Step phase in ${key} must be valid`);
                assert.ok(step.textVariants, `Step ${idx} in ${key} must have textVariants`);
                assert.ok(step.textVariants.beginner, `Step ${idx} in ${key} missing beginner variant`);
                assert.ok(step.textVariants.professional, `Step ${idx} in ${key} missing professional variant`);
                assert.ok(step.textVariants.michelin, `Step ${idx} in ${key} missing michelin variant`);
            });
        }
    });

    await t.test('data/notebooks.json exists with default labs', () => {
        assert.ok(fs.existsSync(NOTEBOOKS_FILE), 'notebooks.json must exist');
        const notebooks = JSON.parse(fs.readFileSync(NOTEBOOKS_FILE, 'utf8'));
        assert.ok(Array.isArray(notebooks), 'notebooks must be an array');
        assert.ok(notebooks.length >= 2, 'should have at least culinary and drinks lab');
        const ids = notebooks.map(n => n.id);
        assert.ok(ids.includes('culinary'), 'must include culinary lab');
        assert.ok(ids.includes('drinks'), 'must include drinks lab');
    });

    await t.test('data/tools.json exists and is valid', () => {
        assert.ok(fs.existsSync(TOOLS_FILE), 'tools.json must exist');
        const tools = JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8'));
        assert.ok(Array.isArray(tools), 'tools must be an array');
    });
});

test('Sanitization and Security Rules', async (t) => {
    await t.test('sanitizes strings properly', () => {
        function sanitizeString(input, maxLength = 500) {
            if (typeof input !== 'string') return '';
            return input.trim().slice(0, maxLength);
        }

        assert.equal(sanitizeString('  flour  '), 'flour');
        assert.equal(sanitizeString(123), '');
        assert.equal(sanitizeString('a'.repeat(600), 500).length, 500);
    });
});

test('AI Provider Resolution Logic', async (t) => {
    function resolveProvider(env) {
        if (env.AI_PROVIDER) return env.AI_PROVIDER.toLowerCase();
        if (env.OPENAI_API_KEY) return 'openai';
        if (env.GEMINI_API_KEY) return 'gemini';
        return null;
    }

    await t.test('selects openai when OPENAI_API_KEY is present', () => {
        assert.equal(resolveProvider({ OPENAI_API_KEY: 'sk-test' }), 'openai');
    });

    await t.test('selects gemini when only GEMINI_API_KEY is present', () => {
        assert.equal(resolveProvider({ GEMINI_API_KEY: 'test-gemini' }), 'gemini');
    });

    await t.test('respects explicit AI_PROVIDER override', () => {
        assert.equal(resolveProvider({ AI_PROVIDER: 'openai', GEMINI_API_KEY: 'test-gemini' }), 'openai');
        assert.equal(resolveProvider({ AI_PROVIDER: 'gemini', OPENAI_API_KEY: 'sk-test' }), 'gemini');
    });

    await t.test('returns null when no keys are present', () => {
        assert.equal(resolveProvider({}), null);
    });
});
