import time
import streamlit as st
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neural_network import MLPClassifier
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier
from utils.logger import setup_logger

logger = setup_logger()

@st.cache_resource(show_spinner=False)
def train_model(model_name, X_train, y_train, params=None):
    """
    Train a model with given parameters.
    Cached by Streamlit to avoid re-training on same data/params.
    """
    params = params or {}
    logger.info(f"Training {model_name} with params: {params}")
    
    try:
        if model_name == "Random Forest":
            model = RandomForestClassifier(
                n_estimators=params.get("n_estimators", 200),
                max_depth=params.get("max_depth", None),
                class_weight="balanced",     # handles 60/15/10/10/5 imbalance
                random_state=42,
                n_jobs=-1
            )
        elif model_name == "Decision Tree":
            model = DecisionTreeClassifier(
                max_depth=params.get("max_depth", 12),
                criterion=params.get("criterion", "gini"),
                class_weight="balanced",     # handles class imbalance
                random_state=42
            )
        elif model_name == "Gaussian NB":
            model = GaussianNB()
        
        elif model_name == "XGBoost":
            model = XGBClassifier(
                n_estimators=params.get("n_estimators", 300),
                learning_rate=params.get("learning_rate", 0.05),
                max_depth=params.get("max_depth", 6),
                subsample=0.8,
                colsample_bytree=0.8,
                eval_metric='mlogloss',
                random_state=42,
                n_jobs=-1
            )
        
        elif model_name == "MLP":
            model = MLPClassifier(
                hidden_layer_sizes=params.get("hidden_layer_sizes", (100,)),
                activation=params.get("activation", "relu"),
                max_iter=params.get("max_iter", 200),
                random_state=42
            )
        else:
            raise ValueError(f"Unknown model: {model_name}")

        start_time = time.time()

        # XGBoost gets sample_weight for class imbalance handling
        if model_name == "XGBoost":
            sample_weights = compute_sample_weight("balanced", y_train)
            model.fit(X_train, y_train, sample_weight=sample_weights, verbose=False)
        else:
            model.fit(X_train, y_train)

        training_time = time.time() - start_time
        
        logger.info(f"{model_name} trained in {training_time:.2f}s")
        return model, training_time

    except Exception as e:
        logger.error(f"Training failed for {model_name}: {e}")
        raise e
