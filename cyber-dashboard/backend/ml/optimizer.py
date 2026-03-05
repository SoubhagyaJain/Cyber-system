"""
ml/optimizer.py — Optimized training pipeline for CyberSentinel backend.
Extracted from optimize_models.py (6-phase pipeline):
  Phase 1: Leakage-free split + stratification
  Phase 2: Class imbalance handling (balanced weights + sample_weight)
  Phase 3: Threshold tuning via PR curve
  Phase 5: Feature engineering (domain-specific, row-level only)
  Phase 6: Comprehensive evaluation (per-class + macro + weighted + ROC-AUC + PR-AUC)

Called by server.py /api/train instead of the basic train_single().
"""

import os
os.environ.setdefault('OMP_NUM_THREADS', '1')
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('MKL_NUM_THREADS', '1')

import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score, average_precision_score, classification_report,
    confusion_matrix, f1_score, precision_recall_curve, precision_score,
    recall_score, roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler, label_binarize
from sklearn.tree import DecisionTreeClassifier
from sklearn.utils.class_weight import compute_sample_weight

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

warnings.filterwarnings("ignore", category=UserWarning)

SELECTED_COLUMNS = [
    'DST_TOS', 'SRC_TOS', 'TCP_WIN_SCALE_OUT', 'TCP_WIN_SCALE_IN', 'TCP_FLAGS',
    'TCP_WIN_MAX_OUT', 'PROTOCOL', 'TCP_WIN_MIN_OUT', 'TCP_WIN_MIN_IN',
    'TCP_WIN_MAX_IN', 'LAST_SWITCHED', 'TCP_WIN_MSS_IN', 'TOTAL_FLOWS_EXP',
    'FIRST_SWITCHED', 'FLOW_DURATION_MILLISECONDS', 'LABEL'
]
TARGET_COL = 'LABEL'
RANDOM_STATE = 42
TEST_SIZE = 0.30   # 30% held-out test set
VAL_SIZE  = 0.20   # 20% of train carved for threshold tuning

# Mounted CSV directory (via docker-compose volume)
DATA_DIR = Path('/data')
CSV_FILES = ['dataset-part1.csv', 'dataset-part2.csv', 'dataset-part3.csv', 'dataset-part4.csv']


# ─── Phase 5: Feature Engineering ────────────────────────────────────────────
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create 5 domain-specific features before splitting.
    All derived purely from column values in the same row — no leakage risk.
    """
    df = df.copy()
    df['FLOW_DURATION_SEC'] = df['FLOW_DURATION_MILLISECONDS'] / 1000.0
    df['WIN_SCALE_DIFF']    = df['TCP_WIN_SCALE_OUT'] - df['TCP_WIN_SCALE_IN']
    df['WIN_MAX_RATIO']     = df['TCP_WIN_MAX_OUT'] / (df['TCP_WIN_MAX_IN'] + 1)
    df['SESSION_DURATION']  = df['LAST_SWITCHED'] - df['FIRST_SWITCHED']
    df['FLAGS_PER_SEC']     = df['TCP_FLAGS'] / (df['FLOW_DURATION_SEC'] + 0.001)
    return df


# ─── Phase 0: Data Loading ────────────────────────────────────────────────────
def load_real_or_synthetic(sample_size: int) -> pd.DataFrame:
    """
    Priority:
      1. Read CSVs from /data (mounted volume) — uses full sample_size
      2. Synthetic data matching the exact sample_size requested
    """
    dfs = []
    for fname in CSV_FILES:
        fp = DATA_DIR / fname
        if fp.exists():
            try:
                df = pd.read_csv(fp, usecols=SELECTED_COLUMNS)
                dfs.append(df)
                print(f"[optimizer] Loaded {fname}: {len(df):,} rows")
            except Exception as e:
                print(f"[optimizer] Could not read {fname}: {e}")

    if dfs:
        full = pd.concat(dfs, ignore_index=True).drop_duplicates()
        n = min(len(full), sample_size)
        full = full.sample(n=n, random_state=RANDOM_STATE)
        print(f"[optimizer] Using real CSV data: {n:,} rows ({sample_size:,} requested)")
        return full

    # Synthetic fallback
    print(f"[optimizer] No CSVs found in /data. Generating {sample_size:,} synthetic rows.")
    return _synthetic(sample_size)


def _synthetic(n: int) -> pd.DataFrame:
    np.random.seed(RANDOM_STATE)
    labels  = ['Normal', 'DoS', 'DDoS', 'Reconnaissance', 'Theft']
    weights = [0.60, 0.15, 0.10, 0.10, 0.05]
    data = {
        'DST_TOS':                    np.random.choice([0, 4, 8, 16, 32], n, p=[0.7, 0.1, 0.1, 0.05, 0.05]),
        'SRC_TOS':                    np.random.choice([0, 4, 8, 16, 32], n, p=[0.75, 0.1, 0.05, 0.05, 0.05]),
        'TCP_WIN_SCALE_OUT':          np.random.randint(0, 15, n),
        'TCP_WIN_SCALE_IN':           np.random.randint(0, 15, n),
        'TCP_FLAGS':                  np.random.randint(0, 255, n),
        'TCP_WIN_MAX_OUT':            np.random.randint(0, 65535, n),
        'PROTOCOL':                   np.random.choice([6, 17, 1, 47], n, p=[0.6, 0.25, 0.1, 0.05]),
        'TCP_WIN_MIN_OUT':            np.random.randint(0, 32768, n),
        'TCP_WIN_MIN_IN':             np.random.randint(0, 32768, n),
        'TCP_WIN_MAX_IN':             np.random.randint(0, 65535, n),
        'LAST_SWITCHED':              np.random.randint(1600000000, 1700000000, n),
        'TCP_WIN_MSS_IN':             np.random.randint(0, 1460, n),
        'TOTAL_FLOWS_EXP':            np.random.randint(0, 100, n),
        'FIRST_SWITCHED':             np.random.randint(1600000000, 1700000000, n),
        'FLOW_DURATION_MILLISECONDS': np.random.exponential(5000, n).astype(int),
        'LABEL':                      np.random.choice(labels, n, p=weights),
    }
    df = pd.DataFrame(data)
    attack = df['LABEL'] != 'Normal'
    df.loc[attack, 'TCP_FLAGS']                  = np.random.randint(128, 255, attack.sum())
    df.loc[attack, 'DST_TOS']                    = np.random.choice([8, 16, 32], attack.sum())
    df.loc[attack, 'TCP_WIN_SCALE_IN']           = np.random.randint(10, 15, attack.sum())
    df.loc[attack, 'FLOW_DURATION_MILLISECONDS'] = np.random.randint(0, 500, attack.sum())
    print(f"[optimizer] Generated {len(df):,} synthetic rows")
    return df


# ─── Phase 1: Leakage-Free Split ─────────────────────────────────────────────
def prepare_data(df: pd.DataFrame):
    """
    Correct order: encode → impute → SPLIT → scale (on train only) → carve val.
    Returns: X_train, X_val, X_test, y_train, y_val, y_test, le, scaler, feat_names
    """
    X = df.drop(columns=[TARGET_COL])
    y_raw = df[TARGET_COL]

    le = LabelEncoder()
    y  = le.fit_transform(y_raw.astype(str))
    class_names = le.classes_

    # Encode categorical feature columns
    for col in X.select_dtypes(exclude=['number']).columns:
        X[col] = LabelEncoder().fit_transform(X[col].astype(str))

    # Impute missing values (mean) — fit on full X before split is fine for imputation
    num_cols = X.select_dtypes(include=['number']).columns
    if X[num_cols].isnull().any().any():
        imputer = SimpleImputer(strategy='mean')
        X[num_cols] = imputer.fit_transform(X[num_cols])

    feat_names = list(X.columns)

    # Stratified split — preserves minority class (Theft ~5%) in both sets
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    # Carve validation set from train for threshold tuning
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full, y_train_full,
        test_size=VAL_SIZE, random_state=RANDOM_STATE, stratify=y_train_full
    )

    # Scale: fit on TRAIN ONLY
    scaler = StandardScaler()
    X_train = pd.DataFrame(scaler.fit_transform(X_train), columns=feat_names)
    X_val   = pd.DataFrame(scaler.transform(X_val), columns=feat_names)
    X_test  = pd.DataFrame(scaler.transform(X_test), columns=feat_names)

    print(f"[optimizer] Splits — Train:{len(X_train):,} Val:{len(X_val):,} Test:{len(X_test):,}")
    print(f"[optimizer] Classes: {list(class_names)}")
    return X_train, X_val, X_test, y_train, y_val, y_test, le, scaler, feat_names


# ─── Phase 2: Model Definitions ───────────────────────────────────────────────
def get_model(name: str, params: dict = None):
    """Return a single model with class imbalance handling."""
    p = params or {}
    if name == 'Random Forest':
        return RandomForestClassifier(
            n_estimators=p.get('n_estimators', 200), max_depth=p.get('max_depth', None),
            class_weight='balanced', random_state=RANDOM_STATE, n_jobs=-1
        )
    if name == 'Decision Tree':
        return DecisionTreeClassifier(
            max_depth=p.get('max_depth', 12), criterion=p.get('criterion', 'gini'),
            class_weight='balanced', random_state=RANDOM_STATE
        )
    if name == 'Gaussian NB':
        return GaussianNB()
    if name == 'XGBoost' and HAS_XGBOOST:
        return XGBClassifier(
            n_estimators=p.get('n_estimators', 300), learning_rate=p.get('learning_rate', 0.05),
            max_depth=p.get('max_depth', 6), subsample=0.8, colsample_bytree=0.8,
            eval_metric='mlogloss', random_state=RANDOM_STATE, n_jobs=-1
        )
    if name == 'MLP':
        return MLPClassifier(
            hidden_layer_sizes=(256, 128), activation='relu', max_iter=500,
            early_stopping=True, validation_fraction=0.1, random_state=RANDOM_STATE
        )
    raise ValueError(f"Unknown model: {name}")


def fit_model(name: str, model, X_train, y_train, X_val, y_val):
    """Fit with class imbalance handling. XGBoost gets sample_weight + early stopping."""
    t0 = time.time()
    if name == 'XGBoost' and HAS_XGBOOST:
        sw = compute_sample_weight('balanced', y_train)
        model.fit(X_train, y_train, sample_weight=sw,
                  eval_set=[(X_val, y_val)], verbose=False)
    else:
        model.fit(X_train, y_train)
    return model, round(time.time() - t0, 3)


# ─── Phase 3: Threshold Tuning ────────────────────────────────────────────────
def find_best_thresholds(model, X_val, y_val, n_classes: int):
    """
    Sweep PR curve on VAL SET only (never test set) to find per-class F1-optimal threshold.
    Returns dict {class_idx: threshold} or None if model has no predict_proba.
    """
    try:
        y_proba = model.predict_proba(X_val)
    except AttributeError:
        return None

    y_bin = label_binarize(y_val, classes=range(n_classes))
    if y_bin.shape[1] == 1:
        y_bin = np.hstack([1 - y_bin, y_bin])

    thresholds = {}
    for i in range(n_classes):
        prec, rec, t = precision_recall_curve(y_bin[:, i], y_proba[:, i])
        f1 = 2 * (prec * rec) / (prec + rec + 1e-8)
        best_idx = f1.argmax()
        thresholds[i] = float(t[best_idx]) if best_idx < len(t) else 0.5
    return thresholds


def predict_with_thresholds(model, X, thresholds: dict, n_classes: int):
    """Apply per-class thresholds: predict class with largest (proba − threshold) gap."""
    probas   = model.predict_proba(X)
    adjusted = probas - np.array([thresholds.get(i, 0.5) for i in range(n_classes)])
    return adjusted.argmax(axis=1)


# ─── Phase 6: Full Evaluation ─────────────────────────────────────────────────
def evaluate_full(model, X_test, y_test, class_names, thresholds=None):
    """
    Returns metrics dict compatible with server.py's /api/models response format.
    Includes: accuracy, precision, recall, f1, roc_auc, confusion_matrix,
              f1_macro, precision_macro, recall_macro, pr_auc
    """
    n_classes = len(class_names)
    if thresholds:
        y_pred = predict_with_thresholds(model, X_test, thresholds, n_classes)
    else:
        y_pred = model.predict(X_test)

    metrics = {
        'accuracy':         round(accuracy_score(y_test, y_pred), 6),
        'precision':        round(precision_score(y_test, y_pred, average='weighted', zero_division=0), 6),
        'recall':           round(recall_score(y_test, y_pred, average='weighted', zero_division=0), 6),
        'f1':               round(f1_score(y_test, y_pred, average='weighted', zero_division=0), 6),
        'f1_macro':         round(f1_score(y_test, y_pred, average='macro', zero_division=0), 6),
        'precision_macro':  round(precision_score(y_test, y_pred, average='macro', zero_division=0), 6),
        'recall_macro':     round(recall_score(y_test, y_pred, average='macro', zero_division=0), 6),
        'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
    }

    # ROC-AUC + PR-AUC
    try:
        y_proba = model.predict_proba(X_test)
        y_bin   = label_binarize(y_test, classes=range(n_classes))
        if y_bin.shape[1] == 1:
            y_bin = np.hstack([1 - y_bin, y_bin])
        metrics['roc_auc'] = round(roc_auc_score(y_bin, y_proba, multi_class='ovr', average='weighted'), 6)
        metrics['pr_auc']  = round(average_precision_score(y_bin, y_proba, average='weighted'), 6)
    except Exception:
        metrics['roc_auc'] = 0.0
        metrics['pr_auc']  = 0.0

    return metrics, y_pred


# ─── Main Entry Point (called by server.py) ───────────────────────────────────
def run_optimized_training(model_names: list, sample_size: int):
    """
    Full optimized pipeline for one or more models.
    Returns dict compatible with server.py's /api/train response:
      {
        model_name: {metrics, X_test (DataFrame), y_test, model_obj, classes, feature_names},
        ...
      }
    """
    # Phase 0: Load data
    df = load_real_or_synthetic(sample_size)

    # Phase 5: Feature Engineering (before split, row-level only)
    df = engineer_features(df)

    # Phase 1: Leakage-free split
    X_train, X_val, X_test, y_train, y_val, y_test, le, scaler, feat_names = prepare_data(df)
    class_names = list(le.classes_)
    n_classes   = len(class_names)

    results = {}

    for name in model_names:
        try:
            print(f"[optimizer] Training {name} on {len(X_train):,} rows...")
            # Phase 2: Train with class weighting
            model = get_model(name)
            model, t_time = fit_model(name, model, X_train, y_train, X_val, y_val)

            # Phase 6: Evaluate (default thresholds first)
            metrics, y_pred = evaluate_full(model, X_test, y_test, class_names)

            # Phase 3: Threshold tuning → re-evaluate (val set, then test)
            thresholds = find_best_thresholds(model, X_val, y_val, n_classes)
            if thresholds:
                tuned_metrics, y_pred_tuned = evaluate_full(
                    model, X_test, y_test, class_names, thresholds=thresholds
                )
                # Use tuned metrics if F1 improved
                if tuned_metrics['f1'] > metrics['f1']:
                    metrics = tuned_metrics
                    y_pred  = y_pred_tuned
                    print(f"[optimizer] {name}: threshold tuning improved F1 "
                          f"{metrics['f1']:.4f}")

            metrics['train_time'] = t_time
            print(f"[optimizer] {name}: F1={metrics['f1']:.4f} "
                  f"Acc={metrics['accuracy']:.4f} ROC-AUC={metrics['roc_auc']:.4f} ({t_time}s)")

            results[name] = {
                'model':         model,
                'metrics':       metrics,
                'y_test':        y_test,
                'y_pred':        y_pred,
                'classes':       class_names,
                'feature_names': feat_names,
                'X_test':        X_test,
            }

        except Exception as e:
            import traceback
            print(f"[optimizer] ERROR training {name}: {e}")
            traceback.print_exc()

    return results, class_names, feat_names, X_test, y_test
