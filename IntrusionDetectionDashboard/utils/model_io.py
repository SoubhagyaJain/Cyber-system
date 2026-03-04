import joblib
import os
from pathlib import Path
from datetime import datetime
from config import MODELS_DIR
from utils.logger import setup_logger

logger = setup_logger()

def save_model(model, model_name, metadata=None):
    """
    Save a trained model and optional metadata to the models directory.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{model_name}_{timestamp}.joblib"
    filepath = MODELS_DIR / filename
    
    payload = {
        "model": model,
        "name": model_name,
        "timestamp": timestamp,
        "metadata": metadata or {}
    }
    
    try:
        joblib.dump(payload, filepath)
        logger.info(f"Model saved successfully: {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"Failed to save model {model_name}: {e}")
        raise e

def load_model(filename):
    """
    Load a model from the models directory.
    """
    filepath = MODELS_DIR / filename
    try:
        payload = joblib.load(filepath)
        logger.info(f"Model loaded successfully: {filename}")
        return payload
    except Exception as e:
        logger.error(f"Failed to load model {filename}: {e}")
        raise e

def list_models():
    """
    List all available model files in the models directory.
    """
    try:
        files = [f.name for f in MODELS_DIR.glob("*.joblib")]
        return sorted(files, reverse=True) # Newest first
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        return []
