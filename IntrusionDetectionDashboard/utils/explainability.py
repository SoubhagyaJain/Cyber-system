import shap
import streamlit as st
import matplotlib.pyplot as plt
import pandas as pd
from config import SHAP_SAMPLE_SIZE
from utils.logger import setup_logger

logger = setup_logger()

# St.cache_data requires hashing, models might not handle it well unless ignored
# We'll use a wrapper
def compute_shap_values(model, X_sample, model_type="tree"):
    """
    Compute SHAP values for a given model and sample.
    """
    try:
        logger.info(f"Computing SHAP values for {model_type} model...")
        
        if model_type in ["Random Forest", "Decision Tree", "XGBoost"]: 
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_sample)
        else:
            # Kernel explainer for others (slower)
            explainer = shap.KernelExplainer(model.predict_proba, X_sample)
            shap_values = explainer.shap_values(X_sample)
            
        return explainer, shap_values
    except Exception as e:
        logger.error(f"SHAP computation failed: {e}")
        return None, None

def plot_shap_summary(explainer, shap_values, X_sample):
    """
    Generate SHAP summary plot.
    """
    try:
        fig, ax = plt.subplots()
        # Summary plot returns a matplotlib figure usually
        shap.summary_plot(shap_values, X_sample, show=False, plot_type="bar")
        return fig
    except Exception as e:
        logger.error(f"SHAP plot failed: {e}")
        st.error("Could not generate SHAP plot.")
        return None
