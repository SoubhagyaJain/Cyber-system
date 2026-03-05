<div align="center">

# 🛡️ CyberSentinel AI

**Real-Time Network Intrusion Detection & AI-Powered SOC Dashboard**

*5 ML models trained concurrently, auto-promoted by F1, explained in plain English — run with one command.*

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## Why This Exists

Enterprise SOCs face three recurring failures:

- **Black-box alerts** — ML flags a packet but can't explain *why*, causing analyst fatigue and eroded trust.
- **Single-model fragility** — One model overfits or misses novel vectors. No benchmark, no fallback.
- **"Works on my machine"** — Demo environments require 5 manual setup steps. Recruiters and reviewers give up.

CyberSentinel solves all three: multi-model benchmarking with XAI explanations, packaged in a one-command Docker stack.

---

## What I Built

| Capability | Implementation |
|:---|:---|
| **5-Model Concurrent Training** | Random Forest, Decision Tree, Gaussian NB, XGBoost, MLP — all evaluated on 6 metrics |
| **Dynamic Model Promotion** | Best-F1 model auto-promoted to live inference. Manual override available. |
| **Explainable AI Engine** | Feature importance + intelligent category detection → human-readable explanations per packet |
| **React SOC Dashboard** | 14-component reactive UI with live telemetry, severity rings, attack geo-maps |
| **Streamlit Analyst Console** | 841-line, 5-tab analytical dashboard with SHAP, confusion matrices, ROC curves |
| **Nginx Reverse Proxy** | Frontend `:3000` proxies `/api/*` → backend container. Zero CORS. Zero env-var wiring. |
| **Synthetic Data Fallback** | No datasets needed — system auto-generates realistic attack distributions (60/15/10/10/5%) |
| **Docker Healthchecks** | All 3 services monitored. Frontend waits for backend to be healthy before starting. |

---

## Proof — Model Benchmarks

> Evaluated on 100,000 synthetic network flow samples (15 TCP/IP features, 5 attack classes).

| Model | Accuracy | Precision | Recall | F1 (Weighted) | ROC-AUC | Train Time |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Random Forest** | ~95%+ | ~95%+ | ~95%+ | ~95%+ | ~0.99 | ~2–4s |
| **Decision Tree** | ~93%+ | ~93%+ | ~93%+ | ~93%+ | ~0.96 | <0.5s |
| **Gaussian NB** | ~70%+ | ~75%+ | ~70%+ | ~68%+ | ~0.90 | <0.1s |
| **XGBoost** | ~94%+ | ~94%+ | ~94%+ | ~94%+ | ~0.99 | ~1–3s |
| **MLP** | ~92%+ | ~92%+ | ~92%+ | ~92%+ | ~0.98 | ~3–8s |

**Selection logic:** Best Weighted-F1 is auto-promoted. RF and XGBoost consistently dominate. Gaussian NB trades accuracy for sub-millisecond inference.

> *Exact metrics vary per run. Train the models yourself with `docker compose up` → click "Train All" in the dashboard.*

---

## Architecture

```
Browser ──→ Nginx (:3000) ──→ /api/* ──→ FastAPI (:8000) ──→ ML Engine
                │                              │
                │                              ├── 5 Models (RF/DT/NB/XGB/MLP)
                │                              ├── In-Memory Threat State
                │                              └── Synthetic Data Generator
                │
                └── Static React SPA (14 components, Recharts, Framer Motion)

Browser ──→ Streamlit (:8501) ──→ Direct Python ML (5 tabs, SHAP, Plotly)
```

**Key design decisions:**
- **Nginx reverse-proxy** eliminates CORS entirely — browser hits same origin, nginx forwards `/api/*`
- **Synthetic fallback** means the system runs anywhere without private datasets
- **In-memory state** keeps latency sub-5ms per prediction batch (no database round-trips)

---

## 🐳 Run Locally (2 Minutes)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.0+

### Start

```bash
git clone https://github.com/SoubhagyaJain/Cyber-system.git
cd Cyber-system
docker compose up --build -d
```

### Access

| Service | URL | What You See |
|:---|:---|:---|
| **React Dashboard** | [http://localhost:3000](http://localhost:3000) | Attack Surface Dashboard with live telemetry |
| **FastAPI Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger API explorer |
| **Streamlit Console** | [http://localhost:8501](http://localhost:8501) | Analyst SOC with SHAP + model comparison |

### Verify

```bash
docker compose ps                              # All 3 services: (healthy)
curl http://localhost:8000/api/health           # {"status":"ok","models_loaded":0}
curl http://localhost:3000/api/health           # Same — proves Nginx proxy works
```

### Stop

```bash
docker compose down
```

---

## 🔧 Development Mode (Hot Reload)

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

| Service | URL | Hot Reload |
|:---|:---|:---|
| Vite Dev Server | [http://localhost:5173](http://localhost:5173) | ✅ HMR on save |
| FastAPI | [http://localhost:8000](http://localhost:8000) | ✅ Uvicorn `--reload` |
| Streamlit | [http://localhost:8501](http://localhost:8501) | ✅ Auto-rerun |

```bash
# Useful commands
docker compose logs -f backend          # Tail backend logs
docker compose up --build -d --no-deps backend   # Rebuild one service
docker compose -f docker-compose.dev.yml down     # Stop dev
```

---

## Repository Structure

```
Cyber-system/
├── cyber-dashboard/                    # React + FastAPI full-stack app
│   ├── Dockerfile                      # 3-stage: Node → Vite build → Nginx (~30MB)
│   ├── nginx.conf                      # SPA routing + /api/* reverse proxy
│   ├── src/                            # React 18 + TailwindCSS + Framer Motion
│   │   ├── components/                 # 14 UI components (ModelSection, LiveTraffic, etc.)
│   │   └── api.js                      # API client (env-based URL)
│   └── backend/
│       ├── Dockerfile                  # Multi-stage Python 3.11 + healthcheck
│       ├── server.py                   # FastAPI: 9 endpoints, in-memory state
│       └── ml/                         # data.py (3-tier loader) + engine.py (5 models)
│
├── IntrusionDetectionDashboard/        # Streamlit SOC Console (841 lines, 5 tabs)
│   ├── Dockerfile                      # Python 3.11 + Streamlit
│   ├── app.py                          # Overview, Real-Time Ops, Model Comparison, XAI, Resources
│   └── utils/                          # preprocessing, training, evaluation, explainability
│
├── docker-compose.yml                  # Production (Nginx + FastAPI + Streamlit)
├── docker-compose.dev.yml              # Development (hot-reload all services)
├── Makefile                            # make up/down/dev/logs/clean
├── .dockerignore                       # Excludes datasets, venvs, node_modules
└── data_server.py                      # Optional: stream large CSVs via ngrok
```

---

## Configuration

```bash
cp .env.docker .env                     # Root env template
```

| Variable | Default | Description |
|:---|:---|:---|
| `VITE_API_BASE` | *(empty)* | Empty in Docker (nginx proxies). Set for direct access. |
| `DATA_SOURCE_URL` | *(empty)* | Optional remote dataset server URL |
| `OMP_NUM_THREADS` | `1` | Thread safety for sklearn/xgboost |

> **No large datasets in this repo.** The system uses synthetic data by default. To train on real data, use `data_server.py` with ngrok.

---

## API Reference

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Liveness probe + loaded model count |
| `POST` | `/api/train` | Train one/all models. Body: `{model_name?, sample_size}` |
| `GET` | `/api/models` | Model registry with metrics + feature importance |
| `POST` | `/api/predict` | Simulate N packet predictions. Body: `{count}` |
| `POST` | `/api/set-active/{name}` | Override active model |
| `GET` | `/api/dashboard` | Aggregated stats: packets, threats, model info |
| `GET` | `/api/system` | Live RAM/CPU metrics |
| `POST` | `/api/simulation/reset` | Reset all simulation state |

Full Swagger docs at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## Troubleshooting

| Issue | Fix |
|:---|:---|
| Port conflict (3000/8000/8501) | Change host ports in `docker-compose.yml` |
| Frontend blank page | Backend not ready yet. Check: `docker compose ps` |
| Healthcheck failing | `docker compose logs backend` — look for import errors |
| Stale build | `docker compose build --no-cache` |
| High memory during training | Reduce `sample_size` in the Train request (default: 100k) |

---

## Skills Demonstrated

| Category | Details |
|:---|:---|
| **Machine Learning** | Multi-model training, evaluation (6 metrics), auto-selection, confusion matrices, ROC-AUC |
| **Explainable AI** | Feature importance, SHAP values, intelligent category detection, human-readable narratives |
| **System Design** | 3-service architecture, reverse proxy, in-memory state, synthetic data fallback |
| **Docker / DevOps** | Multi-stage builds, Compose v2, healthchecks, layer caching, `.dockerignore`, Makefile |
| **Backend (FastAPI)** | REST API, Pydantic models, CORS middleware, `/docs` auto-generation, state management |
| **Frontend (React)** | 14-component SPA, Recharts live charts, Framer Motion animations, TailwindCSS, Vite HMR |
| **Data Engineering** | 3-tier data loading, chunked CSV streaming, memory-safe downcasting, global caching |

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built by [Soubhagya Jain](https://github.com/SoubhagyaJain)**

*Securing the zero-trust network layer, one packet vector at a time.*

</div>
