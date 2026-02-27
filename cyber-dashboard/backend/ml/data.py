import os
os.environ.setdefault('OMP_NUM_THREADS', '1')
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('MKL_NUM_THREADS', '1')

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer

SELECTED_COLUMNS = [
    'DST_TOS', 'SRC_TOS', 'TCP_WIN_SCALE_OUT', 'TCP_WIN_SCALE_IN', 'TCP_FLAGS',
    'TCP_WIN_MAX_OUT', 'PROTOCOL', 'TCP_WIN_MIN_OUT', 'TCP_WIN_MIN_IN',
    'TCP_WIN_MAX_IN', 'LAST_SWITCHED', 'TCP_WIN_MSS_IN', 'TOTAL_FLOWS_EXP',
    'FIRST_SWITCHED', 'FLOW_DURATION_MILLISECONDS', 'LABEL'
]
TARGET_COLUMN = 'LABEL'

FEATURE_COLUMNS = [c for c in SELECTED_COLUMNS if c != TARGET_COLUMN]


def generate_synthetic_data(n_samples=10000):
    """Generate realistic synthetic network flow data."""
    np.random.seed(42)

    labels = ['Normal', 'DoS', 'DDoS', 'Reconnaissance', 'Theft']
    weights = [0.60, 0.15, 0.10, 0.10, 0.05]

    data = {
        'DST_TOS':                    np.random.choice([0, 4, 8, 16, 32], n_samples, p=[0.7, 0.1, 0.1, 0.05, 0.05]),
        'SRC_TOS':                    np.random.choice([0, 4, 8, 16, 32], n_samples, p=[0.75, 0.1, 0.05, 0.05, 0.05]),
        'TCP_WIN_SCALE_OUT':          np.random.randint(0, 15, n_samples),
        'TCP_WIN_SCALE_IN':           np.random.randint(0, 15, n_samples),
        'TCP_FLAGS':                  np.random.randint(0, 255, n_samples),
        'TCP_WIN_MAX_OUT':            np.random.randint(0, 65535, n_samples),
        'PROTOCOL':                   np.random.choice([6, 17, 1, 47], n_samples, p=[0.6, 0.25, 0.1, 0.05]),
        'TCP_WIN_MIN_OUT':            np.random.randint(0, 32768, n_samples),
        'TCP_WIN_MIN_IN':             np.random.randint(0, 32768, n_samples),
        'TCP_WIN_MAX_IN':             np.random.randint(0, 65535, n_samples),
        'LAST_SWITCHED':              np.random.randint(1600000000, 1700000000, n_samples),
        'TCP_WIN_MSS_IN':             np.random.randint(0, 1460, n_samples),
        'TOTAL_FLOWS_EXP':            np.random.randint(0, 100, n_samples),
        'FIRST_SWITCHED':             np.random.randint(1600000000, 1700000000, n_samples),
        'FLOW_DURATION_MILLISECONDS': np.random.exponential(5000, n_samples).astype(int),
        'LABEL':                      np.random.choice(labels, n_samples, p=weights),
    }

    df = pd.DataFrame(data)
    attack_mask = df['LABEL'] != 'Normal'
    df.loc[attack_mask, 'TCP_FLAGS'] = np.random.randint(128, 255, attack_mask.sum())
    df.loc[attack_mask, 'DST_TOS'] = np.random.choice([8, 16, 32], attack_mask.sum())
    df.loc[attack_mask, 'TCP_WIN_SCALE_IN'] = np.random.randint(10, 15, attack_mask.sum())
    df.loc[attack_mask, 'FLOW_DURATION_MILLISECONDS'] = np.random.randint(0, 500, attack_mask.sum())

    return df


def load_data(data_dir=None, sample_size=100000):
    """Try to load real CSVs; fall back to synthetic data."""
    import pathlib
    if data_dir:
        data_path = pathlib.Path(data_dir)
        files = ['dataset-part1.csv', 'dataset-part2.csv', 'dataset-part3.csv', 'dataset-part4.csv']
        dfs = []
        for f in files:
            fp = data_path / f
            if fp.exists():
                try:
                    rows = max(200000, sample_size * 2)
                    df = pd.read_csv(fp, usecols=SELECTED_COLUMNS, nrows=rows)
                    df = df.sample(n=min(len(df), sample_size // len(files)), random_state=42)
                    dfs.append(df)
                except Exception:
                    pass
        if dfs:
            full = pd.concat(dfs, ignore_index=True).drop_duplicates()
            return full

    return generate_synthetic_data(sample_size)


def preprocess_data(df):
    """Clean, encode, scale. Returns X, y, label_encoder, scaler, feature_names."""
    df = df.copy()
    X = df.drop(columns=[TARGET_COLUMN])
    y = df[TARGET_COLUMN]

    # Impute
    num_cols = X.select_dtypes(include=['number']).columns
    if len(num_cols) > 0:
        imputer = SimpleImputer(strategy='mean')
        X[num_cols] = imputer.fit_transform(X[num_cols])

    # Encode categoricals
    cat_cols = X.select_dtypes(exclude=['number']).columns
    for col in cat_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))

    # Target
    le_target = LabelEncoder()
    y_encoded = le_target.fit_transform(y.astype(str))

    # Scale
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=X.columns)

    return X_scaled, y_encoded, le_target, scaler, X.columns.tolist()


def split_data(X, y, test_size=0.3):
    """Custom train_test_split using numpy to avoid sklearn model_selection import hangs."""
    n = len(X)
    test_n = int(n * test_size)
    np.random.seed(42)
    indices = np.random.permutation(n)
    
    test_idx = indices[:test_n]
    train_idx = indices[test_n:]
    
    if isinstance(X, pd.DataFrame):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y[train_idx] if isinstance(y, np.ndarray) else y.iloc[train_idx], y[test_idx] if isinstance(y, np.ndarray) else y.iloc[test_idx]
    else:
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        
    return X_train, X_test, y_train, y_test
