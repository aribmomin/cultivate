# 🌾 TerraLearn Organic Farming Learning Platform — Backend API

Welcome to the backend server for the **Organic Farming Learning & Simulation Platform**! This backend is built using the **MERN** stack (Node.js, Express, MongoDB, and Mongoose) following an **MVC + Service Layer** architecture.

---

## 📁 Directory Structure & Architecture

```text
server/
├── .env.example            # Template for environment variables
├── .env                    # Active local environment variables (git-ignored)
├── .gitignore              # Files ignored by git (node_modules, .env, logs)
├── package.json            # Node.js dependencies and run scripts
├── README.md               # Backend documentation and developer guide
└── src/
    ├── server.js           # Server entry point (starts Express server on port 5000)
    ├── app.js              # Express app setup (CORS, Helmet, Morgan, middleware)
    ├── config/
    │   └── db.js           # Reusable MongoDB / Mongoose connection manager
    ├── models/             # Mongoose database models and schema definitions
    │   ├── User.js         # User accounts, bcrypt password hashing, roles
    │   ├── Course.js       # Curriculum courses, lessons, and metadata
    │   ├── Quiz.js         # Quizzes with secure server-side answer keys
    │   ├── CourseProgress.js # Per-user lesson completion records
    │   ├── QuizAttempt.js  # Per-user quiz scores and attempt logs
    │   ├── Crop.js         # The 5 canonical crops (growth days, water, yields)
    │   ├── Farm.js         # 12-tile virtual farm state per learner
    │   ├── SimulationConfig.js # Dynamic environmental simulation coefficients
    │   ├── AuditLog.js     # Administrative action audit trail
    │   └── index.js        # Barrel export for all models
    ├── controllers/        # Request handlers & HTTP response formatters
    │   └── healthController.js # Server and database connection diagnostics
    ├── routes/             # REST API endpoint route declarations
    │   └── healthRoutes.js # /api/health endpoint
    ├── middleware/         # Custom Express middleware
    │   └── errorHandler.js # Centralized 404 and global error handling
    ├── services/           # Dedicated business logic layer (simulation, rules)
    ├── utils/              # Helper utilities (token generation, calculations)
    └── seeds/              # Database population script
        └── seedDatabase.js # Idempotent seed script importing courses and crops
```

---

## 🚀 Getting Started (Beginner Guide)

### 1. Prerequisites
Ensure you have **Node.js (v18+)** installed. You can check your version in a terminal:
```bash
node -v
npm -v
```

### 2. Install Dependencies
Open your terminal, navigate to the `server/` directory, and run:
```bash
cd server
npm install
```

### 3. Configure Environment Variables (`.env`)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Inside `server/.env`, verify or configure the following values:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

---

## 🍃 Connecting to MongoDB Atlas

You can connect to a free cloud database on **MongoDB Atlas**:

1. Sign up or log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user (e.g., username `terralearn_admin` and a secure password).
4. Under **Network Access**, add an IP Access entry:
   - For local development, choose **Allow Access from Anywhere** (`0.0.0.0/0`) or add your current IP address.
5. In your cluster dashboard, click **Connect** → **Drivers** (Node.js).
6. Copy the connection string (it looks like `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/organic_farming?retryWrites=true&w=majority`).
7. Paste this connection string into your `server/.env` file as `MONGODB_URI`, replacing `<username>` and `<password>` with your database user credentials.

---

## ⚡ Running the Server

* **Development mode (with auto-restart on file changes):**
  ```bash
  npm run dev
  ```
* **Production mode:**
  ```bash
  npm start
  ```

Once running, you can test the health endpoint in your browser or with curl:
```bash
curl http://localhost:5000/api/health
```

The response will report the server status and database connectivity:
```json
{
  "success": true,
  "status": "healthy",
  "message": "Organic Farming Learning Platform API is operational and connected to database.",
  "timestamp": "2026-11-23T11:15:00.000Z",
  "uptimeSeconds": 12,
  "environment": "development",
  "database": {
    "state": "connected",
    "isConnected": true,
    "host": "cluster0-shard-00-00.mongodb.net",
    "databaseName": "organic_farming"
  }
}
```

---

## 🌱 Seeding the Database

Once your `MONGODB_URI` is configured in `server/.env`, populate the database with the approved curriculum and crops by running:
```bash
npm run seed
```

This seeder is **100% idempotent** (safe to run multiple times without duplicating data). It automatically creates:
1. **Simulation Rules**: Initial budget, evaporation rates, irrigation gains, composting boosts.
2. **5 Core Crops**: Heritage Tomato, Organic Durum Wheat, Sweet Golden Corn, Nantes Carrot, Jasmine Paddy Rice.
3. **4 Academic Courses & Lessons**: Living Soil Systems, Integrated Pest Management (IPM), Water Stewardship, and Crop Rotation.
4. **Assessment Quizzes**: Multiple-choice questions with answer keys securely held in MongoDB.
5. **3 Academic Personas**: Elena Rostova (Learner), Marcus Vance (Instructor), Dr. Sarah Jenkins (Admin).

---

## 🛡️ Security Features Implemented
* **Password Hashing**: User passwords are automatically salted and hashed using `bcryptjs` (cost factor 10) before saving. Plaintext passwords are never stored.
* **Hidden Answer Keys**: Quizzes are stored separately from courses, preventing students from inspecting answer keys in course listings.
* **Security Headers**: `helmet` is enabled on all routes.
* **CORS**: Restricted to the frontend origin (`http://localhost:5173`).
* **Input Validation & Sanitization**: Validated email formats, password minimum lengths, and number constraints across all Mongoose schemas.

