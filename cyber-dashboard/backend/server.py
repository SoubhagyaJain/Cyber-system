"""
CyberSentinel FastAPI Backend
Serves ML models for the React dashboard.
"""
# ── Thread-safety fix for Windows + sklearn OpenMP deadlock ──
import os
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
os.environ['NUMEXPR_NUM_THREADS'] = '1'

import sys
import psutil
import numpy as np
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from ml.data import load_data, preprocess_data, split_data, FEATURE_COLUMNS
from ml.engine import (
    ALL_MODELS, train_single, evaluate, get_feature_importance,
    simulate_packet, load_latest_joblib
)

app = FastAPI(title="CyberSentinel API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory state ──────────────────────────────────────────
# We use app.state to store backend state so it belongs to the FastAPI instance.

app.state.models = {}             # {name: {model, metrics, train_time, ...}}
app.state.active_model = None
app.state.active_model_name = "None"
app.state.classes = []
app.state.feature_names = []
app.state.X_test = None
app.state.y_test = None

# Simulation
app.state.total_packets = 0
app.state.blocked_packets = 0
app.state.attack_history = []
app.state.packet_log = []
app.state.unique_ips = set()
app.state.threat_level = "LOW"
app.state.attack_type_counts = {}
app.state.simulation_running = False

DATA_DIR = str(Path(__file__).resolve().parent.parent.parent)  # Detect cyber Intrusion root


# ── Pydantic Models ──────────────────────────────────────────
class TrainRequest(BaseModel):
    model_name: Optional[str] = None  # None = train all
    sample_size: int = 100000


class PredictRequest(BaseModel):
    count: int = 1


# ── Helpers ──────────────────────────────────────────────────
def _get_threat_level(history):
    if not history:
        return "LOW"
    rate = sum(history) / len(history)
    if rate > 0.20:
        return "HIGH"
    elif rate > 0.05:
        return "MODERATE"
    return "LOW"


# ── Endpoints ────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "models_loaded": len(app.state.models)}


@app.post("/api/train")
def train_models(req: TrainRequest):
    """Train one or all models."""
    df = load_data(data_dir=DATA_DIR, sample_size=req.sample_size)
    if df is None or df.empty:
        raise HTTPException(500, "Failed to load data")

    X, y, le_target, scaler, feat_names = preprocess_data(df)
    X_train, X_test, y_train, y_test = split_data(X, y)

    app.state.classes = le_target.classes_.tolist()
    app.state.feature_names = feat_names
    app.state.X_test = X_test
    app.state.y_test = y_test

    names_to_train = [req.model_name] if req.model_name else ALL_MODELS
    results = {}

    for name in names_to_train:
        try:
            model, t_time = train_single(name, X_train, y_train)
            metrics, y_pred, y_proba = evaluate(model, X_test, y_test, app.state.classes)
            metrics["train_time"] = round(t_time, 3)

            app.state.models[name] = {
                "model": model,
                "metrics": metrics,
            }
            results[name] = metrics
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Training failed for model '{name}': {e}")

    # Set best model as active
    if app.state.models:
        best = max(
            app.state.models,
            key=lambda k: app.state.models[k]["metrics"].get("f1", 0)
        )
        app.state.active_model = app.state.models[best]["model"]
        app.state.active_model_name = best

    return {
        "results": results,
        "classes": app.state.classes,
        "active_model": app.state.active_model_name,
        "best_model": best if app.state.models else None,
    }


@app.get("/api/models")
def list_models():
    """Return registry with metrics."""
    registry = {}
    for name, entry in app.state.models.items():
        m = entry["metrics"].copy()
        m["feature_importance"] = get_feature_importance(
            entry["model"], app.state.feature_names
        )
        registry[name] = m
    return {
        "models": registry,
        "active_model": app.state.active_model_name,
        "classes": app.state.classes,
        "feature_names": app.state.feature_names,
    }


@app.post("/api/set-active/{model_name}")
def set_active(model_name: str):
    if model_name not in app.state.models:
        raise HTTPException(404, f"Model '{model_name}' not found in registry")
    app.state.active_model = app.state.models[model_name]["model"]
    app.state.active_model_name = model_name
    # Reset simulation
    app.state.total_packets = 0
    app.state.blocked_packets = 0
    app.state.attack_history = []
    app.state.packet_log = []
    app.state.unique_ips = set()
    app.state.threat_level = "LOW"
    return {"active_model": model_name}


@app.post("/api/predict")
def predict(req: PredictRequest):
    """Simulate packet predictions."""
    if app.state.active_model is None or app.state.X_test is None:
        raise HTTPException(400, "No model trained. Call /api/train first.")

    packets = []
    for _ in range(req.count):
        pkt = simulate_packet(app.state.active_model, app.state.X_test, app.state.classes)
        pkt["timestamp"] = datetime.now().strftime("%H:%M:%S.%f")[:-3]

        app.state.total_packets += 1
        app.state.unique_ips.add(pkt["src_ip"])
        if pkt["is_attack"]:
            app.state.blocked_packets += 1

        # Track attack type distribution
        label = pkt["label"]
        app.state.attack_type_counts[label] = app.state.attack_type_counts.get(label, 0) + 1

        app.state.attack_history.append(1 if pkt["is_attack"] else 0)
        if len(app.state.attack_history) > 30:
            app.state.attack_history.pop(0)

        app.state.threat_level = _get_threat_level(app.state.attack_history)
        app.state.simulation_running = True
        app.state.packet_log.insert(0, pkt)
        app.state.packet_log = app.state.packet_log[:50]

        packets.append(pkt)

    return {
        "packets": packets,
        "stats": {
            "total_packets": app.state.total_packets,
            "blocked_packets": app.state.blocked_packets,
            "unique_ips": len(app.state.unique_ips),
            "threat_level": app.state.threat_level,
            "attack_rate": round(
                (sum(app.state.attack_history) / len(app.state.attack_history) * 100)
                if app.state.attack_history else 0, 1
            ),
        },
        "log": app.state.packet_log[:20],
    }


@app.post("/api/simulation/reset")
def reset_simulation():
    app.state.total_packets = 0
    app.state.blocked_packets = 0
    app.state.attack_history = []
    app.state.packet_log = []
    app.state.unique_ips = set()
    app.state.threat_level = "LOW"
    app.state.attack_type_counts = {}
    app.state.simulation_running = False
    return {"status": "reset"}


@app.get("/api/system")
def system_metrics():
    ram = psutil.virtual_memory()
    cpu = psutil.cpu_percent(interval=0.1)
    return {
        "ram_percent": ram.percent,
        "ram_used_gb": round(ram.used / (1024**3), 2),
        "ram_total_gb": round(ram.total / (1024**3), 2),
        "cpu_percent": cpu,
    }


@app.get("/api/dashboard")
def dashboard_stats():
    """Aggregated stats for the main Attack Surface Dashboard."""
    # Model info
    model_info = []
    for name, entry in app.state.models.items():
        m = entry["metrics"]
        model_info.append({
            "name": name,
            "accuracy": m.get("accuracy", 0),
            "f1": m.get("f1", 0),
            "precision": m.get("precision", 0),
            "recall": m.get("recall", 0),
            "roc_auc": m.get("roc_auc", 0),
            "train_time": m.get("train_time", 0),
        })

    # Attack type distribution for severity rings
    atk = app.state.attack_type_counts
    total = max(sum(atk.values()), 1)

    return {
        "simulation_active": app.state.simulation_running and app.state.total_packets > 0,
        "total_packets": app.state.total_packets,
        "blocked_packets": app.state.blocked_packets,
        "unique_ips": len(app.state.unique_ips),
        "threat_level": app.state.threat_level,
        "attack_rate": round(
            (sum(app.state.attack_history) / len(app.state.attack_history) * 100)
            if app.state.attack_history else 0, 1
        ),
        "attack_type_counts": atk,
        "active_model": app.state.active_model_name,
        "models_trained": len(app.state.models),
        "model_info": model_info,
        "classes": app.state.classes,
        "recent_packets": app.state.packet_log[:50],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000)
