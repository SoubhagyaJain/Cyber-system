"""
============================================================================
 CyberSentinel-AI — ML Model Optimization Pipeline
 optimize_models.py

 Production-grade, leakage-free optimization script.
 Replaces train_model.py with proper methodology:
   Phase 1: Leakage-free split + stratification
   Phase 2: Class imbalance handling (balanced weights)
   Phase 3: Threshold tuning via PR curve (free F1 boost)
   Phase 4: Hyperparameter tuning (Optuna + Stratified CV)
   Phase 5: Feature engineering (domain-specific)
   Phase 6: Comprehensive evaluation (per-class + macro + weighted)

 Usage:
   python optimize_models.py                  # Uses synthetic data if CSVs missing
   python optimize_models.py --skip-optuna    # Skip hyperparameter search (faster)

 Requirements:
   pip install scikit-learn xgboost optuna pandas numpy tabulate
============================================================================
"""

import argparse
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import (
    StratifiedKFold,
    cross_val_score,
    train_test_split,
)
from sklearn.neural_network import MLPClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.preprocessing import LabelEncoder, StandardScaler, label_binarize
from sklearn.tree import DecisionTreeClassifier
from sklearn.utils.class_weight import compute_sample_weight

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("⚠️  XGBoost not installed. XGBoost models will be skipped.")

try:
    import optuna
    HAS_OPTUNA = True
except ImportError:
    HAS_OPTUNA = False
    print("⚠️  Optuna not installed. Hyperparameter tuning will be skipped.")

warnings.filterwarnings("ignore", category=UserWarning)

# ── Configuration ────────────────────────────────────────────────────────────

SELECTED_COLUMNS = [
    "DST_TOS", "SRC_TOS", "TCP_WIN_SCALE_OUT", "TCP_WIN_SCALE_IN",
    "TCP_FLAGS", "TCP_WIN_MAX_OUT", "PROTOCOL", "TCP_WIN_MIN_OUT",
    "TCP_WIN_MIN_IN", "TCP_WIN_MAX_IN", "LAST_SWITCHED", "TCP_WIN_MSS_IN",
    "TOTAL_FLOWS_EXP", "FIRST_SWITCHED", "FLOW_DURATION_MILLISECONDS", "LABEL",
]
TARGET_COL = "LABEL"
RANDOM_STATE = 42
TEST_SIZE = 0.3
VAL_SIZE = 0.2        # carved from training set for threshold tuning
SAMPLE_FRAC = 0.3     # fraction of each CSV to load (memory-safe)
DATA_FILES = [f"dataset-part{i}.csv" for i in range(1, 5)]

# Results directory
RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 0 — Data Loading
# ═══════════════════════════════════════════════════════════════════════════════

def load_data() -> pd.DataFrame:
    """
    Load CSVs from project root with sampling.
    Falls back to synthetic data if CSVs are missing.
    """
    root = Path(__file__).parent
    dfs = []

    for fname in DATA_FILES:
        fpath = root / fname
        if fpath.exists():
            print(f"  Loading {fname}...")
            df = pd.read_csv(fpath, usecols=SELECTED_COLUMNS)
            df = df.sample(frac=SAMPLE_FRAC, random_state=RANDOM_STATE)
            # Downcast to save memory
            for col in df.select_dtypes(include=["float64"]).columns:
                df[col] = df[col].astype("float32")
            for col in df.select_dtypes(include=["int64"]).columns:
                df[col] = df[col].astype("int32")
            dfs.append(df)

    if dfs:
        data = pd.concat(dfs, ignore_index=True)
        data.drop_duplicates(inplace=True)
        print(f"  ✓ Loaded real data: {data.shape}")
        return data

    # ── Synthetic fallback ───────────────────────────────────
    print("  ⚠️  No CSVs found. Generating synthetic demo data...")
    return _generate_synthetic_data(50000)


def _generate_synthetic_data(n: int = 50000) -> pd.DataFrame:
    """Generate realistic synthetic network flow data for testing."""
    np.random.seed(RANDOM_STATE)
    labels = ["Normal", "DoS", "DDoS", "Reconnaissance", "Theft"]
    weights = [0.60, 0.15, 0.10, 0.10, 0.05]

    data = {
        "DST_TOS": np.random.choice([0, 4, 8, 16, 32], n, p=[0.7, 0.1, 0.1, 0.05, 0.05]),
        "SRC_TOS": np.random.choice([0, 4, 8, 16, 32], n, p=[0.75, 0.1, 0.05, 0.05, 0.05]),
        "TCP_WIN_SCALE_OUT": np.random.randint(0, 15, n),
        "TCP_WIN_SCALE_IN": np.random.randint(0, 15, n),
        "TCP_FLAGS": np.random.randint(0, 255, n),
        "TCP_WIN_MAX_OUT": np.random.randint(0, 65535, n),
        "PROTOCOL": np.random.choice([6, 17, 1, 47], n, p=[0.6, 0.25, 0.1, 0.05]),
        "TCP_WIN_MIN_OUT": np.random.randint(0, 32768, n),
        "TCP_WIN_MIN_IN": np.random.randint(0, 32768, n),
        "TCP_WIN_MAX_IN": np.random.randint(0, 65535, n),
        "LAST_SWITCHED": np.random.randint(1600000000, 1700000000, n),
        "TCP_WIN_MSS_IN": np.random.randint(0, 1460, n),
        "TOTAL_FLOWS_EXP": np.random.randint(0, 100, n),
        "FIRST_SWITCHED": np.random.randint(1600000000, 1700000000, n),
        "FLOW_DURATION_MILLISECONDS": np.random.exponential(5000, n).astype(int),
        "LABEL": np.random.choice(labels, n, p=weights),
    }

    df = pd.DataFrame(data)
    # Make attacks look different
    attack = df["LABEL"] != "Normal"
    df.loc[attack, "TCP_FLAGS"] = np.random.randint(128, 255, attack.sum())
    df.loc[attack, "DST_TOS"] = np.random.choice([8, 16, 32], attack.sum())
    df.loc[attack, "TCP_WIN_SCALE_IN"] = np.random.randint(10, 15, attack.sum())
    df.loc[attack, "FLOW_DURATION_MILLISECONDS"] = np.random.randint(0, 500, attack.sum())

    print(f"  ✓ Synthetic data generated: {df.shape}")
    return df


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 5 — Feature Engineering (run BEFORE split so derived columns exist)
# ═══════════════════════════════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create domain-specific features from raw network flow columns.
    All derived from the same row's data — no leakage risk.
    """
    df = df.copy()

    # Duration in seconds (more interpretable)
    df["FLOW_DURATION_SEC"] = df["FLOW_DURATION_MILLISECONDS"] / 1000.0

    # TCP window scale asymmetry → attacks often have mismatched windows
    df["WIN_SCALE_DIFF"] = df["TCP_WIN_SCALE_OUT"] - df["TCP_WIN_SCALE_IN"]

    # Ratio of outgoing vs incoming window max → exfiltration signal
    df["WIN_MAX_RATIO"] = df["TCP_WIN_MAX_OUT"] / (df["TCP_WIN_MAX_IN"] + 1)

    # Session duration from switch timestamps → short = scan/DoS
    df["SESSION_DURATION"] = df["LAST_SWITCHED"] - df["FIRST_SWITCHED"]

    # Flag density: TCP flags per second → flag storms = attack
    df["FLAGS_PER_SEC"] = df["TCP_FLAGS"] / (df["FLOW_DURATION_SEC"] + 0.001)

    return df


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 1 — Leakage-Free Split + Encode
# ═══════════════════════════════════════════════════════════════════════════════

def prepare_data(df: pd.DataFrame):
    """
    Correct pipeline order:
      1. Encode target (deterministic, not data-dependent)
      2. Impute missing values
      3. Split FIRST (stratified)
      4. Fit scaler on train ONLY
      5. Carve validation set from train for threshold tuning

    Returns: X_train, X_val, X_test, y_train, y_val, y_test,
             le_target, scaler, feature_names
    """
    # ── Separate X / y ───────────────────────────────────────
    X = df.drop(columns=[TARGET_COL])
    y_raw = df[TARGET_COL]

    # ── Encode target ────────────────────────────────────────
    le_target = LabelEncoder()
    y = le_target.fit_transform(y_raw.astype(str))
    class_names = le_target.classes_
    print(f"\n  Classes: {list(class_names)}")
    print(f"  Distribution: {dict(zip(class_names, np.bincount(y)))}")

    # ── Encode categorical features (if any) ─────────────────
    cat_cols = X.select_dtypes(exclude=["number"]).columns
    for col in cat_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))

    # ── Impute missing values ────────────────────────────────
    num_cols = X.select_dtypes(include=["number"]).columns
    if X[num_cols].isnull().any().any():
        imputer = SimpleImputer(strategy="mean")
        X[num_cols] = imputer.fit_transform(X[num_cols])

    feature_names = list(X.columns)

    # ── PHASE 1: Split FIRST — stratify to preserve class ratios ──
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,  # ← Theft (5%) appears proportionally in both sets
    )

    # ── Carve validation set from train (for threshold tuning) ──
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full, y_train_full,
        test_size=VAL_SIZE,
        random_state=RANDOM_STATE,
        stratify=y_train_full,
    )

    # ── PHASE 1: Fit scaler on TRAIN ONLY ────────────────────
    scaler = StandardScaler()
    X_train = pd.DataFrame(scaler.fit_transform(X_train), columns=feature_names)
    X_val   = pd.DataFrame(scaler.transform(X_val), columns=feature_names)
    X_test  = pd.DataFrame(scaler.transform(X_test), columns=feature_names)

    print(f"\n  Scaler fitted on train only ✓")
    print(f"  Train: {X_train.shape}  Val: {X_val.shape}  Test: {X_test.shape}")
    print(f"  Train class dist: {dict(zip(class_names, np.bincount(y_train)))}")
    print(f"  Test  class dist: {dict(zip(class_names, np.bincount(y_test)))}")

    return X_train, X_val, X_test, y_train, y_val, y_test, le_target, scaler, feature_names


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 2 — Model Definitions (with class imbalance handling)
# ═══════════════════════════════════════════════════════════════════════════════

def get_models(y_train: np.ndarray):
    """
    Returns dict of {name: model} with class imbalance handling built in.
    """
    models = {}

    # Random Forest — class_weight='balanced' auto-computes inverse-frequency weights
    models["Random Forest"] = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    # Decision Tree — class_weight + max_depth cap to prevent overfitting
    models["Decision Tree"] = DecisionTreeClassifier(
        max_depth=12,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )

    # Gaussian NB — no class_weight param, works okay on balanced features
    models["Gaussian NB"] = GaussianNB()

    # XGBoost — uses sample_weight at fit time (handled in train_models)
    if HAS_XGBOOST:
        models["XGBoost"] = XGBClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="mlogloss",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )

    # MLP — increase iterations, wider hidden layer
    models["MLP"] = MLPClassifier(
        hidden_layer_sizes=(256, 128),
        activation="relu",
        max_iter=500,
        early_stopping=True,
        validation_fraction=0.1,
        random_state=RANDOM_STATE,
    )

    return models


def train_models(models: dict, X_train, y_train, X_val, y_val):
    """
    Train all models. XGBoost gets sample_weight for class imbalance
    + early stopping on validation set.
    """
    trained = {}
    sample_weights = compute_sample_weight("balanced", y_train)

    for name, model in models.items():
        print(f"\n  Training {name}...", end=" ")
        t0 = time.time()

        if name == "XGBoost":
            # XGBoost: use sample_weight + early stopping on val set
            model.fit(
                X_train, y_train,
                sample_weight=sample_weights,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )
        else:
            model.fit(X_train, y_train)

        elapsed = time.time() - t0
        trained[name] = model
        print(f"({elapsed:.2f}s)")

    return trained


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 3 — Threshold Tuning via PR Curve
# ═══════════════════════════════════════════════════════════════════════════════

def find_best_thresholds(model, X_val, y_val, class_names):
    """
    For each class, sweep thresholds on the PR curve and return
    the one that maximizes F1.

    ⚠️ MUST be done on the validation set, NOT the test set.
       Tuning on test = overfitting to your evaluation data.

    Returns: dict {class_idx: optimal_threshold}
    """
    try:
        y_proba = model.predict_proba(X_val)
    except AttributeError:
        return None  # Model doesn't support predict_proba

    n_classes = len(class_names)
    y_bin = label_binarize(y_val, classes=range(n_classes))

    # Handle binary case where label_binarize returns 1 column
    if y_bin.shape[1] == 1:
        y_bin = np.hstack([1 - y_bin, y_bin])

    best_thresholds = {}

    for i in range(n_classes):
        prec, rec, thresholds = precision_recall_curve(y_bin[:, i], y_proba[:, i])
        # F1 at each threshold
        f1_scores = 2 * (prec * rec) / (prec + rec + 1e-8)
        best_idx = f1_scores.argmax()
        best_t = float(thresholds[best_idx]) if best_idx < len(thresholds) else 0.5
        best_thresholds[i] = best_t

    return best_thresholds


def predict_with_thresholds(model, X, thresholds, n_classes):
    """
    Apply per-class thresholds instead of naive argmax.
    Predict the class whose (probability − threshold) gap is largest.
    """
    probas = model.predict_proba(X)
    adjusted = probas - np.array([thresholds.get(i, 0.5) for i in range(n_classes)])
    return adjusted.argmax(axis=1)


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 4 — Hyperparameter Tuning (Optuna)
# ═══════════════════════════════════════════════════════════════════════════════

def optimize_xgb(X_train, y_train, n_trials=30):
    """
    Bayesian hyperparameter search for XGBoost.
    Objective: maximize weighted F1 via 5-fold stratified CV.

    Returns: best_params dict
    """
    if not HAS_OPTUNA or not HAS_XGBOOST:
        print("  ⚠️  Skipping Optuna (missing dependencies)")
        return None

    sample_weights = compute_sample_weight("balanced", y_train)

    def objective(trial):
        params = {
            "n_estimators":     trial.suggest_int("n_estimators", 100, 600),
            "max_depth":        trial.suggest_int("max_depth", 3, 10),
            "learning_rate":    trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample":        trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "reg_alpha":        trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
            "reg_lambda":       trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            "eval_metric":      "mlogloss",
            "random_state":     RANDOM_STATE,
            "n_jobs":           -1,
        }

        model = XGBClassifier(**params)
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
        scores = cross_val_score(
            model, X_train, y_train,
            cv=skf,
            scoring="f1_weighted",
            fit_params={"sample_weight": sample_weights},
        )
        return scores.mean()

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

    print(f"\n  ✓ Optuna best F1 (CV): {study.best_value:.4f}")
    print(f"  Best params: {study.best_params}")
    return study.best_params


def optimize_rf(X_train, y_train, n_trials=20):
    """
    Bayesian hyperparameter search for Random Forest.
    """
    if not HAS_OPTUNA:
        return None

    def objective(trial):
        params = {
            "n_estimators":     trial.suggest_int("n_estimators", 100, 500),
            "max_depth":        trial.suggest_int("max_depth", 5, 30),
            "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
            "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 10),
            "class_weight":     "balanced",
            "random_state":     RANDOM_STATE,
            "n_jobs":           -1,
        }

        model = RandomForestClassifier(**params)
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
        scores = cross_val_score(model, X_train, y_train, cv=skf, scoring="f1_weighted")
        return scores.mean()

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

    print(f"\n  ✓ Optuna RF best F1 (CV): {study.best_value:.4f}")
    return study.best_params


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 6 — Comprehensive Evaluation
# ═══════════════════════════════════════════════════════════════════════════════

def full_evaluation(model, X_test, y_test, class_names, thresholds=None, model_name=""):
    """
    Full evaluation with per-class breakdown + macro + weighted averages.
    Returns metrics dict.
    """
    n_classes = len(class_names)

    # Predictions (with or without threshold tuning)
    if thresholds:
        y_pred = predict_with_thresholds(model, X_test, thresholds, n_classes)
    else:
        y_pred = model.predict(X_test)

    # ── Per-class classification report ──
    report = classification_report(y_test, y_pred, target_names=class_names, digits=4)

    # ── Summary metrics ──
    metrics = {
        "Accuracy":             accuracy_score(y_test, y_pred),
        "F1 (weighted)":        f1_score(y_test, y_pred, average="weighted"),
        "F1 (macro)":           f1_score(y_test, y_pred, average="macro"),
        "Precision (weighted)": precision_score(y_test, y_pred, average="weighted", zero_division=0),
        "Precision (macro)":    precision_score(y_test, y_pred, average="macro", zero_division=0),
        "Recall (weighted)":    recall_score(y_test, y_pred, average="weighted", zero_division=0),
        "Recall (macro)":       recall_score(y_test, y_pred, average="macro", zero_division=0),
    }

    # ── ROC-AUC + PR-AUC (require probabilities) ──
    try:
        y_proba = model.predict_proba(X_test)
        y_bin = label_binarize(y_test, classes=range(n_classes))
        if y_bin.shape[1] == 1:
            y_bin = np.hstack([1 - y_bin, y_bin])
        metrics["ROC-AUC"] = roc_auc_score(y_bin, y_proba, multi_class="ovr", average="weighted")
        metrics["PR-AUC"]  = average_precision_score(y_bin, y_proba, average="weighted")
    except Exception:
        metrics["ROC-AUC"] = 0.0
        metrics["PR-AUC"]  = 0.0

    # ── Confusion matrix ──
    cm = confusion_matrix(y_test, y_pred)

    return metrics, report, cm


def print_comparison(results: dict, class_names):
    """Print a comparison table across all models."""
    print("\n" + "=" * 90)
    print("  MODEL COMPARISON TABLE")
    print("=" * 90)

    header = f"{'Model':<20} {'F1(w)':>8} {'F1(m)':>8} {'Prec(w)':>8} {'Rec(w)':>8} {'ROC-AUC':>8} {'PR-AUC':>8}"
    print(header)
    print("-" * 90)

    for name, data in results.items():
        m = data["metrics"]
        tag = data.get("tag", "")
        label = f"{name} {tag}"
        print(
            f"{label:<20} "
            f"{m['F1 (weighted)']:>8.4f} "
            f"{m['F1 (macro)']:>8.4f} "
            f"{m['Precision (weighted)']:>8.4f} "
            f"{m['Recall (weighted)']:>8.4f} "
            f"{m.get('ROC-AUC', 0):>8.4f} "
            f"{m.get('PR-AUC', 0):>8.4f}"
        )

    print("=" * 90)


# ═══════════════════════════════════════════════════════════════════════════════
# Main — Orchestrator
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="CyberSentinel ML Optimizer")
    parser.add_argument("--skip-optuna", action="store_true", help="Skip hyperparameter tuning")
    parser.add_argument("--optuna-trials", type=int, default=30, help="Number of Optuna trials")
    args = parser.parse_args()

    print("=" * 70)
    print("  CyberSentinel-AI — ML Optimization Pipeline")
    print("=" * 70)

    # ── Phase 0: Load Data ───────────────────────────────────────
    print("\n📦 Phase 0: Loading data...")
    df = load_data()

    # ── Phase 5: Feature Engineering (before split — row-level only) ──
    print("\n🔧 Phase 5: Feature engineering...")
    df = engineer_features(df)
    new_cols = [c for c in df.columns if c not in SELECTED_COLUMNS]
    print(f"  New features: {new_cols}")

    # ── Phase 1: Leakage-Free Split ──────────────────────────────
    print("\n🔒 Phase 1: Leakage-free data split...")
    X_train, X_val, X_test, y_train, y_val, y_test, le, scaler, feat_names = prepare_data(df)
    class_names = list(le.classes_)
    n_classes = len(class_names)

    # ── Phase 2: Train Baseline Models (with class weighting) ────
    print("\n🏋️ Phase 2: Training models with class imbalance handling...")
    models = get_models(y_train)
    trained_models = train_models(models, X_train, y_train, X_val, y_val)

    # ── Phase 6a: Evaluate Baseline ──────────────────────────────
    print("\n📊 Phase 6a: Baseline evaluation (default thresholds)...")
    results = {}
    for name, model in trained_models.items():
        metrics, report, cm = full_evaluation(model, X_test, y_test, class_names, model_name=name)
        results[name] = {"metrics": metrics, "report": report, "cm": cm, "tag": ""}
        print(f"\n  ── {name} ──")
        print(report)

    print_comparison(results, class_names)

    # ── Phase 3: Threshold Tuning ────────────────────────────────
    print("\n🎯 Phase 3: Threshold tuning via PR curve...")
    tuned_results = {}
    for name, model in trained_models.items():
        thresholds = find_best_thresholds(model, X_val, y_val, class_names)
        if thresholds:
            metrics, report, cm = full_evaluation(
                model, X_test, y_test, class_names, thresholds=thresholds, model_name=name
            )
            tuned_results[f"{name} (tuned)"] = {
                "metrics": metrics, "report": report, "cm": cm, "tag": "[T]"
            }

            # Compare
            base_f1 = results[name]["metrics"]["F1 (weighted)"]
            new_f1 = metrics["F1 (weighted)"]
            delta = new_f1 - base_f1
            arrow = "↑" if delta > 0 else "↓" if delta < 0 else "="
            print(f"  {name}: F1 {base_f1:.4f} → {new_f1:.4f} ({arrow}{abs(delta):.4f})")

    if tuned_results:
        print("\n  After threshold tuning:")
        print_comparison({**results, **tuned_results}, class_names)

    # ── Phase 4: Optuna Hyperparameter Search ────────────────────
    if not args.skip_optuna and HAS_OPTUNA:
        print("\n🔍 Phase 4: Optuna hyperparameter tuning...")

        # XGBoost
        if HAS_XGBOOST:
            print("\n  Optimizing XGBoost...")
            xgb_params = optimize_xgb(X_train, y_train, n_trials=args.optuna_trials)
            if xgb_params:
                xgb_best = XGBClassifier(
                    **xgb_params, eval_metric="mlogloss",
                    random_state=RANDOM_STATE, n_jobs=-1
                )
                sw = compute_sample_weight("balanced", y_train)
                xgb_best.fit(X_train, y_train, sample_weight=sw,
                             eval_set=[(X_val, y_val)], verbose=False)
                trained_models["XGBoost (Optuna)"] = xgb_best

                # Evaluate Optuna XGBoost
                metrics, report, cm = full_evaluation(
                    xgb_best, X_test, y_test, class_names, model_name="XGBoost (Optuna)"
                )
                results["XGBoost (Optuna)"] = {"metrics": metrics, "report": report, "cm": cm, "tag": "[O]"}
                print(f"\n  ── XGBoost (Optuna) ──")
                print(report)

                # + threshold tuning
                thresholds = find_best_thresholds(xgb_best, X_val, y_val, class_names)
                if thresholds:
                    m2, r2, c2 = full_evaluation(
                        xgb_best, X_test, y_test, class_names, thresholds=thresholds
                    )
                    results["XGBoost (Optuna+T)"] = {"metrics": m2, "report": r2, "cm": c2, "tag": "[O+T]"}

        # Random Forest
        print("\n  Optimizing Random Forest...")
        rf_params = optimize_rf(X_train, y_train, n_trials=min(args.optuna_trials, 20))
        if rf_params:
            rf_best = RandomForestClassifier(
                **rf_params, class_weight="balanced",
                random_state=RANDOM_STATE, n_jobs=-1
            )
            rf_best.fit(X_train, y_train)
            trained_models["Random Forest (Optuna)"] = rf_best

            metrics, report, cm = full_evaluation(
                rf_best, X_test, y_test, class_names, model_name="RF (Optuna)"
            )
            results["RF (Optuna)"] = {"metrics": metrics, "report": report, "cm": cm, "tag": "[O]"}
            print(f"\n  ── Random Forest (Optuna) ──")
            print(report)

    # ── Final Comparison ─────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  FINAL MODEL COMPARISON")
    print("=" * 70)
    all_results = {**results}
    if tuned_results:
        all_results.update(tuned_results)
    print_comparison(all_results, class_names)

    # ── Find best model ──────────────────────────────────────────
    best_name = max(all_results, key=lambda k: all_results[k]["metrics"]["F1 (weighted)"])
    best_f1 = all_results[best_name]["metrics"]["F1 (weighted)"]
    print(f"\n  🏆 Best model: {best_name} (F1 weighted = {best_f1:.4f})")
    print(f"\n  Per-class report for best model:")
    print(all_results[best_name]["report"])

    # ── Save best report ─────────────────────────────────────────
    report_path = RESULTS_DIR / "optimization_report.txt"
    with open(report_path, "w") as f:
        f.write(f"CyberSentinel-AI — ML Optimization Report\n")
        f.write(f"{'='*60}\n\n")
        f.write(f"Best Model: {best_name}\n")
        f.write(f"F1 (weighted): {best_f1:.4f}\n\n")
        for k, v in all_results[best_name]["metrics"].items():
            f.write(f"  {k}: {v:.4f}\n")
        f.write(f"\n{all_results[best_name]['report']}\n")
    print(f"\n  📄 Report saved to: {report_path}")

    print("\n✅ Done!")
    print("\n  'If you only do 3 things' checklist:")
    print("    1. ✅ Fix data leakage (scaler.fit on train only)")
    print("    2. ✅ Add class_weight='balanced' to RF/DT + sample_weight to XGB")
    print("    3. ✅ Tune thresholds via PR curve on validation set")


if __name__ == "__main__":
    main()
