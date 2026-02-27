<div align="center">

<br>

# 🛡️ CyberSentinel

### AI-Powered Network Intrusion Detection System

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.25+-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3+-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-1.7+-006CB4?style=for-the-badge)](https://xgboost.readthedocs.io)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-00FF9F?style=for-the-badge)](LICENSE)

**A production-grade intrusion detection platform combining 5 ML models, real-time packet simulation, explainable AI, and dual dashboards (Streamlit SOC + modern React UI) — built for cybersecurity professionals, ML engineers, and researchers.**

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [Models](#-models) · [API Docs](#-api-reference) · [Deployment](#-deployment) · [Contributing](#-contributing)

</div>

---

## 🎯 Overview

CyberSentinel is an enterprise-level Security Operations Center (SOC) platform that uses machine learning to detect network intrusions in real time. It processes NetFlow data to classify traffic across multiple attack categories — and comes with **two fully functional dashboards**:

| Dashboard | Stack | Best For |
|:---|:---|:---|
| **Streamlit SOC** | Python · Streamlit · Plotly | Rapid prototyping, model training, one-click deployment |
| **React Command Center** | React 19 · Vite · FastAPI | Production-grade UI, live animations, team environments |

### What It Does

| Capability | Description |
|:---|:---|
| 🤖 **Multi-Model Training** | Train & compare 5 ML architectures (RF, DT, NB, XGBoost, MLP) on the same data split |
| 📡 **Real-Time Simulation** | Live packet stream with dynamic threat level assessment (LOW / MODERATE / HIGH) |
| 📈 **Model Benchmarking** | Side-by-side accuracy, F1, ROC-AUC, precision, recall, and training time charts |
| 🧠 **Explainable AI (XAI)** | Feature importance, local explanations, confidence gauges, auto-generated insights |
| 🌐 **Global Threat Map** | Geographic attack visualization with ASN ownership tracking |
| 🔴 **Dark Web Intelligence** | Threat severity rings and dark web exposure gauges |
| 🖥️ **System Health** | Real-time RAM/CPU monitoring with warning thresholds |
| 🐳 **Docker Ready** | One-command containerized deployment |

### Who It's For

- **Security Analysts** — Monitor simulated traffic, understand attack patterns, and assess threat levels
- **ML Engineers** — Benchmark classification models on real-world network intrusion datasets
- **Students & Researchers** — Learn cybersecurity ML with beginner-friendly XAI explanations
- **DevOps / SRE** — Deploy via Docker with built-in health checks and monitoring

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+** and **pip**
- **Node.js 18+** and **npm** *(for the React dashboard only)*
- ~2 GB RAM recommended

---

### Option A: Streamlit SOC Dashboard (Fastest)

```bash
# 1. Clone the repo
git clone https://github.com/Sam0064324314/CyberSentinel-SOC.git
cd CyberSentinel-SOC/IntrusionDetectionDashboard

# 2. Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Launch
streamlit run app.py
```

Dashboard opens at **http://localhost:8501** ✅

> **No dataset download required!** The app includes a built-in synthetic data generator. Pre-trained models are included — start exploring immediately.

---

### Option B: React + FastAPI Dashboard (Modern UI)

**Terminal 1 — Backend:**

```bash
cd CyberSentinel-SOC/cyber-dashboard/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install Python dependencies
pip install -r requirements.txt

# Start the API server
python -m uvicorn server:app --port 8000 --reload
```

API running at **http://localhost:8000** ✅

**Terminal 2 — Frontend:**

```bash
cd CyberSentinel-SOC/cyber-dashboard

# Install Node dependencies
npm install

# Start the dev server
npm run dev
```

React dashboard opens at **http://localhost:5173** ✅

---

### First Steps After Launch

1. **Sidebar → ⚡ TRAIN ALL MODELS** — Trains all 5 ML architectures
2. **📈 MODEL COMPARISON** — View benchmarks, auto-selects best model
3. **🚨 REAL-TIME OPS → ▶ START** — Launch live packet simulation
4. **🧠 INTELLIGENCE** — Explore model reasoning with XAI

---

### (Optional) Use the Full Dataset

For production-grade accuracy, download the [NF-UQ-NIDS](https://staff.itee.uq.edu.au/marius/NIDS_datasets/) dataset and place the CSV files in the **project root**:

```
CyberSentinel-SOC/
├── dataset-part1.csv              ← Place CSVs here
├── dataset-part2.csv
├── dataset-part3.csv
├── dataset-part4.csv
├── IntrusionDetectionDashboard/
└── cyber-dashboard/
```

The app will automatically detect and use real data when available.

---

## ✨ Features

### 📊 Overview Dashboard
- Live traffic counters synced with the simulation engine
- Attack rate (rolling 30-packet window)
- Unique IP tracking and traffic class distribution charts
- Dynamic threat level indicator (LOW / MODERATE / HIGH)
- Active model performance snapshot (accuracy, F1, ROC-AUC, train time)

### 🚨 Real-Time Operations
- **Live Packet Stream** — Color-coded severity log with confidence scores
- **Threat Intelligence Panel** — Dynamic threat gauge, session metrics, attack frequency
- **Simulation Controls** — Start / Stop / Reset with no UI flicker
- **Cross-Tab State Sync** — All tabs read from a single source of truth

### 📈 Model Comparison Engine
- **One-Click Benchmarking** — Train & evaluate all 5 models simultaneously
- **Auto-Best Selection** — Identifies highest F1 score automatically
- **Visual Comparison Charts** — Accuracy, F1 Score, ROC-AUC, training time
- **Summary Table** — All metrics with highlighted maxima
- **Per-Model Confusion Matrix** — Interactive dropdown selector

### 🧠 Intelligence Dashboard (XAI Engine)
- **Global Feature Importance** — Interactive bar chart with Plotly
- **Beginner Panel** — "What Is Feature Importance?" explainer for newcomers
- **Impact Scale Legend** — Dominant / Strong / Weak interpretation table
- **Auto-Generated Behavior Summary** — Narrative based on top-3 feature categories
- **Local Explanation** — Live prediction on random sample with:
  - Per-feature reasoning (timing, TCP, protocol, size categories)
  - Confidence gauge (HIGH / MODERATE / LOW)
  - Class probability distribution chart
- **Responsible AI** — Model limitation awareness and human-in-the-loop guidelines

### 🌐 React Dashboard Exclusive Components
- **Global Footprint Map** — Geographic attack origin visualization
- **ASN Ownership Tracker** — Autonomous System Number analysis
- **Dark Web Gauge** — Threat exposure indicator
- **Threat Severity Rings** — Visual attack type distribution
- **Live Traffic Chart** — Real-time animated traffic flow
- **Resource Monitor** — System health with RAM/CPU gauges

---

## 🏗️ Architecture

```
CyberSentinel-SOC/
│
├── README.md                         # ← You are here
├── train_model.py                    # Standalone ML training script
├── dataset-part*.csv                 # NF-UQ-NIDS data files (not in Git)
│
├── IntrusionDetectionDashboard/      # 🔵 STREAMLIT SOC APP
│   ├── app.py                        #    Main app (841 lines, single source of truth)
│   ├── config.py                     #    Centralized configuration
│   ├── requirements.txt              #    Python dependencies
│   ├── Dockerfile                    #    Production container
│   ├── assets/
│   │   └── style.css                 #    Enterprise dark theme
│   ├── utils/
│   │   ├── preprocessing.py          #    Data loading, scaling, splitting
│   │   ├── training.py               #    Model training (5 architectures)
│   │   ├── evaluation.py             #    Metrics, confusion matrix, ROC curves
│   │   ├── model_io.py               #    Model save/load (joblib)
│   │   ├── explainability.py         #    SHAP integration
│   │   └── logger.py                 #    Structured logging
│   ├── models/                       #    Saved model artifacts (.joblib)
│   └── logs/                         #    Application logs
│
└── cyber-dashboard/                  # 🟢 REACT + FASTAPI APP
    ├── package.json                  #    React 19, Vite 6, Framer Motion
    ├── vite.config.js                #    Vite + TailwindCSS v4 config
    ├── index.html                    #    Entry point
    ├── src/
    │   ├── App.jsx                   #    Main React app
    │   ├── api.js                    #    API client layer
    │   ├── main.jsx                  #    React DOM entry
    │   ├── index.css                 #    Global styles
    │   └── components/
    │       ├── TopBar.jsx            #    Navigation bar
    │       ├── Sidebar.jsx           #    Control panel
    │       ├── MetricCards.jsx       #    KPI metric cards
    │       ├── LiveTrafficChart.jsx  #    Real-time traffic visualization
    │       ├── RealTimeOps.jsx       #    Packet stream monitor
    │       ├── ModelSection.jsx      #    Model training controls
    │       ├── ModelCharts.jsx       #    Performance charts
    │       ├── ModelComparison.jsx   #    Benchmarking view
    │       ├── IntelligencePanel.jsx #    XAI explanations
    │       ├── GlobalFootprint.jsx   #    World threat map
    │       ├── ThreatSeverity.jsx    #    Severity ring charts
    │       ├── DarkWebGauge.jsx      #    Dark web exposure gauge
    │       ├── AsnOwnership.jsx      #    ASN analysis
    │       └── ResourceMonitor.jsx   #    System health panel
    └── backend/
        ├── server.py                 #    FastAPI REST API (286 lines)
        ├── requirements.txt          #    Python backend deps
        └── ml/
            ├── data.py               #    Data loading & preprocessing
            └── engine.py             #    ML training & inference engine
```

### Data Pipeline

```
Raw CSVs ──→ load_data() ──→ preprocess_data() ──→ split_data() ──→ train_model()
                │                    │                                    │
           Sampling            LabelEncoder                      Model + Metrics
           (configurable)      StandardScaler                     → Registry
```

### API Architecture (React Dashboard)

```
React Frontend (Vite)           FastAPI Backend
────────────────────           ─────────────────
     App.jsx          ←──→       /api/health
     api.js           ←──→       /api/train
     Components       ←──→       /api/models
                      ←──→       /api/predict
                      ←──→       /api/dashboard
                      ←──→       /api/system
                      ←──→       /api/set-active/{model}
                      ←──→       /api/simulation/reset
```

---

## 🤖 Models

### Supported Architectures

| Model | Type | Strengths | Trade-offs |
|:---|:---|:---|:---|
| **Random Forest** | Ensemble (Bagging) | Robust, interpretable, handles class imbalance | Higher memory usage |
| **Decision Tree** | Tree-based | Fastest training, fully interpretable | Prone to overfitting |
| **Gaussian NB** | Probabilistic | Ultra-fast, excellent baseline | Assumes feature independence |
| **XGBoost** | Ensemble (Boosting) | State-of-the-art accuracy | Slower training, complex tuning |
| **MLP** | Neural Network | Captures non-linear relationships | Slowest, less interpretable |

### Feature Set (15 Network Flow Features)

| Feature | Category | Description |
|:---|:---|:---|
| `DST_TOS` | Protocol | Destination Type of Service |
| `SRC_TOS` | Protocol | Source Type of Service |
| `TCP_WIN_SCALE_OUT` | TCP | Outbound window scale factor |
| `TCP_WIN_SCALE_IN` | TCP | Inbound window scale factor |
| `TCP_FLAGS` | TCP | TCP flag combination |
| `TCP_WIN_MAX_OUT` | TCP | Max outbound window size |
| `PROTOCOL` | Protocol | IP protocol number |
| `TCP_WIN_MIN_OUT` | TCP | Min outbound window size |
| `TCP_WIN_MIN_IN` | TCP | Min inbound window size |
| `TCP_WIN_MAX_IN` | TCP | Max inbound window size |
| `LAST_SWITCHED` | Timing | Last packet timestamp |
| `TCP_WIN_MSS_IN` | TCP | Maximum segment size (inbound) |
| `TOTAL_FLOWS_EXP` | Flow | Total exported flows |
| `FIRST_SWITCHED` | Timing | First packet timestamp |
| `FLOW_DURATION_MILLISECONDS` | Timing | Total flow duration |

### Threat Level Logic

```
attack_rate = attacks_in_last_30_packets / 30

if attack_rate > 0.20  → 🔴 HIGH
if attack_rate > 0.05  → 🟡 MODERATE
else                   → 🟢 LOW
```

### Benchmark Results

Typical results on NF-UQ-NIDS dataset (100K sample):

| Model | Accuracy | F1 Score | ROC-AUC | Train Time |
|:---|:---:|:---:|:---:|:---:|
| Random Forest | ~97% | ~96% | ~99% | ~5s |
| XGBoost | ~96% | ~95% | ~98% | ~8s |
| Decision Tree | ~95% | ~94% | ~93% | ~1s |
| MLP | ~93% | ~92% | ~97% | ~30s |
| Gaussian NB | ~65% | ~60% | ~85% | <1s |

> **Note:** Results vary based on sample size, class distribution, and hardware.

---

## 🔌 API Reference

The FastAPI backend exposes the following RESTful endpoints:

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Health check and model count |
| `POST` | `/api/train` | Train one or all models (body: `model_name`, `sample_size`) |
| `GET` | `/api/models` | List all trained models with metrics and feature importance |
| `POST` | `/api/set-active/{model_name}` | Switch the active model |
| `POST` | `/api/predict` | Simulate packet predictions (body: `count`) |
| `GET` | `/api/dashboard` | Aggregated dashboard statistics |
| `GET` | `/api/system` | System RAM/CPU metrics |
| `POST` | `/api/simulation/reset` | Reset all simulation state |

### Example Usage

```bash
# Train all models with 50K samples
curl -X POST http://localhost:8000/api/train \
  -H "Content-Type: application/json" \
  -d '{"sample_size": 50000}'

# Simulate 10 packet predictions
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'

# Get model metrics
curl http://localhost:8000/api/models
```

---

## 🐳 Deployment

### Docker (Streamlit)

```bash
cd IntrusionDetectionDashboard

# Build
docker build -t cybersentinel .

# Run
docker run -p 8501:8501 cybersentinel
```

Access at **http://localhost:8501**

### Docker Compose

```yaml
version: '3.8'
services:
  cybersentinel:
    build: ./IntrusionDetectionDashboard
    ports:
      - "8501:8501"
    volumes:
      - ./:/app/data           # Mount dataset directory
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8501/_stcore/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Streamlit Cloud

1. Push to GitHub
2. Connect at [share.streamlit.io](https://share.streamlit.io)
3. Set main file path to `IntrusionDetectionDashboard/app.py`

---

## ⚙️ Configuration

All settings are centralized in `IntrusionDetectionDashboard/config.py`:

| Parameter | Default | Description |
|:---|:---|:---|
| `SAMPLE_SIZE` | 100,000 | Default training sample size |
| `MAX_SAMPLE_SIZE` | 500,000 | Maximum allowed via UI slider |
| `SHAP_SAMPLE_SIZE` | 100 | Samples for SHAP computation |
| `RAM_WARNING_THRESHOLD` | 80% | RAM usage warning trigger |
| `TEST_SIZE` | 0.3 | Train/test split ratio |
| `RANDOM_STATE` | 42 | Reproducibility seed |
| `THEME_COLOR` | `#00FF9F` | Primary accent color |
| `BG_COLOR` | `#0E1117` | Dashboard background color |

---

## 📁 Dataset

This project uses the **NF-UQ-NIDS** (NetFlow University of Queensland Network Intrusion Detection System) dataset.

> 💡 **The app works out of the box with synthetic data.** Download the real dataset only for production-grade accuracy.

### Download Links

| Source | Link | Size |
|:---|:---|:---|
| **Kaggle** (Recommended) | [NF-UQ-NIDS-v2 on Kaggle](https://www.kaggle.com/datasets/dhoogla/nf-uq-nids-v2) | ~13.7 GB |
| **UQ Official** | [UQ Cyber Research Centre](https://staff.itee.uq.edu.au/marius/NIDS_datasets/) | ~10 GB (4 CSVs) |

### Dataset Details

| Property | Value |
|:---|:---|
| **Format** | CSV with NetFlow v9 features |
| **Total Records** | ~12M flows (V1) / ~76M flows (V2) |
| **Attack Classes** | Normal, DoS, DDoS, Reconnaissance, Theft, and more |
| **Features Used** | 15 selected TCP/IP and timing attributes |

---

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend (Modern)** | React 19, Vite 6, TailwindCSS 4, Framer Motion, Recharts |
| **Frontend (Classic)** | Streamlit, Plotly, Custom CSS |
| **Backend API** | FastAPI, Uvicorn, Pydantic |
| **ML Framework** | scikit-learn, XGBoost |
| **Explainability** | SHAP, Feature Importance |
| **Data Processing** | Pandas, NumPy |
| **System Monitoring** | psutil (RAM/CPU) |
| **Model Persistence** | joblib |
| **Visualization** | Plotly, Recharts, react-simple-maps |
| **Containerization** | Docker (Python 3.9-slim) |
| **Logging** | Python logging module |

---

## 🧪 Development

### Running Locally

```bash
# Clone
git clone https://github.com/Sam0064324314/CyberSentinel-SOC.git
cd CyberSentinel-SOC

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install all Python dependencies
pip install -r IntrusionDetectionDashboard/requirements.txt
pip install -r cyber-dashboard/backend/requirements.txt

# Launch Streamlit dashboard
cd IntrusionDetectionDashboard
streamlit run app.py
```

### Standalone Model Training Script

For training models outside the dashboard (CLI / notebook workflows):

```bash
python train_model.py
```

This script:
- Loads all 4 CSV data parts with configurable sampling (default: 30%)
- Applies memory-optimized dtypes (`float32`, `int32`)
- Trains Random Forest, Decision Tree, and Gaussian NB
- Reports accuracy, F1, precision, and recall for each

### Project Standards

- **State Management** — Single source of truth via `st.session_state` (Streamlit) / in-memory dict (FastAPI)
- **No Global Variables** — All state is scoped to session or request lifecycle
- **Memory Safety** — Rolling windows (max 30), log trimming (max 50), configurable sampling
- **No Blocking Loops** — `st.rerun()` for controlled re-execution
- **Auto-Reset** — Model switching resets simulation state to prevent data contamination

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Areas for Contribution

- [ ] Deep learning models (CNN, LSTM on raw packet data)
- [ ] Real network interface capture (pcap integration)
- [ ] Multi-user authentication and role-based access
- [ ] Alerting system (email/Slack/webhook notifications)
- [ ] Historical trend analysis and reporting
- [ ] MITRE ATT&CK framework mapping
- [ ] Kubernetes deployment manifests
- [ ] CI/CD pipeline with automated model testing

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with 🛡️ by Security Engineers, for Security Engineers**

CyberSentinel v3.0 · Multi-Model SOC · Dual Dashboard Platform · © 2026

⭐ **Star this repo if you find it useful!** ⭐

</div>
