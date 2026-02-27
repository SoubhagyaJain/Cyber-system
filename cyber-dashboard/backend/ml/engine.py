import time
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score
)
from sklearn.preprocessing import label_binarize

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

ALL_MODELS = ["Random Forest", "Decision Tree", "Gaussian NB", "XGBoost", "MLP"]

# Path to existing joblib models from the Streamlit app
STREAMLIT_MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "IntrusionDetectionDashboard" / "models"


def _create_model(name, params=None):
    params = params or {}
    if name == "Random Forest":
        return RandomForestClassifier(
            n_estimators=params.get("n_estimators", 50),
            max_depth=params.get("max_depth", None),
            random_state=42, n_jobs=-1
        )
    elif name == "Decision Tree":
        return DecisionTreeClassifier(
            max_depth=params.get("max_depth", None),
            criterion=params.get("criterion", "gini"),
            random_state=42
        )
    elif name == "Gaussian NB":
        return GaussianNB()
    elif name == "XGBoost":
        if not HAS_XGBOOST:
            raise ImportError("XGBoost is not installed")
        return XGBClassifier(
            n_estimators=params.get("n_estimators", 50),
            learning_rate=params.get("learning_rate", 0.1),
            max_depth=params.get("max_depth", 3),
            eval_metric='logloss',
            random_state=42, n_jobs=-1
        )
    elif name == "MLP":
        return MLPClassifier(
            hidden_layer_sizes=params.get("hidden_layer_sizes", (100,)),
            activation=params.get("activation", "relu"),
            max_iter=params.get("max_iter", 200),
            random_state=42
        )
    raise ValueError(f"Unknown model: {name}")


def train_single(name, X_train, y_train, params=None):
    """Train one model. Returns (model, training_time_seconds)."""
    model = _create_model(name, params)
    t0 = time.time()
    model.fit(X_train, y_train)
    return model, time.time() - t0


def evaluate(model, X_test, y_test, classes):
    """Evaluate model. Returns dict of metrics + y_pred + y_proba."""
    y_pred = model.predict(X_test)

    try:
        y_proba = model.predict_proba(X_test)
    except Exception:
        y_proba = None

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, average='weighted', zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, average='weighted', zero_division=0)),
    }

    # ROC-AUC
    roc_auc = 0.0
    if y_proba is not None:
        try:
            y_bin = label_binarize(y_test, classes=range(len(classes)))
            roc_auc = float(roc_auc_score(y_bin, y_proba, multi_class='ovr', average='weighted'))
        except Exception:
            pass
    metrics["roc_auc"] = roc_auc

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred).tolist()
    metrics["confusion_matrix"] = cm

    return metrics, y_pred, y_proba


def get_feature_importance(model, feature_names):
    """Return sorted feature importances if available."""
    if hasattr(model, 'feature_importances_'):
        imp = model.feature_importances_
        pairs = sorted(zip(feature_names, [float(v) for v in imp]), key=lambda x: x[1], reverse=True)
        return [{"feature": f, "importance": v} for f, v in pairs]
    return None


def simulate_packet(model, X_test, classes):
    """Simulate one packet prediction."""
    idx = np.random.randint(0, len(X_test))
    sample = X_test.iloc[[idx]] if hasattr(X_test, 'iloc') else X_test[idx:idx+1]
    probs = model.predict_proba(sample)[0]
    pred_idx = int(np.argmax(probs))
    confidence = float(probs[pred_idx])
    label = str(classes[pred_idx])

    is_attack = label != "Normal" and label != "0"
    src_ip = f"10.0.{np.random.randint(1,255)}.{np.random.randint(1,255)}"
    protocol = np.random.choice(["TCP", "UDP", "ICMP", "HTTP", "DNS", "TLS", "SSH"])

    return {
        "src_ip": src_ip,
        "protocol": protocol,
        "label": label,
        "confidence": confidence,
        "is_attack": is_attack,
        "probabilities": {str(classes[i]): float(probs[i]) for i in range(len(probs))},
    }


def load_latest_joblib(model_name):
    """Load the latest joblib model file for the given model name from the Streamlit models dir."""
    if not STREAMLIT_MODELS_DIR.exists():
        return None
    files = sorted(STREAMLIT_MODELS_DIR.glob(f"{model_name}_*.joblib"))
    if files:
        return joblib.load(files[-1])
    return None
