# BATCH // Culinary & Drinks Experimentation Lab

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> **BATCH** is a modernist culinary and mixology research notebook and experimental lab. It applies scientific rigor, precision gram-level formulation, A/B batch testing, and generative AI to recipe development for chefs, bartenders, and culinary scientists.

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [3-Stage Lab Workflow](#-3-stage-lab-workflow)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
  - [Environment Configuration](#environment-configuration)
  - [Running with Docker](#running-with-docker)
  - [Building for Android](#building-for-android)
- [API Endpoints](#-api-endpoints)
- [Included Formulations](#-included-formulations)
- [Security & Architecture](#-security--architecture)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Traditional recipes are static; modern kitchen development is iterative and scientific. **BATCH** treats recipe creation like a laboratory experiment:
- **Establish a Baseline Control**: Lock down standard ratios, weights, and processes.
- **Formulate Test Batches**: Introduce controlled variables (ingredient substitutions, hydration, fermentation times, temperature curves).
- **Multi-Level Guidance**: Switch dynamically between **Beginner**, **Professional**, and **Michelin-level** instructions.
- **AI-Driven Modernist Ideation**: Leverage Google Gemini 2.5 Flash to generate formulations grounded in *Modernist Cuisine*, Harold McGee's *On Food and Cooking*, Dave Arnold's *Liquid Intelligence*, and Ferran Adrià's techniques.

---

## 🚀 Key Features

### 🧪 Scientific Recipe Formulation
- **Weight-Based Precision**: Everything is calculated in exact grams (`g`), milliliters (`ml`), or precise droplets to eliminate volumetric inaccuracies.
- **Logical Culinary Sections**:
  - **Culinary Labs**: Categorized into *Cream & Flour* (fats, solids, flours), *Soak & Liquids* (infusions, syrups, stocks), and *Assembly & Dusting* (finishes, garnishes).
  - **Drinks Labs**: Categorized into *Spirits & Liqueurs* (primary base), *Sweeteners & Modifiers* (acids, syrups), and *Dilution & Garnish* (water, ice, aroma).
- **Notebook Management**: Switch seamlessly between dedicated labs (e.g., *Culinary Lab*, *Drinks Lab*) or create custom themed lab notebooks.

### 🤖 Generative AI Suite (Powered by Google Gemini 2.5 Flash)
- **Pantry Formulator (`/api/generate-recipe`)**: Input raw ingredients on hand to synthesize structured, production-ready modernist recipes.
- **Recipe Autofill (`/api/autofill-recipe`)**: Enter any recipe name or concept to auto-generate baseline ingredients, steps, timers, and tweak recommendations.
- **Kitchen Tool Detection & Adaptation (`/api/suggest-tools` & `/api/adapt-steps`)**: Detects tools (e.g., *Stand Mixer*, *iSi Whipping Siphon*, *Sous-Vide Circulator*, *Rotary Evaporator*) and dynamically alters recipe steps, timers, and Michelin-tier techniques to take advantage of available equipment.

### 🧭 Multi-Tier Instruction Engine
Every recipe step features three parallel instruction levels:
1. **Beginner**: Accessible instructions focused on fundamental kitchen skills.
2. **Professional**: Concise commercial kitchen vocabulary and efficient execution.
3. **Michelin**: Extreme technical precision, specific temperature ranges, molecular gastronomy principles, and scientific explanations.

### 📱 Cross-Platform Experience
- **Responsive Analogue UI**: Dark and light modes designed with notebook aesthetics, typography, and clean laboratory layouts.
- **Mobile Native via Capacitor**: Packaged for Android with full touch and viewport optimization (`com.batch.culinarylab`).
- **Ngrok Tunneling**: Built-in, zero-config secure remote access for testing across mobile devices outside the local Wi-Fi.

---

## 🔬 3-Stage Lab Workflow

```
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│     1. SETUP         │  ──> │   2. ACTIVE LAB      │  ──> │     3. REPORT        │
│                      │      │                      │      │                      │
│ • Baseline vs Test   │      │ • Phase Execution    │      │ • Batch Comparison   │
│ • Gram Scaling       │      │ • Multi-Tier Views   │      │ • Parameter Diffs    │
│ • Variable Tweaks    │      │ • Step Timers        │      │ • Tasting Notes      │
│ • Equipment Selection│      │ • Live Observations  │      │ • Iteration Archive  │
└──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

1. **Setup**: Define recipe parameters, set scale factors, log tweak hypotheses (Ingredient, Technique, or Time-Temp), and configure equipment.
2. **Active Lab**: Run through `mise-en-place`, `execution`, and `assembly` phases with integrated countdown timers and live observation logs.
3. **Report**: Compare baseline controls against test iterations side-by-side, evaluating sensory profiles, texture, yield, and conclusions.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | [Node.js](https://nodejs.org/), [Express 5](https://expressjs.com/) |
| **AI Integration** | [@google/genai](https://www.npmjs.com/package/@google/genai) (Gemini 2.5 Flash) |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3, Google Fonts (*Outfit*, *Space Grotesk*, *Lora*) |
| **Mobile Runtime** | [Capacitor 8](https://capacitorjs.com/) (Android) |
| **Networking & Tunneling**| [@ngrok/ngrok](https://www.npmjs.com/package/@ngrok/ngrok), [CORS](https://www.npmjs.com/package/cors) |
| **Security & Utilities** | [Helmet](https://helmetjs.github.io/), [express-rate-limit](https://www.npmjs.com/package/express-rate-limit), [dotenv](https://www.npmjs.com/package/dotenv) |
| **Containerization** | [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/) (Multi-stage Alpine image) |

---

## 📁 Project Structure

```text
BATCH/
├── .env.example             # Template for required environment variables
├── .gitignore
├── BATCH-Lab-debug.apk      # Compiled Android debug build
├── capacitor.config.json    # Capacitor Android configuration
├── docker-compose.yml       # Docker Compose setup
├── Dockerfile               # Multi-stage production container build
├── package.json             # Node dependencies and scripts
├── server.js                # Express API server, Gemini AI integration, & rate limiters
├── android/                 # Capacitor Android native project
├── data/                    # Local-first JSON data persistence
│   ├── notebooks.json       # Notebook and lab configurations
│   ├── recipes.json         # Formulation repository and batches
│   ├── sync.json            # Synchronization timestamps
│   └── tools.json           # Available kitchen and bar equipment
└── public/                  # Frontend application assets
    ├── app.js               # Frontend business logic & reactive UI
    ├── index.html           # Main SPA layout
    ├── style.css            # Dark/light theme styling & layout rules
    └── sketchzone/          # Custom typography assets
```

---

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher, v22+ recommended)
- [npm](https://www.npmjs.com/) (v9+)
- A [Google Gemini API Key](https://aistudio.google.com/) (free tier available)
- *(Optional)* [Docker](https://www.docker.com/) & Docker Compose
- *(Optional)* [Android Studio](https://developer.android.com/studio) (for Android native builds)

---

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jonesbisono/BATCH.git
   cd BATCH
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and insert your Gemini API key:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

### Environment Configuration

The application supports the following settings in `.env`:

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key for recipe generation & tool adaptation |
| `PORT` | No | `3000` | Port for the Express server to listen on |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated list of allowed CORS origins |
| `ENABLE_NGROK` | No | `false` | Set to `true` to create a public ngrok tunnel on startup |
| `NGROK_AUTHTOKEN` | If ngrok | — | Ngrok authentication token |
| `SYNC_API_KEY` | No | — | Optional secret token for authenticating `/api/sync` requests |

---

### Running with Docker

Run BATCH in an isolated container with persistent data:

```bash
# Build and launch using docker-compose
docker-compose up --build -d
```

Access the app at `http://localhost:3000`. The `./data` directory is mounted as a volume to persist your recipes and notebooks across container restarts.

To stop the container:
```bash
docker-compose down
```

---

### Building for Android

BATCH includes full Android support using **Capacitor**:

1. Sync web assets with Capacitor:
   ```bash
   npx cap sync android
   ```
2. Open the native project in Android Studio:
   ```bash
   npx cap open android
   ```
3. Run on an emulator, connected Android device, or build a signed release APK. *(A pre-built debug APK is available in the root as `BATCH-Lab-debug.apk`)*.

---

## 🔌 API Endpoints

All endpoints are hosted under `/api/` and protected with rate-limiting:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/generate-recipe` | Generates a full formulation from pantry ingredients using Gemini AI. |
| `POST` | `/api/autofill-recipe` | Auto-completes a recipe formulation given a dish/drink title. |
| `POST` | `/api/suggest-tools` | Analyzes a recipe and returns optimal kitchen/bar equipment. |
| `POST` | `/api/adapt-steps` | Rewrites step directions and timers to utilize available equipment. |
| `GET` | `/api/sync` | Fetches recipes, tools, notebooks, and sync timestamps. |
| `POST` | `/api/sync` | Persists updated recipes, tools, and notebooks to the server. |

---

## 🍲 Included Formulations

BATCH comes pre-loaded with sample control recipes for experimentation:

- ☕ **Classic Tiramisu**: Testing mascarpone-to-cream ratios and espresso soak absorption.
- 🍕 **Neapolitan Pizza (High Hydration)**: Testing fermentation periods, gluten matrix development, and bake heat.
- 🥐 **Laminated Croissant**: Dough lamination, butter sheet plasticity, and proofing control.
- 🍸 **Carbonated Negroni**: Brix balance, acid adjustments, and force-carbonation parameters.
- 🍵 **Nitro Cold Brew Matcha**: Micro-foaming and nitrogen aeration dynamics.
- 🍞 **Artisan Sourdough Bread**: Levain hydration, autolyse timing, and dutch oven steam retention.

---

## 🛡️ Security & Architecture

- **Content Security Policy (CSP)**: Managed via [Helmet](https://helmetjs.github.io/) with strict directives.
- **Rate Limiting**:
  - General API: 200 requests / 15 minutes.
  - Gemini AI Endpoints: 30 requests / minute per IP to protect quotas.
  - Data Sync: 60 operations / 15 minutes per IP.
- **Payload Sanitization**: Server-side string sanitization and character length caps prevent oversized payloads and prompt injection.
- **Non-Root Container**: Dockerfile executes under a dedicated `node` user for security best practices.

---

## 🤝 Contributing

Contributions are welcome! Whether you are adding new lab presets, improving AI prompts, or polishing the UI:

1. Fork the Project
2. Create your Feature Branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your Changes:
   ```bash
   git commit -m "feat: add AmazingFeature"
   ```
4. Push to the Branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).
