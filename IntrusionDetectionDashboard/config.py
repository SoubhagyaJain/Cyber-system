import os
from pathlib import Path

# --- Paths ---
ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR.parent  # Assuming CSVs are in the parent directory of the dashboard folder
MODELS_DIR = ROOT_DIR / "models"
LOGS_DIR = ROOT_DIR / "logs"
ASSETS_DIR = ROOT_DIR / "assets"

# Ensure directories exist
MODELS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# --- Data Configuration ---
DATA_FILES = [
    "dataset-part1.csv",
    "dataset-part2.csv",
    "dataset-part3.csv",
    "dataset-part4.csv"
]
# Feature Columns (Same as training script)
SELECTED_COLUMNS = [
    'DST_TOS', 'SRC_TOS', 'TCP_WIN_SCALE_OUT', 'TCP_WIN_SCALE_IN', 'TCP_FLAGS',
    'TCP_WIN_MAX_OUT', 'PROTOCOL', 'TCP_WIN_MIN_OUT', 'TCP_WIN_MIN_IN',
    'TCP_WIN_MAX_IN', 'LAST_SWITCHED', 'TCP_WIN_MSS_IN', 'TOTAL_FLOWS_EXP',
    'FIRST_SWITCHED', 'FLOW_DURATION_MILLISECONDS', 'LABEL'
]
TARGET_COLUMN = 'LABEL'

# --- Limits & Thresholds ---
SAMPLE_SIZE = 100000        # Default sample size for interactive training
MAX_SAMPLE_SIZE = 500000    # Absolute max for web interface
SHAP_SAMPLE_SIZE = 100      # Number of samples for SHAP (expensive)
RAM_WARNING_THRESHOLD = 80  # % Usage to trigger warning

# --- Model Defaults ---
RANDOM_STATE = 42
CV_FOLDS = 5
TEST_SIZE = 0.3

# --- UI Theme ---
THEME_COLOR = "#00FF9F"
BG_COLOR = "#0E1117"
