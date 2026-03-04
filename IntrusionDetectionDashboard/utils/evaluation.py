import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_auc_score, roc_curve
from utils.logger import setup_logger

logger = setup_logger()

def evaluate_model(model, X_test, y_test):
    """
    Calculate performance metrics.
    """
    try:
        y_pred = model.predict(X_test)
        
        # Calculate proba only if model supports it
        try:
            y_proba = model.predict_proba(X_test)
        except:
            y_proba = None

        metrics = {
            "Accuracy": accuracy_score(y_test, y_pred),
            "Precision": precision_score(y_test, y_pred, average='weighted'),
            "Recall": recall_score(y_test, y_pred, average='weighted'),
            "F1 Score": f1_score(y_test, y_pred, average='weighted')
        }
        
        return metrics, y_pred, y_proba
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        return {}, [], None

def plot_confusion_matrix(y_true, y_pred, labels):
    """
    Generate a Confusion Matrix Heatmap using Plotly.
    """
    cm = confusion_matrix(y_true, y_pred)
    
    fig = px.imshow(
        cm,
        text_auto=True,
        labels=dict(x="Predicted", y="Actual", color="Count"),
        x=labels,
        y=labels,
        color_continuous_scale="Viridis"
    )
    fig.update_layout(
        title="Confusion Matrix",
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font_color="white"
    )
    return fig

def plot_roc_curve_multiclass(model, X_test, y_test, classes):
    """
    Generate ROC Curve for multiclass classification.
    """
    try:
        y_score = model.predict_proba(X_test)
    except:
        return None  # Model doesn't support probability
        
    from sklearn.preprocessing import label_binarize
    y_test_bin = label_binarize(y_test, classes=range(len(classes)))
    n_classes = y_test_bin.shape[1]

    fig = go.Figure()

    for i in range(n_classes):
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_score[:, i])
        fig.add_trace(go.Scatter(
            x=fpr, y=tpr,
            name=f"Class {classes[i]}",
            mode='lines'
        ))

    fig.add_shape(
        type='line', line=dict(dash='dash'),
        x0=0, x1=1, y0=0, y1=1
    )

    fig.update_layout(
        title="ROC Curve (Multiclass)",
        xaxis_title="False Positive Rate",
        yaxis_title="True Positive Rate",
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font_color="white",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    return fig

def plot_feature_importance(model, feature_names):
    """
    Plot feature importance for tree-based models.
    """
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        df = pd.DataFrame({"Feature": feature_names, "Importance": importances})
        df = df.sort_values("Importance", ascending=True)
        
        fig = px.bar(
            df, 
            x="Importance", 
            y="Feature", 
            orientation='h',
            color="Importance",
            color_continuous_scale="emrld"
        )
        fig.update_layout(
            title="Feature Importance",
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font_color="white",
            height=600
        )
        return fig
    return None
