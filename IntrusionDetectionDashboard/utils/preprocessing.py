import pandas as pd
import numpy as np
import streamlit as st
import psutil
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler
from sklearn.impute import SimpleImputer
from config import DATA_DIR, DATA_FILES, SELECTED_COLUMNS, TARGET_COLUMN, RAM_WARNING_THRESHOLD
from utils.logger import setup_logger

logger = setup_logger()

def get_system_metrics():
    """
    Returns current RAM and CPU usage.
    """
    ram = psutil.virtual_memory()
    cpu = psutil.cpu_percent(interval=None)
    return {
        "ram_percent": ram.percent,
        "ram_used_gb": round(ram.used / (1024**3), 2),
        "ram_total_gb": round(ram.total / (1024**3), 2),
        "cpu_percent": cpu
    }

@st.cache_data(show_spinner=False)
def load_data(sample_size=None):
    """
    Load data from CSVs with optional sampling to save memory.
    Cached by Streamlit.
    """
    dfs = []
    
    # Check RAM before loading
    metrics = get_system_metrics()
    if metrics["ram_percent"] > RAM_WARNING_THRESHOLD:
        st.warning(f"⚠️ High Memory Usage detected ({metrics['ram_percent']}%)! Enforcing strict sampling.")
        sample_size = min(sample_size or 50000, 50000)

    try:
        for file in DATA_FILES:
            file_path = DATA_DIR / file
            if file_path.exists():
                logger.info(f"Loading {file}...")
                
                if sample_size:
                    rows_to_read = max(200000, sample_size * 2) 
                    df = pd.read_csv(file_path, usecols=SELECTED_COLUMNS, nrows=rows_to_read)
                    df = df.sample(n=min(len(df), sample_size // len(DATA_FILES)), random_state=42)
                else:
                    df = pd.read_csv(file_path, usecols=SELECTED_COLUMNS)
                
                for col in df.select_dtypes(include=['float64']).columns:
                    df[col] = df[col].astype('float32')
                for col in df.select_dtypes(include=['int64']).columns:
                    df[col] = df[col].astype('int32')

                dfs.append(df)
            else:
                logger.warning(f"File not found: {file}")
        
        if not dfs:
            logger.warning("No CSV files found — generating synthetic demo data.")
            st.info("📦 No dataset CSVs found. Using synthetic demo data. See README for full dataset instructions.")
            return _generate_synthetic_data(sample_size or 10000)
            
        full_df = pd.concat(dfs, ignore_index=True)
        full_df.drop_duplicates(inplace=True)
        logger.info(f"Data loaded successfully. Shape: {full_df.shape}")
        
        return full_df
        
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        st.warning(f"Data load failed ({e}). Falling back to synthetic data.")
        return _generate_synthetic_data(sample_size or 10000)


def _generate_synthetic_data(n_samples=10000):
    """
    Generate realistic synthetic network flow data when real CSVs are unavailable.
    Produces the same columns as the real dataset so all downstream code works.
    """
    np.random.seed(42)

    labels = ['Normal', 'DoS', 'DDoS', 'Reconnaissance', 'Theft']
    weights = [0.60, 0.15, 0.10, 0.10, 0.05]

    data = {
        'DST_TOS':                     np.random.choice([0, 4, 8, 16, 32], n_samples, p=[0.7, 0.1, 0.1, 0.05, 0.05]),
        'SRC_TOS':                     np.random.choice([0, 4, 8, 16, 32], n_samples, p=[0.75, 0.1, 0.05, 0.05, 0.05]),
        'TCP_WIN_SCALE_OUT':           np.random.randint(0, 15, n_samples),
        'TCP_WIN_SCALE_IN':            np.random.randint(0, 15, n_samples),
        'TCP_FLAGS':                   np.random.randint(0, 255, n_samples),
        'TCP_WIN_MAX_OUT':             np.random.randint(0, 65535, n_samples),
        'PROTOCOL':                    np.random.choice([6, 17, 1, 47], n_samples, p=[0.6, 0.25, 0.1, 0.05]),
        'TCP_WIN_MIN_OUT':             np.random.randint(0, 32768, n_samples),
        'TCP_WIN_MIN_IN':              np.random.randint(0, 32768, n_samples),
        'TCP_WIN_MAX_IN':              np.random.randint(0, 65535, n_samples),
        'LAST_SWITCHED':               np.random.randint(1600000000, 1700000000, n_samples),
        'TCP_WIN_MSS_IN':              np.random.randint(0, 1460, n_samples),
        'TOTAL_FLOWS_EXP':             np.random.randint(0, 100, n_samples),
        'FIRST_SWITCHED':              np.random.randint(1600000000, 1700000000, n_samples),
        'FLOW_DURATION_MILLISECONDS':  np.random.exponential(5000, n_samples).astype(int),
        'LABEL':                       np.random.choice(labels, n_samples, p=weights),
    }

    # Make attacks look different from normal traffic
    df = pd.DataFrame(data)
    attack_mask = df['LABEL'] != 'Normal'
    df.loc[attack_mask, 'TCP_FLAGS'] = np.random.randint(128, 255, attack_mask.sum())
    df.loc[attack_mask, 'DST_TOS'] = np.random.choice([8, 16, 32], attack_mask.sum())
    df.loc[attack_mask, 'TCP_WIN_SCALE_IN'] = np.random.randint(10, 15, attack_mask.sum())
    df.loc[attack_mask, 'FLOW_DURATION_MILLISECONDS'] = np.random.randint(0, 500, attack_mask.sum())

    for col in df.select_dtypes(include=['float64']).columns:
        df[col] = df[col].astype('float32')
    for col in df.select_dtypes(include=['int64']).columns:
        df[col] = df[col].astype('int32')

    logger.info(f"Synthetic data generated. Shape: {df.shape}")
    return df

@st.cache_data(show_spinner=False)
def preprocess_data(df, target_col=TARGET_COLUMN):
    """
    Clean, Encode (but do NOT scale) the data.
    Scaling must happen AFTER train/test split to prevent data leakage.
    Returns: X (unscaled), y, label_encoder_target
    """
    try:
        logger.info("Starting preprocessing...")
        df = df.copy()
        
        # Separate X and y
        X = df.drop(columns=[target_col])
        y = df[target_col]

        # Handle Missing Values (Imputation)
        num_cols = X.select_dtypes(include=['number']).columns
        if len(num_cols) > 0:
            imputer = SimpleImputer(strategy='mean')
            X[num_cols] = imputer.fit_transform(X[num_cols])

        # Categorical Encoding (Features)
        cat_cols = X.select_dtypes(exclude=['number']).columns
        for col in cat_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))

        # Target Encoding
        le_target = LabelEncoder()
        y = le_target.fit_transform(y.astype(str))

        # NOTE: Scaling intentionally NOT done here.
        # Use scale_after_split() after calling split_data().
        return X, y, le_target

    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        st.error(f"Preprocessing Error: {e}")
        return None, None, None


def scale_after_split(X_train, X_test):
    """
    Fit scaler on train only, transform both — prevents data leakage.
    Call this AFTER split_data(), never before.
    Returns: X_train_scaled, X_test_scaled, fitted scaler
    """
    scaler = StandardScaler()
    cols = X_train.columns
    X_train_scaled = pd.DataFrame(scaler.fit_transform(X_train), columns=cols)
    X_test_scaled  = pd.DataFrame(scaler.transform(X_test), columns=cols)
    logger.info("Scaler fitted on train only ✓ (no data leakage)")
    return X_train_scaled, X_test_scaled, scaler

def split_data(X, y, test_size=0.3, random_state=42):
    """
    Splits data into training and testing sets.
    Attempts stratified split; falls back to random split if any class has too few samples.
    """
    try:
        return train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)
    except ValueError as e:
        logger.warning(f"Stratified split failed ({e}). Falling back to non-stratified split.")
        return train_test_split(X, y, test_size=test_size, random_state=random_state)
