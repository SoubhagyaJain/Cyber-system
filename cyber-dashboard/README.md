<div align="center">

# 🛡️ CyberSentinel — ML-Powered Intrusion Detection Dashboard

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)

**A real-time network intrusion detection system powered by 5 ML classifiers, served via a FastAPI backend and visualised in a React 19 SOC-style dashboard.**

</div>

---

## 📸 What This Project Does

CyberSentinel trains multiple machine learning models on network flow data, classifying traffic as normal or into attack categories (DDoS, port scan, brute-force, etc.). A live simulation feeds test samples through the best model and visualises results in real time — threat level, packet log, attack rate, and model comparison charts.

---

## 🗂️ Project Structure

```
Detect cyber Intrusion/
├── dataset-part1.csv          ← Real network flow dataset (optional)
├── dataset-part2.csv
├── dataset-part3.csv
├── dataset-part4.csv
├── train_model.py             ← Standalone training script
└── cyber-dashboard/
    ├── backend/
    │   ├── server.py          ← FastAPI app (all API endpoints)
    │   ├── requirements.txt   ← Python dependencies (pinned versions)
    │   ├── venv/              ← Virtual environment (you create this)
    │   └── ml/
    │       ├── engine.py      ← Model definitions, training & evaluation
    │       └── data.py        ← Dataset loading & preprocessing
    └── src/
        ├── api.js             ← All frontend fetch calls (base URL here)
        ├── App.jsx            ← Root app, simulation loop, shared context
        └── components/        ← All dashboard UI components
```

---

## ✅ Prerequisites

| Tool | Minimum Version | Check command |
|------|----------------|---------------|
| Python | 3.9 | `python --version` |
| Node.js | 18 | `node --version` |
| npm | 9 | `npm --version` |

> **Windows users:** Use PowerShell for all commands below.

---

## 🚀 Step-by-Step Setup (Windows — Do This Exactly Once)

### 🖥️ Terminal 1 — Python Backend

**Step 1: Open PowerShell and navigate to the backend**
```powershell
cd "Detect cyber Intrusion\cyber-dashboard\backend"
```

**Step 2: Create a fresh virtual environment**
```powershell
python -m venv venv
```

**Step 3: Upgrade pip inside venv**
```powershell
.\venv\Scripts\python.exe -m pip install --upgrade pip
```

**Step 4: Install pinned ML packages first (order matters)**
```powershell
.\venv\Scripts\python.exe -m pip install numpy==1.26.4 scipy==1.11.4 scikit-learn==1.3.2
```

**Step 5: Install the rest of the backend packages**
```powershell
.\venv\Scripts\python.exe -m pip install pandas fastapi "uvicorn[standard]" psutil joblib xgboost
```

**Step 6: Verify the imports work**
```powershell
.\venv\Scripts\python.exe -c "import numpy; print('numpy OK:', numpy.__version__)"
.\venv\Scripts\python.exe -c "import sklearn; print('sklearn OK:', sklearn.__version__)"
```

✅ Expected output:
```
numpy OK: 1.26.4
sklearn OK: 1.3.2
```

**Step 7: Start the backend**
```powershell
.\venv\Scripts\python.exe -m uvicorn server:app --port 8000 --workers 1
```

✅ You'll see: `Uvicorn running on http://0.0.0.0:8000`

**Step 8: Verify health check (new terminal tab or browser)**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/health"
```
✅ Expected: `status: ok, models_loaded: 0`

---

### 🌐 Terminal 2 — React Frontend

**Step 1: Navigate to the frontend folder**
```powershell
cd "Detect cyber Intrusion\cyber-dashboard"
```

**Step 2: Install Node.js packages**
```powershell
npm install
```

**Step 3: Start the dev server**
```powershell
npm run dev
```

✅ You'll see: `Local: http://localhost:5173/`

> Open **http://localhost:5173** in your browser — the dashboard loads immediately.

---

## 🎮 First-Time Usage Flow

| Step | Action | Location |
|------|--------|----------|
| 1 | Open the dashboard | http://localhost:5173 |
| 2 | Navigate to **Model Comparison** | Left sidebar |
| 3 | Click **⚡ Train All Models** | Top-right button |
| 4 | Wait 30–90 seconds | Watch the progress status |
| 5 | Navigate to **Real-Time Ops** | Left sidebar |
| 6 | Click **▶ Start Simulation** | Top-right button |
| 7 | Watch live threat intelligence update | Main dashboard panels |

---

## ⚠️ Critical Rules — Don't Break These

These caused real crashes and hours of debugging during development:

| ❌ Don't | ✅ Do instead | Why |
|---------|--------------|-----|
| `uvicorn --reload` | Restart manually | Reload wipes `app.state` and all trained models |
| `--workers 2` or more | Always `--workers 1` | Multiple processes can't share in-memory models |
| `pip install --user` or global pip | Always use `.\venv\Scripts\python.exe -m pip install` | Mixing environments causes numpy/OpenMP deadlocks |
| Change port in `api.js` | Keep `localhost:8000` in sync with uvicorn | Wrong port = "Failed to fetch" on every call |

---

## 🔌 API Endpoints

| Method | Endpoint | What it does |
|--------|----------|--------------|
| `GET` | `/api/health` | Status + number of loaded models |
| `POST` | `/api/train` | Train models (`{"sample_size": 50000}`) |
| `GET` | `/api/models` | Metrics and feature importances for all models |
| `POST` | `/api/set-active/{name}` | Switch active model |
| `POST` | `/api/predict` | Simulate N packets (`{"count": 5}`) |
| `GET` | `/api/dashboard` | Full aggregated state for the dashboard |
| `GET` | `/api/system` | Live CPU and RAM usage |
| `POST` | `/api/simulation/reset` | Reset all counters and packet log |

---

## 🧠 ML Architecture

Five classifiers are trained, evaluated, and compared side-by-side:

| Model | Key Strength |
|-------|-------------|
| **Random Forest** | High accuracy, robust to noise |
| **Decision Tree** | Fully interpretable rules |
| **Gaussian Naive Bayes** | Extremely fast baseline |
| **XGBoost** | Usually achieves the best F1 score |
| **MLP Neural Network** | Captures non-linear patterns |

**Evaluation per model:** Accuracy · Precision · Recall · F1 (weighted) · ROC-AUC · Confusion Matrix · Feature Importances

The model with the highest F1 score is auto-selected as the active prediction model.

---

## 🛠️ Full Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 6, TailwindCSS 4 |
| **Animation & Charts** | Framer Motion, Recharts, react-simple-maps |
| **Backend API** | FastAPI, Uvicorn |
| **ML & Data** | scikit-learn 1.3.2, XGBoost, numpy 1.26.4, scipy 1.11.4, pandas, joblib |
| **State management** | FastAPI `app.state` (in-process, single-worker) |

---

## 💡 What I Learnt Building This

### 1. Thread Safety on Windows Is Non-Trivial
scikit-learn uses OpenMP internally. On Windows, if `OMP_NUM_THREADS`, `MKL_NUM_THREADS`, and `OPENBLAS_NUM_THREADS` aren't **hard-assigned to `1`** before any numpy/sklearn import, you get random deadlocks or silent crashes. The key insight: `os.environ.setdefault()` does NOT override if the variable already exists — you must use `os.environ['OMP_NUM_THREADS'] = '1'` as the **very first lines** in the server file, before any other imports.

### 2. FastAPI `app.state` vs Global Variables
Storing ML models in a global dict works in development but breaks with multiple workers — each Uvicorn worker is a separate OS process with its own memory. Attaching state to `app.state` makes the design explicit: this data belongs to this application instance, lives for one process lifetime, and should never be shared across processes.

### 3. Virtual Environments Must Be Fully Isolated
Mixing pip environments (global, `--user`, conda, venv) causes silent version conflicts. The triangle of `numpy==1.26.4` + `scipy==1.11.4` + `scikit-learn==1.3.2` is a tested, stable combination on Windows. Install them pinned and in that order into a clean venv before anything else.

### 4. A One-Character Bug Hid Everything
`'http://localhost:8001'` vs `'http://localhost:8000'` in `api.js` caused every API call to fail with the unhelpful browser error "Failed to fetch". The frontend appeared to load fine — nothing in the Python logs showed any problem because no request ever reached the server. Lesson: always check the API base URL first when debugging network errors.

### 5. React State Must Be Reset Deliberately
UI "demo" components that oscillate random values look great until you click Reset — then they immediately show random non-zero values while the backend shows zeros. Any component with a fallback state timer must **explicitly reset to zero** when `simulation_active` goes false, and restart the oscillation only after a meaningful idle delay.

### 6. `--reload` Is Dangerous for Stateful Servers
Uvicorn's hot-reload is convenient for stateless APIs. For a stateful ML server, it's a trap: saving any source file restarts the worker and silently wipes all trained models from memory. The dashboard stays connected but every prediction call returns "No model trained". The fix is simple: never use `--reload` with this app.

---

## 🧩 Design Thought Process

**Why FastAPI over Flask?**
Async-first, built-in Pydantic validation, automatic OpenAPI docs at `/docs`, and better performance for concurrent requests. For a project that's both a learning tool and a real demo, readable auto-docs matter.

**Why not persist models to disk?**
For this project, the training-to-prediction loop *is* the experience. Persisting models adds complexity (file naming, versioning, load-on-startup logic) with no real learning benefit. Keeping models in `app.state` keeps the state fresh and consistent with what was just trained.

**Why 5 models instead of just the best?**
The comparison *is* the feature. Watching Random Forest vs XGBoost vs MLP side-by-side on identical data, with identical metrics, is what teaches model selection intuitively. The benchmark page is the core educational value of the dashboard.

**Why simulate packets from `X_test` instead of full random data?**
Real held-out test samples give statistically honest predictions (the model has never seen them). Purely random generated features would produce meaningless confidence scores. Sampling from `X_test` keeps the simulation grounded in real data distribution.

---

## ❓ Troubleshooting

| Problem | Fix |
|---------|-----|
| **"Failed to fetch"** on every page | Check `src/api.js` line 1: `const API = 'http://localhost:8000'` |
| **numpy import error** | `.\venv\Scripts\python.exe -m pip install numpy==1.26.4` |
| **Models lost after file edit** | Do not use `--reload`. Restart uvicorn manually |
| **"No model trained" error** | Click Train All Models in the dashboard first |
| **Port 8000 already in use** | `netstat -ano \| findstr ":8000"` then kill the PID |
| **sklearn deadlock / hang** | `os.environ['OMP_NUM_THREADS'] = '1'` must be at the top of `server.py` |
| **"Failed to fetch" after restart** | Retrain models — `app.state` is cleared on server restart |

---

<div align="center">

Built by **Soubhagya Jain** &nbsp;·&nbsp; React 19 + FastAPI + scikit-learn &nbsp;·&nbsp; 🛡️ CyberSentinel

</div>
