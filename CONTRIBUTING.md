# Contributing to BATCH

Thank you for your interest in contributing to **BATCH // Culinary & Drinks Experimentation Lab**! We welcome contributions from developers, chefs, bartenders, food scientists, and open-source enthusiasts.

## How Can You Contribute?

- **Reporting Bugs:** Open an issue using the Bug Report template. Include reproducible steps and your environment details.
- **Suggesting Features:** Propose new ideas, kitchen equipment definitions, or lab notebook presets via Feature Requests.
- **Formulation Presets:** Add new modernist control recipes in `data/recipes.json`.
- **Submitting Code:** Fix issues, add tests, improve UI/UX, or enhance AI prompt templates.

## Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/BATCH.git
   cd BATCH
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   ```
   Add your `OPENAI_API_KEY` or `GEMINI_API_KEY` to test AI features.

4. **Run the test suite:**
   ```bash
   npm test
   ```

5. **Start local development server:**
   ```bash
   npm start
   ```

## Pull Request Guidelines

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Ensure existing tests pass:
   ```bash
   npm test
   ```
3. Commit your changes with clear, descriptive commit messages following Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `test:`).
4. Push to your fork and submit a Pull Request to the `main` branch.
5. All PRs will automatically run through our GitHub Actions CI pipeline.

## Community

Please be respectful and constructive in all discussions, pull requests, and issue threads. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for our community standards.
