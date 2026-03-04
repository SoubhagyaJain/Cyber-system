<div align="center">

# 🏗️ CyberSentinel AI — Architecture Deep Dive

**A comprehensive architectural reference for the CyberDashboard system**

</div>

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Topology](#system-topology)
3. [Layer-by-Layer Breakdown](#layer-by-layer-breakdown)
   - [Layer 0 — Data Edge](#layer-0--data-edge-local-laptop)
   - [Layer 1 — Data Ingestion & Preprocessing](#layer-1--data-ingestion--preprocessing)
   - [Layer 2 — ML Engine](#layer-2--ml-engine)
   - [Layer 3 — API Gateway](#layer-3--api-gateway-fastapi)
   - [Layer 4A — React Dashboard](#layer-4a--react-dashboard-vite)
   - [Layer 4B — Streamlit SOC Console](#layer-4b--streamlit-soc-console)
4. [Data Flow Architecture](#data-flow-architecture)
5. [State Management Architecture](#state-management-architecture)
6. [ML Training Pipeline Architecture](#ml-training-pipeline-architecture)
7. [Real-Time Inference Architecture](#real-time-inference-architecture)
8. [Explainable AI (XAI) Architecture](#explainable-ai-xai-architecture)
9. [Component Dependency Graph](#component-dependency-graph)
10. [Security Architecture](#security-architecture)
11. [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

CyberSentinel AI follows a **multi-tier, event-driven architecture** with clear separation of concerns across five distinct layers. The system is designed around a central FastAPI inference server that sits between a flexible data ingestion layer and two independent frontend consumers.

```
┌──────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER                         │
│   ┌─────────────────────┐      ┌──────────────────────────────┐  │
│   │  React + Vite (SPA) │      │  Streamlit SOC Console       │  │
│   │  14 Components      │      │  5 Tabs · 841 Lines          │  │
│   │  Context API State  │      │  Session State + Cache        │  │
│   └────────┬────────────┘      └──────────────┬───────────────┘  │
│            │ REST Polling (2s)                 │ Direct Import    │
├────────────┼──────────────────────────────────┼──────────────────┤
│            ▼                                  │                  │
│   ┌────────────────────────────┐              │                  │
│   │  FastAPI Gateway (API)     │◄─────────────┘                  │
│   │  9 REST Endpoints          │        APPLICATION TIER         │
│   │  In-Memory app.state       │                                 │
│   └──────────┬─────────────────┘                                 │
│              │                                                   │
│   ┌──────────▼─────────────────┐                                 │
│   │  ML Engine Layer           │                                 │
│   │  data.py · engine.py       │                                 │
│   │  5 Model Architectures     │                                 │
│   └──────────┬─────────────────┘                                 │
├──────────────┼───────────────────────────────────────────────────┤
│              ▼                          DATA TIER                │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │  3-Tier Data Loading Priority                              │ │
│   │  1. Local CSV  →  2. Remote Laptop Server  →  3. Synthetic │ │
│   └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Core Architectural Principles

| Principle | Implementation |
| :--- | :--- |
| **Separation of Concerns** | Data loading, ML training, API serving, and presentation are isolated into distinct modules |
| **Graceful Degradation** | 3-tier data fallback ensures the system always operates, even with zero external data |
| **Stateless Inference** | Each `/api/predict` call is stateless; simulation state is accumulated server-side but never required for prediction |
| **Dual-Consumer Pattern** | Two completely independent frontends (React + Streamlit) consume the same ML models, enabling different user personas |
| **Thread Safety by Design** | OpenMP/BLAS thread locks (`OMP_NUM_THREADS=1`) are set at import time, preventing deadlocks before any scikit-learn import |

---

## System Topology

```mermaid
graph TB
    subgraph EDGE ["🖥️ Local Data Edge (Laptop)"]
        CSV["10GB+ CSV Datasets<br/>dataset-part1..4.csv"]
        DS["data_server.py<br/>Port 7860"]
        CSV -->|"Chunked Read<br/>csv.DictReader"| DS
    end

    subgraph CLOUD ["☁️ Cloud Inference Layer (Render)"]
        direction TB
        API["FastAPI Gateway<br/>server.py · 345 lines<br/>9 REST Endpoints"]

        subgraph ML_CORE ["ML Engine"]
            DATA["ml/data.py<br/>Data Loading + Preprocessing"]
            ENGINE["ml/engine.py<br/>Training + Evaluation + Simulation"]
        end

        STATE["app.state<br/>In-Memory Threat State"]

        API <-->|"Train / Predict"| ML_CORE
        API <-->|"Read / Write"| STATE
    end

    subgraph REACT_FE ["⚛️ React Dashboard (Vercel)"]
        APIJS["api.js Client Wrapper"]
        APP["App.jsx<br/>DashboardContext Provider"]
        COMPS["14 UI Components<br/>Recharts · Framer Motion<br/>react-simple-maps"]
        APIJS --> APP --> COMPS
    end

    subgraph STREAMLIT_FE ["📊 Streamlit SOC Console"]
        STAPP["app.py · 841 lines<br/>5 Operational Tabs"]
        UTILS["utils/<br/>preprocessing · training<br/>evaluation · explainability<br/>model_io · logger"]
        STAPP --> UTILS
    end

    DS -->|"HTTPS via Ngrok<br/>Bearer Token Auth"| API
    API -->|"REST JSON<br/>2s Polling"| APIJS
    ML_CORE -.->|"Direct Python Import<br/>Shared models/ dir"| STAPP
```

---

## Layer-by-Layer Breakdown

### Layer 0 — Data Edge (Local Laptop)

**File**: `data_server.py` (212 lines)

The Data Edge is a **lightweight HTTP server** that runs on the developer's local machine, serving large CSV datasets to the cloud-hosted backend through an Ngrok tunnel.

```mermaid
flowchart LR
    subgraph LAPTOP ["Developer Laptop"]
        F1["dataset-part1.csv<br/>~870 MB"]
        F2["dataset-part2.csv<br/>~2.7 GB"]
        F3["dataset-part3.csv<br/>~327 MB"]
        F4["dataset-part4.csv<br/>~6.0 GB"]

        SERVER["DataHandler<br/>(BaseHTTPRequestHandler)"]

        F1 & F2 & F3 & F4 -->|csv.DictReader| SERVER
    end

    NGROK["Ngrok Tunnel<br/>HTTPS"]
    SERVER -->|"Port 7860"| NGROK

    subgraph CLOUD ["Cloud Backend"]
        BACKEND["_fetch_from_laptop()<br/>urllib.request"]
    end

    NGROK -->|"GET /data?sample_size=N<br/>Authorization: Bearer TOKEN"| BACKEND
```

**Architectural Details:**

| Component | Detail |
| :--- | :--- |
| **Server Type** | `http.server.BaseHTTPRequestHandler` (stdlib, zero dependencies) |
| **Endpoints** | `GET /health` (public), `GET /data` (auth required), `GET /info` (auth required) |
| **Auth** | Bearer token validation via `Authorization` header against `DATA_SECRET` env var |
| **Data Strategy** | Interleaved sampling: reads `sample_size / num_files` rows from each CSV, combines via `itertools.chain` |
| **Column Filter** | Only 15 selected TCP/IP features + LABEL are extracted (not full CSV) |
| **Memory Safety** | Streaming via `csv.DictReader` avoids loading entire 10GB+ datasets into RAM |

---

### Layer 1 — Data Ingestion & Preprocessing

**File**: `cyber-dashboard/backend/ml/data.py` (200 lines)

The data layer implements a **3-tier priority loading system** with global caching to prevent redundant downloads during multi-model training.

```mermaid
flowchart TD
    START["load_data(data_dir, sample_size)"] --> CACHE{"Global Cache<br/>_cached_df exists?"}

    CACHE -->|"Hit (same sample_size)"| RETURN_COPY["Return df.copy()<br/>Zero I/O"]
    CACHE -->|"Miss"| P1

    P1{"Priority 1:<br/>Local CSV files?"}
    P1 -->|"Found"| READ_CSV["pd.read_csv()<br/>usecols=SELECTED_COLUMNS<br/>nrows=sample_size*2"]
    READ_CSV --> SAMPLE["df.sample(n=sample_size/num_files)"]
    SAMPLE --> CONCAT["pd.concat() + drop_duplicates"]
    CONCAT --> CACHE_SET["Cache DataFrame"]

    P1 -->|"Not Found"| P2{"Priority 2:<br/>DATA_SOURCE_URL set?"}
    P2 -->|"Yes"| FETCH["_fetch_from_laptop()<br/>urllib.request + Bearer Auth"]
    FETCH -->|"Success"| CACHE_SET
    FETCH -->|"Failure"| P3

    P2 -->|"No"| P3["Priority 3:<br/>generate_synthetic_data()"]
    P3 --> SYNTH["Synthetic Data<br/>5 Classes · Weighted Distribution<br/>60% Normal · 15% DoS<br/>10% DDoS · 10% Recon · 5% Theft"]
    SYNTH --> CACHE_SET

    CACHE_SET --> RETURN["Return DataFrame"]
```

**Preprocessing Pipeline** (`preprocess_data()`):

```mermaid
flowchart LR
    RAW["Raw DataFrame"] --> SPLIT_XY["Split X / y<br/>(drop LABEL)"]
    SPLIT_XY --> IMPUTE["SimpleImputer<br/>strategy='mean'<br/>Handle NaN/missing"]
    IMPUTE --> ENCODE_CAT["LabelEncoder<br/>Categorical → Numeric"]
    ENCODE_CAT --> ENCODE_TARGET["LabelEncoder<br/>Target: LABEL → int"]
    ENCODE_TARGET --> SCALE["StandardScaler<br/>μ=0, σ=1 Normalization"]
    SCALE --> OUTPUT["X_scaled, y_encoded<br/>le_target, scaler<br/>feature_names"]
```

**Feature Vector Architecture:**

The system uses **15 carefully selected TCP/IP features** that span four categories:

| Category | Features | Rationale |
| :--- | :--- | :--- |
| **TCP Window** | `TCP_WIN_SCALE_OUT`, `TCP_WIN_SCALE_IN`, `TCP_WIN_MAX_OUT`, `TCP_WIN_MIN_OUT`, `TCP_WIN_MIN_IN`, `TCP_WIN_MAX_IN`, `TCP_WIN_MSS_IN` | Window scaling anomalies indicate SYN flood, buffer overflow, and resource exhaustion attacks |
| **Protocol Metadata** | `PROTOCOL`, `TCP_FLAGS`, `DST_TOS`, `SRC_TOS` | Protocol violations and abnormal flag combinations (e.g., SYN+FIN) reveal scanning and spoofing |
| **Timing** | `FIRST_SWITCHED`, `LAST_SWITCHED`, `FLOW_DURATION_MILLISECONDS` | Short-duration, high-frequency flows indicate DDoS; long-duration low-traffic flows indicate Slowloris |
| **Flow Statistics** | `TOTAL_FLOWS_EXP` | Exported flow count anomalies signal data exfiltration |

**Memory Optimization:**

```
float64 → float32    (50% memory reduction per float column)
int64   → int32      (50% memory reduction per int column)
Global DataFrame Cache prevents re-download during sequential training
```

---

### Layer 2 — ML Engine

**File**: `cyber-dashboard/backend/ml/engine.py` (144 lines)

The ML Engine is a **stateless, factory-pattern module** that handles model creation, training, evaluation, and real-time packet simulation.

```mermaid
graph TD
    subgraph FACTORY ["Model Factory (_create_model)"]
        RF["Random Forest<br/>n_estimators=50<br/>n_jobs=-1"]
        DT["Decision Tree<br/>criterion='gini'"]
        NB["Gaussian NB<br/>(parameter-free)"]
        XGB["XGBoost<br/>n_estimators=50<br/>learning_rate=0.1<br/>max_depth=3"]
        MLP["MLP Neural Net<br/>hidden_layers=(100,)<br/>activation='relu'<br/>max_iter=200"]
    end

    subgraph TRAIN ["Training (train_single)"]
        CREATE["_create_model(name)"] --> FIT["model.fit(X_train, y_train)"]
        FIT --> TIME["Return: model, training_time"]
    end

    subgraph EVAL ["Evaluation (evaluate)"]
        PREDICT["model.predict(X_test)"]
        PROBA["model.predict_proba(X_test)"]
        METRICS["6 Metrics:<br/>Accuracy · Precision · Recall<br/>F1 (Weighted) · ROC-AUC<br/>Confusion Matrix"]
        PREDICT --> METRICS
        PROBA --> METRICS
    end

    subgraph SIM ["Simulation (simulate_packet)"]
        SAMPLE["Random X_test sample"]
        INFER["predict_proba()"]
        PKT["Packet Object:<br/>src_ip · protocol · label<br/>confidence · is_attack<br/>probabilities{}"]
        SAMPLE --> INFER --> PKT
    end

    FACTORY --> TRAIN --> EVAL
    EVAL -.-> SIM
```

**Model Auto-Selection Algorithm:**

```python
# In server.py — after all models are trained:
best = max(
    app.state.models,
    key=lambda k: app.state.models[k]["metrics"].get("f1", 0)
)
# The model with the highest Weighted F1-Score is auto-promoted
# to handle all live /api/predict traffic
```

The auto-selection uses **Weighted F1-Score** as the ranking metric because:
- **Accuracy** is misleading under class imbalance (60% Normal traffic inflates it)
- **Recall** alone would favor models that flag everything as an attack
- **F1-Score** balances precision and recall; **weighted** variant adjusts for class distribution

---

### Layer 3 — API Gateway (FastAPI)

**File**: `cyber-dashboard/backend/server.py` (345 lines)

The API Gateway is a **FastAPI application** that manages model lifecycle, simulation state, and exposes REST endpoints for both frontends.

```mermaid
graph LR
    subgraph ENDPOINTS ["9 REST Endpoints"]
        direction TB
        H["GET /api/health"]
        T["POST /api/train"]
        M["GET /api/models"]
        SA["POST /api/set-active/{name}"]
        P["POST /api/predict"]
        D["GET /api/dashboard"]
        S["GET /api/system"]
        SR["POST /api/simulation/reset"]
        MR["POST /api/models/reset"]
    end

    subgraph STATE ["app.state (In-Memory)"]
        direction TB
        MODELS["models{}<br/>Model Registry"]
        ACTIVE["active_model<br/>active_model_name"]
        TEST["X_test, y_test<br/>classes[], feature_names[]"]
        SIM["Simulation State<br/>total_packets · blocked_packets<br/>attack_history[] · packet_log[]<br/>unique_ips{} · threat_level<br/>attack_type_counts{}"]
    end

    T -->|"Write"| MODELS
    T -->|"Write"| ACTIVE
    T -->|"Write"| TEST
    P -->|"Read"| ACTIVE
    P -->|"Read/Write"| SIM
    D -->|"Read"| MODELS
    D -->|"Read"| SIM
    SA -->|"Write"| ACTIVE
    SA -->|"Reset"| SIM
    SR -->|"Reset"| SIM
    MR -->|"Clear"| MODELS
    MR -->|"Reset"| SIM
```

**Endpoint Architecture:**

| Endpoint | Method | Input | Output | Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | GET | — | `{status, models_loaded}` | None (liveness probe) |
| `/api/train` | POST | `{model_name?, sample_size}` | `{results, classes, active_model, best_model}` | Loads data, trains models, updates registry, resets simulation |
| `/api/models` | GET | — | `{models{}, active_model, classes, feature_names}` | Computes feature importance on-the-fly |
| `/api/set-active/{name}` | POST | Path param | `{active_model}` | Switches active model, resets simulation |
| `/api/predict` | POST | `{count}` | `{packets[], stats{}, log[]}` | Updates all simulation counters |
| `/api/dashboard` | GET | — | Full aggregated state | None (read-only aggregation) |
| `/api/system` | GET | — | `{ram_%, cpu_%, ram_used, ram_total}` | Calls `psutil` (0.1s CPU sampling) |
| `/api/simulation/reset` | POST | — | `{status: "reset"}` | Zeros all simulation counters |
| `/api/models/reset` | POST | — | `{status: "reset"}` | Clears model registry + simulation |

**Middleware:**

```python
CORSMiddleware(allow_origins=["*"])  # Development — restrict in production
```

**Thread Safety:**

```python
# Set at the TOP of server.py, BEFORE any sklearn import
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
os.environ['NUMEXPR_NUM_THREADS'] = '1'
```

This prevents the BLAS/OpenMP multi-threading layer from creating parallel threads inside scikit-learn, which causes deadlocks on Windows when combined with FastAPI's async event loop.

---

### Layer 4A — React Dashboard (Vite)

**Directory**: `cyber-dashboard/src/` (14 components)

The React frontend is a **Single Page Application (SPA)** built with Vite, using React Context API for global state and a 2-second polling loop for real-time data.

```mermaid
graph TD
    subgraph ENTRY ["Entry Point"]
        INDEX["index.html"]
        MAIN["main.jsx<br/>ReactDOM.createRoot"]
    end

    subgraph ROOT ["Root Application"]
        APP["App.jsx<br/>DashboardContext.Provider"]
        APIJS["api.js<br/>7 API Functions"]
    end

    subgraph LAYOUT ["Layout Shell"]
        SIDEBAR["Sidebar.jsx<br/>Navigation · 6 Pages"]
        TOPBAR["TopBar.jsx<br/>Page Title + Subtitle"]
    end

    subgraph PAGES ["Page-Level Components"]
        DASH["DashboardHome<br/>(Attack Surface)"]
        COMPARISON["ModelComparison.jsx<br/>33,050 bytes"]
        REALTIME["RealTimeOps.jsx<br/>Live Ops"]
        INTEL["IntelligencePanel.jsx<br/>XAI Insights"]
        RESOURCES["ResourceMonitor.jsx<br/>System Health"]
    end

    subgraph WIDGETS ["Dashboard Widgets"]
        METRIC["MetricCards.jsx"]
        TRAFFIC["LiveTrafficChart.jsx"]
        GAUGE["DarkWebGauge.jsx"]
        SEVERITY["ThreatSeverity.jsx"]
        MAP["GlobalFootprint.jsx"]
        ASN["AsnOwnership.jsx"]
        SECTION["ModelSection.jsx<br/>35,374 bytes"]
        CHARTS["ModelCharts.jsx<br/>20,600 bytes"]
    end

    INDEX --> MAIN --> APP
    APP --> SIDEBAR
    APP --> TOPBAR
    APP --> PAGES

    DASH --> METRIC & TRAFFIC & GAUGE & SEVERITY & MAP & ASN & SECTION & CHARTS
```

**Client-Side State Flow:**

```mermaid
sequenceDiagram
    participant App as App.jsx
    participant Ctx as DashboardContext
    participant API as api.js
    participant BE as FastAPI Backend

    App->>API: getDashboardStats()
    API->>BE: GET /api/dashboard
    BE-->>API: JSON Response
    API-->>App: dashData object
    App->>Ctx: setDashData(data)
    
    Note over App: Every 2 seconds (setInterval)
    
    App->>Ctx: isSimulating = true
    loop Every 1 second
        App->>API: predictPackets(3)
        API->>BE: POST /api/predict {count: 3}
        BE-->>API: {packets, stats, log}
        API-->>App: Update liveLog
    end
```

**Page Routing Architecture:**

| Page Key | Component | Description |
| :--- | :--- | :--- |
| `dashboard` / `attack-surface` | `DashboardHome` | 8 widget grid: metrics, live chart, gauge, severity rings, model section, charts, geo-map, ASN |
| `model-comparison` | `ModelComparison` | Side-by-side benchmark of all trained models with bar charts and metrics tables |
| `real-time-ops` | `RealTimeOps` | Live packet stream, start/stop/reset simulation controls, threat level |
| `intelligence` | `IntelligencePanel` | XAI feature importance, model behavior analysis, per-packet explanations |
| `resources` | `ResourceMonitor` | Live RAM/CPU gauges via `/api/system` |

---

### Layer 4B — Streamlit SOC Console

**Directory**: `IntrusionDetectionDashboard/` (841-line `app.py` + 6 utility modules)

The Streamlit dashboard is a **standalone Python application** designed for Security Analysts and Data Scientists. Unlike the React dashboard, it **directly imports** the ML libraries and can perform training, evaluation, and SHAP explainability in the same process.

```mermaid
graph TD
    subgraph APP ["app.py (841 lines)"]
        CONFIG["config.py<br/>Paths · Thresholds · Theme"]
        SESSION["st.session_state<br/>Single Source of Truth"]
        TABS["5 Tabs"]
    end

    subgraph UTILS ["utils/ Module Library"]
        PREPROC["preprocessing.py<br/>load_data() · preprocess_data()<br/>split_data() · get_system_metrics()"]
        TRAIN["training.py<br/>create_model() · train_model()"]
        EVAL["evaluation.py<br/>evaluate_model() · confusion_matrix<br/>ROC curves"]
        EXPLAIN["explainability.py<br/>compute_shap_values()<br/>plot_shap_summary()"]
        MIO["model_io.py<br/>save_model() · load_model()<br/>list_models()"]
        LOG["logger.py<br/>Structured logging"]
    end

    subgraph TABS_DETAIL ["5 Operational Tabs"]
        T1["📊 Overview<br/>Distribution · Dataset Preview<br/>Active Model Snapshot"]
        T2["🚨 Real-Time Ops<br/>Live Packet Stream<br/>Start/Stop/Reset · Threat Level"]
        T3["📈 Model Comparison<br/>Performance Summary Table<br/>Bar Charts · Confusion Matrix"]
        T4["🧠 Intelligence (XAI)<br/>Feature Importance · SHAP<br/>Per-Packet Explanations"]
        T5["🖥️ Resources<br/>RAM Gauge · CPU Monitor"]
    end

    APP --> UTILS
    APP --> TABS_DETAIL

    subgraph MODELS_DIR ["models/ (50+ files)"]
        JOBLIB["*.joblib<br/>Serialized Model Artifacts"]
    end

    MIO <--> JOBLIB
```

**Streamlit Session State Architecture:**

```python
# Single Source of Truth — initialized once via init_state()
st.session_state = {
    'model': None,                    # Active sklearn model object
    'model_registry': {},             # {name: {model, accuracy, f1, ...}}
    'active_model_name': 'None',      # String identifier
    'classes': [],                    # LabelEncoder classes
    'feature_names': [],              # Column names for XAI
    'test_data': (None, None),        # (X_test, y_test) tuple
    'simulation_running': False,      # Simulation toggle
    'total_packets': 0,               # Packet counter
    'blocked_packets': 0,             # Attack counter
    'packet_log': [],                 # Recent packet history
    'attack_history': [],             # Rolling window for threat level
    'threat_level': 'LOW',            # Computed threat level
}
```

---

## Data Flow Architecture

The complete data flow from raw CSV to rendered UI pixel:

```mermaid
flowchart TD
    subgraph DATA_SOURCE ["Data Sources"]
        CSV["CSV Files<br/>(10GB+)"]
        LAPTOP["Laptop Server<br/>(Ngrok)"]
        SYNTH["Synthetic Generator<br/>(NumPy)"]
    end

    subgraph INGESTION ["Ingestion"]
        LOAD["load_data()"]
        CSV -->|"Priority 1"| LOAD
        LAPTOP -->|"Priority 2"| LOAD
        SYNTH -->|"Priority 3"| LOAD
    end

    subgraph PREPROCESS ["Preprocessing Pipeline"]
        IMPUTE["SimpleImputer<br/>(mean strategy)"]
        ENCODE["LabelEncoder<br/>(categorical + target)"]
        SCALE["StandardScaler<br/>(μ=0, σ=1)"]
        SPLIT["70/30 Train-Test Split"]
        
        LOAD --> IMPUTE --> ENCODE --> SCALE --> SPLIT
    end

    subgraph TRAINING ["Training (5 Models)"]
        RF["Random Forest"]
        DT["Decision Tree"]
        NB["Gaussian NB"]
        XGB["XGBoost"]
        MLP_N["MLP"]
        
        SPLIT -->|"X_train, y_train"| RF & DT & NB & XGB & MLP_N
    end

    subgraph EVALUATION ["Evaluation"]
        METRICS["6 Metrics per Model"]
        RF & DT & NB & XGB & MLP_N -->|"X_test, y_test"| METRICS
        METRICS --> SELECT["Auto-Select<br/>Best F1-Score"]
    end

    subgraph INFERENCE ["Live Inference"]
        ACTIVE["Active Model"]
        SIM["simulate_packet()"]
        SELECT --> ACTIVE --> SIM
    end

    subgraph PRESENTATION ["Presentation"]
        REACT["React Dashboard<br/>(REST Polling)"]
        STREAM["Streamlit Console<br/>(Direct Import)"]
        SIM -->|"JSON Response"| REACT
        SIM -->|"Python Object"| STREAM
    end
```

---

## State Management Architecture

The system uses **two distinct state management patterns** for its two frontends:

### FastAPI Backend State (`app.state`)

```mermaid
graph TD
    subgraph SERVER_STATE ["server.py — app.state"]
        direction LR
        subgraph MODEL_STATE ["Model Lifecycle State"]
            MS1["models{} — Full model registry"]
            MS2["active_model — sklearn object"]
            MS3["active_model_name — String ID"]
            MS4["classes[] — Label encoder classes"]
            MS5["feature_names[] — Column names"]
            MS6["X_test, y_test — Evaluation holdout"]
        end

        subgraph SIM_STATE ["Simulation State"]
            SS1["total_packets — Running counter"]
            SS2["blocked_packets — Attack counter"]
            SS3["attack_history[] — Rolling 30-item window"]
            SS4["packet_log[] — Last 50 packets (LIFO)"]
            SS5["unique_ips{} — Set of seen IPs"]
            SS6["threat_level — LOW/MODERATE/HIGH"]
            SS7["attack_type_counts{} — Per-label counts"]
        end
    end
```

> **Key Design Decision:** All state is held in-memory via `app.state`. This is intentionally volatile — a server restart wipes all simulation data. This is acceptable because:
> - Training can be re-triggered via `/api/train`
> - The system is a real-time simulation, not a persistent audit log
> - In-memory state provides sub-millisecond read/write latency

### React Frontend State

```mermaid
graph TD
    subgraph REACT_STATE ["React State Architecture"]
        CTX["DashboardContext<br/>(createContext)"]
        
        subgraph HOOKS ["useState Hooks"]
            H1["activePage — Current tab"]
            H2["dashData — Full dashboard payload"]
            H3["isSimulating — Boolean toggle"]
            H4["liveLog — Packet log array"]
        end

        subgraph EFFECTS ["useEffect Loops"]
            E1["Dashboard Poll<br/>setInterval 2000ms<br/>getDashboardStats()"]
            E2["Simulation Tick<br/>setInterval 1000ms<br/>predictPackets(3)"]
        end

        CTX --> HOOKS
        HOOKS --> EFFECTS
    end
```

### Streamlit Session State

The Streamlit frontend uses `st.session_state` as a **global mutable dictionary**, with `@st.cache_data` decorators on `load_data()` and `preprocess_data()` for memoization. Model objects are stored directly in session state, enabling in-process `.predict()` calls without HTTP overhead.

---

## ML Training Pipeline Architecture

```mermaid
flowchart TD
    TRIGGER["POST /api/train<br/>{model_name?, sample_size}"]
    
    TRIGGER --> RESET_SIM["Reset Simulation State<br/>(total_packets = 0, etc.)"]
    RESET_SIM --> LOAD["load_data(data_dir, sample_size)<br/>3-Tier Priority Loader"]
    LOAD --> PREPROCESS["preprocess_data(df)<br/>Impute → Encode → Scale"]
    PREPROCESS --> SPLIT["split_data(X, y, test_size=0.3)<br/>NumPy permutation split"]
    SPLIT --> STORE_TEST["Store X_test, y_test, classes<br/>in app.state"]

    STORE_TEST --> DECIDE{model_name<br/>specified?}
    DECIDE -->|"Yes"| TRAIN_ONE["Train Single Model"]
    DECIDE -->|"No"| TRAIN_ALL["Train All 5 Models<br/>(Sequential Loop)"]

    TRAIN_ONE & TRAIN_ALL --> EVAL_LOOP["For each model:<br/>1. _create_model(name)<br/>2. model.fit(X_train, y_train)<br/>3. evaluate(model, X_test, y_test)"]

    EVAL_LOOP --> STORE_RESULTS["Store in app.state.models{}<br/>{model, metrics, train_time}"]

    STORE_RESULTS --> AUTO_SELECT{"Auto-Select Logic"}
    AUTO_SELECT -->|"First training ever"| SELECT_BEST["max(models, key=f1)<br/>Auto-promote to active"]
    AUTO_SELECT -->|"Model was retrained"| REFRESH["Refresh active model object"]
    AUTO_SELECT -->|"Unrelated model"| KEEP["Keep current active model"]

    SELECT_BEST & REFRESH & KEEP --> RESPONSE["Return JSON:<br/>results, classes, active_model, best_model"]
```

**Training Time Complexity:**

| Model | Training Complexity | Typical Time (100k samples) |
| :--- | :--- | :--- |
| Random Forest | O(n · m · T · log n) where T=50 trees | ~2-5s |
| Decision Tree | O(n · m · log n) | <1s |
| Gaussian NB | O(n · m) linear scan | <0.5s |
| XGBoost | O(n · m · T · d) where T=50, d=3 | ~3-8s |
| MLP | O(n · m · h · iter) where h=100, iter=200 | ~5-15s |

---

## Real-Time Inference Architecture

```mermaid
sequenceDiagram
    participant UI as React / Streamlit
    participant API as FastAPI Gateway
    participant ENG as ML Engine
    participant STATE as app.state

    Note over UI: Simulation tick (every 1s for React)
    
    UI->>API: POST /api/predict {count: 3}
    
    loop For each packet (count times)
        API->>ENG: simulate_packet(active_model, X_test, classes)
        ENG->>ENG: idx = random(0, len(X_test))
        ENG->>ENG: sample = X_test[idx]
        ENG->>ENG: probs = model.predict_proba(sample)
        ENG->>ENG: label = classes[argmax(probs)]
        ENG->>ENG: Generate random src_ip + protocol
        ENG-->>API: {src_ip, protocol, label, confidence, is_attack, probabilities}
        
        API->>STATE: total_packets += 1
        API->>STATE: unique_ips.add(src_ip)
        
        alt is_attack == true
            API->>STATE: blocked_packets += 1
        end
        
        API->>STATE: attack_history.append(is_attack)
        API->>STATE: Trim attack_history to 30 items
        API->>STATE: threat_level = _get_threat_level(attack_history)
        API->>STATE: packet_log.insert(0, pkt) — keep last 50
    end
    
    API-->>UI: {packets[], stats{total, blocked, ips, threat, rate}, log[]}
```

**Threat Level Algorithm:**

```python
def _get_threat_level(history):
    rate = sum(history) / len(history)  # attack_ratio over last 30 packets
    if rate > 0.20:  return "HIGH"      # >20% attacks = critical
    if rate > 0.05:  return "MODERATE"  # 5-20% attacks = elevated
    return "LOW"                         # <5% attacks = nominal
```

---

## Explainable AI (XAI) Architecture

The XAI system operates at **two levels of granularity**:

```mermaid
graph TD
    subgraph GLOBAL ["Global Explanations"]
        FI["Feature Importance<br/>(model.feature_importances_)"]
        SHAP_G["SHAP TreeExplainer / KernelExplainer<br/>shap.summary_plot()"]
        ANALYSIS["Auto-Generated Behavior Analysis<br/>Category Detection:<br/>Timing · TCP · Protocol · Size"]
    end

    subgraph LOCAL ["Per-Packet Local Explanations"]
        PKT_FEATURES["Extract packet feature values"]
        PKT_CATEGORY["Categorize by feature type"]
        PKT_NARRATIVE["Generate English narrative:<br/>'Flagged due to anomalous TCP<br/>window scaling consistent with<br/>SYN flood behavior.'"]
        PKT_CONFIDENCE["Confidence gauge display"]
    end

    subgraph RESPONSIBLE ["Responsible AI"]
        WARNINGS["Built-in model limitation warnings"]
        FP_FN["False positive / negative disclaimers"]
        HUMAN["Human oversight requirements"]
    end

    GLOBAL --> LOCAL --> RESPONSIBLE
```

**SHAP Explainer Selection:**

| Model Type | Explainer | Why |
| :--- | :--- | :--- |
| Random Forest, Decision Tree, XGBoost | `shap.TreeExplainer` | Exact SHAP values in polynomial time for tree-based models |
| MLP, Gaussian NB | `shap.KernelExplainer` | Model-agnostic approximation (slower, uses `predict_proba` as black box) |

---

## Component Dependency Graph

```mermaid
graph BT
    subgraph STDLIB ["Python Standard Library"]
        HTTP["http.server"]
        CSV["csv · io · json"]
        PATHLIB["pathlib"]
    end

    subgraph CORE_ML ["Core ML"]
        SKLEARN["scikit-learn<br/>RandomForest · DecisionTree<br/>GaussianNB · MLP<br/>StandardScaler · LabelEncoder"]
        XGBOOST["XGBoost<br/>(optional)"]
        SHAP_LIB["SHAP 0.42+"]
    end

    subgraph DATA_LIBS ["Data Libraries"]
        PANDAS["Pandas"]
        NUMPY["NumPy"]
        JOBLIB["joblib"]
    end

    subgraph WEB_BACKEND ["Web Backend"]
        FASTAPI["FastAPI"]
        UVICORN["Uvicorn"]
        PYDANTIC["Pydantic"]
        PSUTIL["psutil"]
    end

    subgraph WEB_FRONTEND ["Web Frontend"]
        REACT["React 18"]
        VITE["Vite"]
        RECHARTS["Recharts"]
        FRAMER["Framer Motion"]
        MAPS["react-simple-maps"]
    end

    subgraph ANALYST_FE ["Analyst Frontend"]
        STREAMLIT["Streamlit 1.25+"]
        PLOTLY["Plotly 5.15+"]
    end

    subgraph INFRA ["Infrastructure"]
        RENDER["Render (FastAPI)"]
        VERCEL["Vercel (React)"]
        NGROK["Ngrok (Data Tunnel)"]
    end

    %% Dependencies
    DATA_LIBS --> CORE_ML
    CORE_ML --> WEB_BACKEND
    DATA_LIBS --> WEB_BACKEND
    WEB_BACKEND --> REACT
    CORE_ML --> ANALYST_FE
    DATA_LIBS --> ANALYST_FE
    SHAP_LIB --> ANALYST_FE
    STDLIB --> HTTP
```

---

## Security Architecture

```mermaid
flowchart TD
    subgraph AUTH ["Authentication Layer"]
        TOKEN["Bearer Token<br/>DATA_SECRET env var"]
        VALIDATE["_auth_ok(handler)<br/>Compare Authorization header"]
        TOKEN --> VALIDATE
    end

    subgraph CORS_LAYER ["CORS Policy"]
        CORS["allow_origins=['*']<br/>Development Mode"]
        RESTRICT["Production:<br/>Restrict to Vercel domain"]
    end

    subgraph THREAD_SAFETY ["Thread Safety"]
        OMP["OMP_NUM_THREADS=1"]
        BLAS["OPENBLAS_NUM_THREADS=1"]
        MKL["MKL_NUM_THREADS=1"]
        NUMEXPR["NUMEXPR_NUM_THREADS=1"]
    end

    subgraph STATE_SECURITY ["State Volatility"]
        VOLATILE["In-Memory State<br/>No persistent storage<br/>Server restart = clean slate"]
    end

    AUTH --> CORS_LAYER --> THREAD_SAFETY --> STATE_SECURITY
```

**Attack Surface Minimization:**

1. **Data Server** — Only 3 endpoints exposed; `/data` and `/info` require Bearer token
2. **FastAPI** — No authentication on API endpoints (demo/internal use); CORS wildcard must be restricted in production
3. **State** — Volatile by design; no database, no file writes during inference (only joblib saves during training in Streamlit)
4. **Dependencies** — `xgboost` is optional (`try/except ImportError`); the system gracefully degrades if not installed

---

## Deployment Architecture

```mermaid
graph TD
    subgraph DEV_MACHINE ["Developer Laptop"]
        DATA_SRV["data_server.py<br/>Port 7860"]
        CSVS["CSV Datasets<br/>10GB+"]
        CSVS --> DATA_SRV
    end

    subgraph NGROK_TUNNEL ["Ngrok Tunnel"]
        TUNNEL["HTTPS Proxy<br/>xxxx.ngrok-free.app"]
    end

    subgraph RENDER ["Render (Cloud)"]
        BACKEND["FastAPI Backend<br/>uvicorn server:app<br/>Port $PORT"]
        ENV_VARS["Environment Variables:<br/>DATA_SOURCE_URL<br/>DATA_SECRET"]
    end

    subgraph VERCEL ["Vercel (CDN)"]
        REACT_BUILD["React SPA<br/>Vite Build<br/>Static Assets"]
        VITE_ENV["VITE_API_URL →<br/>Render Backend URL"]
    end

    subgraph STREAMLIT_CLOUD ["Render / Streamlit Cloud"]
        ST_APP["Streamlit app.py<br/>Port $PORT"]
    end

    subgraph USERS ["End Users"]
        CSUITE["C-Suite / Display Screens<br/>→ React Dashboard"]
        ANALYST["SOC Analysts / Data Scientists<br/>→ Streamlit Console"]
    end

    DATA_SRV --> TUNNEL --> BACKEND
    BACKEND --> REACT_BUILD
    BACKEND -.-> ST_APP
    REACT_BUILD --> CSUITE
    ST_APP --> ANALYST
```

**Deployment Configuration per Service:**

| Service | Platform | Root Directory | Build Command | Start Command |
| :--- | :--- | :--- | :--- | :--- |
| FastAPI Backend | Render | `cyber-dashboard/backend` | `pip install -r requirements.txt` | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| React Frontend | Vercel | `cyber-dashboard` | `npm install && npm run build` | Static (CDN) |
| Streamlit Console | Render / Streamlit Cloud | `IntrusionDetectionDashboard` | `pip install -r requirements.txt` | `streamlit run app.py --server.port $PORT` |
| Data Server | Local | Repository root | — | `python data_server.py` + `ngrok http 7860` |

---

<div align="center">

**Built by [Soubhagya Jain](https://github.com/SoubhagyaJain)**

*Architecture documentation for CyberSentinel AI v3.0*

</div>
