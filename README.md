# 🌱 Cultivate: Organic Agronomy Academy & Farm Simulator

> **Cultivate** is a full-stack educational and simulation platform designed to teach biological agroecology, soil chemistry, non-toxic pest defense, water stewardship, and polyculture crop management through interactive coursework and a turn-based virtual farm simulator.

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald)](LICENSE)

---

## 📖 Table of Contents

- [Core Features](#-core-features)
- [System Architecture](#-system-architecture)
- [Directory Structure](#-directory-structure)
- [Getting Started](#-getting-started)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Backend Configuration & Setup](#2-backend-configuration--setup)
  - [3. Frontend Configuration & Setup](#3-frontend-configuration--setup)
- [Organic Agronomy & Simulation Rules](#-organic-agronomy--simulation-rules)
  - [The 5 Canonical Crops](#the-5-canonical-crops)
  - [Turn-Based Environmental Dynamics](#turn-based-environmental-dynamics)
  - [Organic Field Operations](#organic-field-operations)
- [Gamification & Learning Progress](#-gamification--learning-progress)
- [Administration & Audit Console](#-administration--audit-console)
- [Automated Testing & Verification](#-automated-testing--verification)

---

## ✨ Core Features

### 1. 📚 Academic Agronomy Curriculum
* **Four Core Courses**:
  * *Foundations of Living Soil Systems* (Soil microbiology, composting ratios, mycorrhizal networks)
  * *Integrated Organic Pest Management (IPM)* (Economic thresholds, predatory insects, botanical bio-repellents)
  * *Water Stewardship & Precision Irrigation* (Soil hydrology, evapotranspiration, drip layout)
  * *Crop Rotation & Polyculture Systems* (Nutrient cycles, botanical families, companion planting)
* **Authoritative Course Progress**: Lesson completions saved in MongoDB, updating catalog completion percentages in real time.
* **Server-Graded Quizzes**: Multi-question assessments with secure backend answer keys and instant educational feedback.

### 2. 🌾 Turn-Based 12-Tile Farm Simulator
* **Isolated Persistent Farms**: Each authenticated learner manages their own 12-tile ($3 \times 4$ grid) virtual organic farm.
* **Biological Soil Physics**: Real-time modeling of soil moisture (evaporation, rainfall bonuses, saturation risks), organic nitrogen levels, and soil microbiome health.
* **Crop Lifecycle & Stages**: Germination $\rightarrow$ Vegetative $\rightarrow$ Flowering $\rightarrow$ Fruiting $\rightarrow$ Mature Harvest.
* **Companion Planting**: French Marigold (biological pest deterrent buffer) and White Clover (rhizobial symbiotic nitrogen fixation).
* **Maturity-Enforced Harvesting**: Immature crops cannot be prematurely harvested; mature crops yield organic produce converted to revenue and experience points (+75 XP).

### 3. 🛡️ Curriculum & Environmental Administration Console
* **Role-Based Access Control**: Protected by administrator credentials.
* **Live Course & Quiz Authoring**: Add new courses, toggle draft/active catalog status, and author quiz questions with rationales.
* **Crop Calibration**: Dynamically calibrate growth days, daily water needs, market prices, and minimum harvest days.
* **Simulation Tuning**: Adjust physical simulation coefficients (evaporation rates, irrigation boosts, starting treasury) with instant propagation to untouched farms.
* **Tamper-Evident Audit Logging**: Automatically tracks administrative actions, timestamps, and change records.

---

## 🏗️ System Architecture

Cultivate is built using a **MERN** architecture (MongoDB, Express, React, Node.js) with strict separation of concerns:

```
┌────────────────────────────────────────────────────────┐
│                   React 18 Client                      │
│   (Vite, Tailwind CSS, Framer Motion, Lucide Icons)    │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST (Bearer JWT)
┌──────────────────────────▼─────────────────────────────┐
│                 Express.js REST API                    │
│   (Auth, Progress, Farm Simulation, Admin, Leaderboard)│
├────────────────────────────────────────────────────────┤
│           Simulation Engine & Service Layer            │
│   (farmSimulationService, progressService, Engine)     │
├────────────────────────────────────────────────────────┤
│                    Mongoose Models                     │
│   (User, Course, CourseProgress, Crop, Farm, AuditLog) │
└──────────────────────────┬─────────────────────────────┘
                           │ TLS Connection
┌──────────────────────────▼─────────────────────────────┐
│                  MongoDB Atlas Cloud                   │
│         (Single Authoritative Source of Truth)         │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```text
Organic Farming/
├── client/                     # React 18 frontend single-page application
│   ├── public/                 # Static assets and icons
│   └── src/
│       ├── components/         # Reusable UI components (Navbar, Footer, Modals, Cards)
│       ├── context/            # AuthContext (JWT session lifecycle & user isolation)
│       ├── data/               # Canonical mock data (MOCK_COURSES, MOCK_CROPS)
│       ├── pages/              # Routed pages
│       │   ├── admin/          # Administration Console & Audit Trail
│       │   ├── auth/           # Login & Registration views
│       │   ├── courses/        # Course Catalog, Details, Lesson Reader, Quiz
│       │   ├── home/           # Landing page & features overview
│       │   ├── leaderboard/    # Global XP Leaderboard & Learner Profiles
│       │   └── simulator/      # 12-Tile Farm Simulator, Grid, HUD, TileInspector
│       └── services/           # Frontend API connectors (apiClient, progressService, etc.)
├── server/                     # Express.js REST API & Simulation Engine
│   ├── src/
│   │   ├── config/             # Database connection (db.js) and environment loader
│   │   ├── controllers/        # Request controllers (auth, course, farm, admin, progress)
│   │   ├── middleware/         # Auth verification, role guards, error handling
│   │   ├── models/             # Mongoose schemas (User, Course, Crop, Farm, AuditLog)
│   │   ├── routes/             # REST route declarations
│   │   ├── seeds/              # Database seeding script (seedDatabase.js)
│   │   └── services/           # Simulation engine (simulationEngine.js)
│   └── test/                   # Automated end-to-end integration test suites
│       ├── batchB_test.js      # Auth & Course API suite (18 tests)
│       ├── batchC_test.js      # Simulation & Admin suite (32 tests)
│       ├── auth_isolation_test.js # User Isolation suite (17 tests)
│       └── frontend_workflows_test.js # Core workflows suite (36 tests)
├── docs/                       # Project documentation & requirements (srs.md)
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- A **MongoDB Atlas** account (or local MongoDB v6+)

---

### 2. Backend Configuration & Setup

1. Open your terminal and navigate to the `server/` directory:
   ```bash
   cd server
   npm install
   ```

2. Create an environment configuration file:
   ```bash
   cp .env.example .env
   ```

3. Open `server/.env` and configure your credentials:
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/organic_farming?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d
   ```

4. Populate the database with the initial organic agronomy courses and crops:
   ```bash
   npm run seed
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   # Server runs at http://localhost:5000
   ```

---

### 3. Frontend Configuration & Setup

1. Open a new terminal tab and navigate to `client/`:
   ```bash
   cd client
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   # Client runs at http://localhost:5173
   ```

3. Open your browser and navigate to `http://localhost:5173`.

---

## 🌿 Organic Agronomy & Simulation Rules

### The 5 Canonical Crops

| Crop | Botanical Family | Growth Days | Min Harvest | Daily Water | Base Yield | Seed Cost | Market Price |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Heritage Tomato** | *Solanaceae* | 60 | Day 50 | 14% | 120 kg | $20.00 | $3.20 / kg |
| **Organic Durum Wheat** | *Poaceae* | 75 | Day 65 | 8% | 350 kg | $15.00 | $1.85 / kg |
| **Sweet Golden Corn** | *Poaceae* | 80 | Day 70 | 16% | 280 kg | $25.00 | $2.10 / kg |
| **Heirloom Rainbow Carrot**| *Apiaceae* | 55 | Day 45 | 10% | 160 kg | $15.00 | $2.75 / kg |
| **Jasmine Paddy Rice** | *Poaceae* | 90 | Day 80 | 25% | 400 kg | $25.00 | $2.40 / kg |

---

### Turn-Based Environmental Dynamics

Advancing the simulation day triggers the biological cycle across all 12 plots:
1. **Weather Shifts**: Cycles between *Sunny & Warm*, *Partly Cloudy*, *Gentle Rain* (+18% moisture), and *Warm & Humid*.
2. **Moisture Loss**: Baseline soil evaporation reduces moisture daily. Soil with high organic humus ($>80\%$ soil health) benefits from enhanced moisture retention.
3. **Water Stress**: If soil moisture drops below $20\%$, plants incur health damage and leaf wilt.
4. **Pest Pressure**: Humid conditions increase aphid hazards; companion plantings shield neighboring plots from drift.

---

### Organic Field Operations

* **Precision Drip Irrigation** (`$10.00`): Delivers $+35\%$ targeted root hydration without risk of fungal splash.
* **Humic Vermicompost** (`$25.00`): Enriches soil microbiology with $+16\%$ Soil Health and $+22\%$ bioavailable Nitrogen.
* **Cold-Pressed Neem Biopesticide** (`$20.00`): Natural azadirachtin spray reducing pest hazard by $-30\%$.
* **Intercrop Companions** (`$15.00`):
  * **French Marigold**: Reduces insect and nematode attacks.
  * **White Clover**: Symbiotic *Rhizobium* root nodules deliver continuous organic nitrogen.
* **Fallow Soil Rest**: Empty plots undergo biological regeneration, gradually increasing soil structure.

---

## 🎮 Gamification & Learning Progress

Cultivate uses positive behavioral reinforcement to incentivize real learning mastery:
* **Lesson Completion**: $+50\text{ XP}$ per unique completed lesson.
* **Course Mastering**: Completing all lessons + passing the quiz unlocks course distinction.
* **Successful Harvest**: $+75\text{ XP}$ and automatic unlocking of the **Heritage Harvester** badge.
* **Dynamic Global Leaderboard**: Ranks learners across institutions based on verified academic XP and agricultural stewardship.

---

## 🛠️ Administration & Audit Console

Access to `/admin` is restricted to authorized curriculum directors:
* **Default Admin Account**: `sarah.jenkins@cultivate.org`
* **Features**:
  * **Curriculum Director**: Create new multi-unit courses or toggle active/draft status.
  * **Question Authoring**: Add multiple-choice questions with educational rationales.
  * **Botanical Calibration**: Fine-tune crop parameters (e.g., adjust growth periods for accelerated academic terms).
  * **Physical Rule Tuning**: Calibrate starting budget, daily evaporation rates, and rainfall bonuses.
  * **Audit Trail**: Real-time inspection of all administrative actions.

---

## 🧪 Automated Testing & Verification

Cultivate includes comprehensive automated regression suites covering security, user isolation, and agronomic logic:

```bash
# 1. Core End-to-End Workflows & Bug Fix Verification (36 tests)
node server/test/frontend_workflows_test.js

# 2. Authentication, Course Progress & API Verification (18 tests)
node server/test/batchB_test.js

# 3. Farm Simulation & Administration Verification (32 tests)
node server/test/batchC_test.js

# 4. Authentication State & Account Isolation Verification (17 tests)
node server/test/auth_isolation_test.js

# 5. Frontend Production Build Check
npm --prefix client run build
```

**Total Test Coverage**: **103 / 103 Tests Passing (100%)**

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

