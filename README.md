<div align="center">

# 🛡️ CyberSentinel AI
### Real-Time Network Intrusion Detection + Explainable SOC Dashboard  
**React Dashboard + FastAPI Inference API + Streamlit SOC Console — fully Dockerized** 🐳🚀

✅ **Live Demo (Vercel):** https://cyber-sentinel-ai-ten.vercel.app/

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io/)

</div>

---

## Why this exists 🎯
Most ML security projects stop at a notebook. Real SOC workflows need:

- **Fast detection** (latency matters)
- **Benchmarking across models** (accuracy vs speed tradeoffs)
- **Explainability** (why was this flagged?)
- **A usable UI** for both executives (dashboard) and analysts (SOC console)

CyberSentinel is built like a production-style system: **API + UI + monitoring-style views + Docker**.

---

## What you get ✅
- **Multi-model training + evaluation** (5 models) with side-by-side comparison
- **Auto-promotion**: pick the best model using **Weighted F1**
- **Low-latency inference** with practical latency tradeoffs
- **Explainability** (SOC console diagnostics, SHAP-style insights where applicable)
- **Full-stack UI**:
  - 📊 **React Dashboard** (telemetry + threat visualization)
  - 🧑‍💻 **Streamlit SOC Console** (analyst diagnostics)
- **Docker Compose**: run everything with one command
- **Nginx reverse proxy**: `/api/* → backend` (no CORS headaches)

---

## Proof: Resume-grade metrics 📊

### Model benchmarking (from the dashboard “Model Comparison”)
| Model | F1 (%) | Accuracy (%) | Precision (%) | Train Time (s) |
|------|--------:|-------------:|--------------:|---------------:|
| Random Forest | 71.2 | 73.7 | 71.3 | 3.60 |
| XGBoost | 68.5 | 75.1 | 71.3 | 1.21 |
| MLP | 70.6 | 71.2 | 70.6 | 28.52 |
| Gaussian NB | 67.7 | 72.3 | 70.6 | 0.05 |
| Decision Tree | 70.7 | 70.5 | 70.8 | 0.46 |

### Inference latency tradeoffs (deployment signal)
| Model | Inference latency (approx.) |
|------|------------------------------|
| Random Forest | ~1–3 ms / batch |
| Decision Tree | <0.5 ms |
| Gaussian NB | <0.1 ms |

**Why this matters:** it shows you measured **both accuracy and runtime**, which is what production teams care about.

---

## Architecture (quick view) 🧩
**User Interfaces**
- React Dashboard (executive view)
- Streamlit SOC Console (analyst view)

**Edge / Routing**
- Nginx serves the dashboard and proxies `/api/*` to the backend

**Core**
- FastAPI inference API
- Model registry + selection (Weighted F1 auto-promotion)
- In-memory threat aggregation for fast UI refresh

📌 For the full architectural breakdown, see **ARCHITECTURE.md** (deep dive).

---

## Run locally (2 minutes) 🐳

> ⚠️ `localhost` links work only after you run Docker locally.

### 1) Start (demo / prod-like)
```bash
git clone https://github.com/SoubhagyaJain/Cyber-system.git
cd Cyber-system
docker compose up --build -d
```

### 2) Access
| Service | URL |
|---|---|
| React Dashboard | http://localhost:3000 |
| FastAPI Docs | http://localhost:8000/docs |
| Streamlit SOC Console | http://localhost:8501 |

### 3) Verify health
```bash
docker compose ps
curl -i http://localhost:8000/api/health
curl -i http://localhost:3000/api/health
```

### 4) Stop
```bash
docker compose down
```

---

## Development mode (hot reload) ⚡
```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Typical dev ports:
- React (Vite): http://localhost:5173
- FastAPI: http://localhost:8000
- Streamlit: http://localhost:8501

---

## Repository structure 📁
```txt
.
├── cyber-dashboard/               # React dashboard (Nginx in prod)
├── backend/ (or cyber-dashboard/backend/)  # FastAPI inference API
├── IntrusionDetectionDashboard/   # Streamlit SOC console
├── docker-compose.yml             # prod/demo stack
├── docker-compose.dev.yml         # dev hot reload stack
├── Makefile                       # shortcuts (up/dev/logs/down/clean)
├── ARCHITECTURE.md                # deep architecture reference
└── README.md
```

---

## Large assets policy (important) 🧯
This repo intentionally does **not** store multi-GB datasets or large binary artifacts in Git.

- Datasets (`*.csv`, etc.) are **gitignored**
- Model artifacts (`*.joblib`, `*.pkl`) are **gitignored**
- Docker uses **synthetic / fallback data** so the demo runs out-of-the-box

This keeps the repo clone fast and avoids GitHub size limits.

---

## Troubleshooting 🧰

### “localhost link shows error”
You must run Docker first:
```bash
docker compose up --build -d
```

### Port already in use (3000/8000/8501)
Stop the service using the port or change the port mappings in `docker-compose.yml`.

### Service unhealthy / not starting
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f streamlit
```

### Force rebuild
```bash
docker compose down
docker compose up --build --force-recreate -d
```

---

## Skills demonstrated (recruiter keywords) 🧠
- ML evaluation: **F1 / precision / accuracy**, benchmarking, model selection
- Performance: **latency-aware inference**, tradeoff analysis
- System design: API ↔ UI separation, modular components
- Backend: **FastAPI**, healthchecks, service boundaries
- Frontend: **React dashboard**, telemetry-style UI
- MLOps-lite: model registry/selection, reproducible execution with Docker
- DevOps: **Docker, Compose, Nginx reverse proxy**, release-style runbook

---

## Contact 📬
- GitHub: https://github.com/SoubhagyaJain  
- Live Demo: https://cyber-sentinel-ai-ten.vercel.app/
