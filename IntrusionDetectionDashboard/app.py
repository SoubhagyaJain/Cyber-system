import streamlit as st
import pandas as pd
import numpy as np
import time
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime

# Custom Modules
from config import *
from utils.logger import setup_logger
from utils.preprocessing import load_data, preprocess_data, split_data, scale_after_split, get_system_metrics
from utils.training import train_model
from utils.evaluation import evaluate_model, plot_confusion_matrix, plot_roc_curve_multiclass, plot_feature_importance
from utils.model_io import save_model, load_model, list_models
try:
    from utils.explainability import compute_shap_values, plot_shap_summary
except ImportError:
    pass

# --- Page Config ---
st.set_page_config(
    page_title="CyberSentinel SOC",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

def load_css():
    with open(ASSETS_DIR / "style.css") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
load_css()
logger = setup_logger()

# ============================================================
# ALL MODEL ARCHITECTURES
# ============================================================
ALL_MODELS = ["Random Forest", "Decision Tree", "Gaussian NB", "XGBoost", "MLP"]

# ============================================================
# SINGLE SOURCE OF TRUTH — Session State
# ============================================================
def init_state():
    defaults = {
        # Model
        'model': None,
        'active_model_name': "None",
        'is_trained': False,
        'test_data': None,
        'classes': [],
        'feature_names': [],
        # Model Registry
        'model_registry': {},       # {name: {model, accuracy, precision, recall, f1, roc_auc, train_time}}
        'best_model_name': None,
        'registry_ready': False,
        # Simulation
        'simulation_running': False,
        'total_packets': 0,
        'blocked_packets': 0,
        'attack_history': [],
        'packet_log': [],
        'unique_ips': set(),
        'threat_level': "LOW",
        'last_packet_time': "—",
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val

init_state()

# ============================================================
# CENTRAL SIMULATION ENGINE
# ============================================================
PROTOCOLS = ["TCP", "UDP", "ICMP", "HTTP", "DNS", "TLS", "SSH"]

def simulate_packet(model, X_test, classes):
    idx = np.random.randint(0, len(X_test))
    sample = X_test.iloc[[idx]]
    probs = model.predict_proba(sample)[0]
    pred_idx = np.argmax(probs)
    confidence = probs[pred_idx]
    label = classes[pred_idx]

    is_attack = label != "Normal" and label != 0
    src_ip = f"10.0.{np.random.randint(1,255)}.{np.random.randint(1,255)}"
    protocol = np.random.choice(PROTOCOLS)
    timestamp = datetime.now().strftime("%H:%M:%S")

    st.session_state['total_packets'] += 1
    st.session_state['unique_ips'].add(src_ip)
    st.session_state['last_packet_time'] = timestamp
    if is_attack:
        st.session_state['blocked_packets'] += 1

    st.session_state['attack_history'].append(1 if is_attack else 0)
    if len(st.session_state['attack_history']) > 30:
        st.session_state['attack_history'].pop(0)

    update_threat_level()

    severity = "log-high" if is_attack else "log-low"
    status_icon = "⛔" if is_attack else "✅"
    log_entry = f"""
    <div class="log-row {severity}">
        <span>[{timestamp}]</span>
        <span>{src_ip}</span>
        <span>{protocol}</span>
        <span>{status_icon} {label}</span>
        <span>Conf: {confidence:.2f}</span>
    </div>
    """
    st.session_state['packet_log'].insert(0, log_entry)
    st.session_state['packet_log'] = st.session_state['packet_log'][:50]


def update_threat_level():
    history = st.session_state['attack_history']
    if not history:
        st.session_state['threat_level'] = "LOW"
        return
    rate = sum(history) / len(history)
    if rate > 0.20:
        st.session_state['threat_level'] = "HIGH"
    elif rate > 0.05:
        st.session_state['threat_level'] = "MODERATE"
    else:
        st.session_state['threat_level'] = "LOW"


def reset_simulation():
    st.session_state['simulation_running'] = False
    st.session_state['total_packets'] = 0
    st.session_state['blocked_packets'] = 0
    st.session_state['attack_history'] = []
    st.session_state['packet_log'] = []
    st.session_state['unique_ips'] = set()
    st.session_state['threat_level'] = "LOW"
    st.session_state['last_packet_time'] = "—"
    logger.info("Simulation state reset.")


def get_attack_rate():
    h = st.session_state['attack_history']
    return (sum(h) / len(h) * 100) if h else 0.0


def get_threat_color(level):
    if level == "HIGH": return "threat-level-high"
    if level == "MODERATE": return "threat-level-mod"
    return "threat-level-low"


def set_active_model(name):
    """Switch active model from registry. Resets simulation."""
    reg = st.session_state['model_registry']
    if name in reg:
        reset_simulation()
        st.session_state['model'] = reg[name]['model']
        st.session_state['active_model_name'] = name
        st.session_state['is_trained'] = True
        logger.info(f"Active model switched to {name}.")


def get_active_model():
    """Return the current active model object."""
    return st.session_state.get('model')


# ============================================================
# MULTI-MODEL TRAINING
# ============================================================
def train_all_models(X_train, y_train, X_test, y_test, classes):
    """Train all models, evaluate, and populate registry."""
    from sklearn.metrics import roc_auc_score
    from sklearn.preprocessing import label_binarize

    registry = {}
    progress = st.progress(0, text="Initializing training pipeline...")

    for i, name in enumerate(ALL_MODELS):
        progress.progress((i) / len(ALL_MODELS), text=f"Training {name}...")
        try:
            model, t_time = train_model(name, X_train, y_train, {})
            metrics, y_pred, y_proba = evaluate_model(model, X_test, y_test)

            # ROC-AUC (multi-class)
            roc_auc = 0.0
            if y_proba is not None:
                try:
                    y_bin = label_binarize(y_test, classes=range(len(classes)))
                    roc_auc = roc_auc_score(y_bin, y_proba, multi_class='ovr', average='weighted')
                except Exception:
                    roc_auc = 0.0

            registry[name] = {
                'model': model,
                'accuracy': metrics.get('Accuracy', 0),
                'precision': metrics.get('Precision', 0),
                'recall': metrics.get('Recall', 0),
                'f1': metrics.get('F1 Score', 0),
                'roc_auc': roc_auc,
                'train_time': t_time,
                'y_pred': y_pred,
                'y_proba': y_proba,
                'y_test': y_test,
            }
            save_model(model, name)
            logger.info(f"{name}: F1={metrics.get('F1 Score', 0):.4f}, Time={t_time:.2f}s")
        except Exception as e:
            logger.error(f"Failed to train {name}: {e}")
            st.error(f"Failed to train {name}: {e}")

    progress.progress(1.0, text="All models trained.")
    time.sleep(0.5)
    progress.empty()

    # Store
    st.session_state['model_registry'] = registry
    st.session_state['registry_ready'] = True

    # Find best model by F1
    if registry:
        best = max(registry, key=lambda k: registry[k]['f1'])
        st.session_state['best_model_name'] = best
        set_active_model(best)


# ============================================================
# GLOBAL STATUS BAR
# ============================================================
def render_status_bar():
    c1, c2, c3, c4, c5 = st.columns(5)
    sys = get_system_metrics()

    with c1:
        st.metric("Model",
                  st.session_state['active_model_name'],
                  "Online" if st.session_state['is_trained'] else "Offline")
    with c2:
        st.metric("Packets Processed",
                  f"{st.session_state['total_packets']:,}",
                  f"{len(st.session_state['unique_ips'])} IPs")
    with c3:
        tl = st.session_state['threat_level']
        st.markdown(f"""
        <div style="text-align:center;">
            <div style="font-size:0.8rem;color:#8B949E;font-weight:600;">THREAT LEVEL</div>
            <div class="{get_threat_color(tl)}" style="font-size:24px;">{tl}</div>
        </div>
        """, unsafe_allow_html=True)
    with c4:
        st.metric("Simulation",
                  "🟢 Running" if st.session_state['simulation_running'] else "⚪ Stopped",
                  st.session_state['last_packet_time'])
    with c5:
        st.metric("System RAM", f"{sys['ram_percent']}%",
                  "⚠️ High" if sys['ram_percent'] > RAM_WARNING_THRESHOLD else "Stable")
    st.markdown("---")

render_status_bar()

# ============================================================
# SIDEBAR
# ============================================================
with st.sidebar:
    st.title("🛡️ CyberSentinel")
    st.caption("SOC Control Panel v3.0")

    with st.expander("⚙️ Configuration", expanded=False):
        sample_size = st.slider("Sample Size", 10000, MAX_SAMPLE_SIZE, SAMPLE_SIZE, step=10000)

    with st.expander("🧠 Model Control", expanded=True):
        # Single model train
        model_name = st.selectbox("Architecture", ALL_MODELS)
        params = {}
        if model_name == "Random Forest":
            params['n_estimators'] = st.slider("Trees", 10, 100, 30)

        c_train, c_load = st.columns(2)
        with c_train:
            if st.button("🚀 TRAIN", help="Train selected model"):
                with st.spinner("Training..."):
                    df = load_data(sample_size=sample_size)
                    if not df.empty:
                        X, y, le = preprocess_data(df)
                        X_train, X_test, y_train, y_test = split_data(X, y)
                        X_train, X_test, scaler = scale_after_split(X_train, X_test)
                        st.session_state['test_data'] = (X_test, y_test)
                        st.session_state['classes'] = le.classes_
                        st.session_state['feature_names'] = X.columns.tolist()

                        model, t_time = train_model(model_name, X_train, y_train, params)
                        metrics, y_pred, y_proba = evaluate_model(model, X_test, y_test)

                        # Add to registry
                        from sklearn.metrics import roc_auc_score
                        from sklearn.preprocessing import label_binarize
                        roc_auc = 0.0
                        if y_proba is not None:
                            try:
                                y_bin = label_binarize(y_test, classes=range(len(le.classes_)))
                                roc_auc = roc_auc_score(y_bin, y_proba, multi_class='ovr', average='weighted')
                            except Exception:
                                pass
                        st.session_state['model_registry'][model_name] = {
                            'model': model, 'accuracy': metrics.get('Accuracy', 0),
                            'precision': metrics.get('Precision', 0), 'recall': metrics.get('Recall', 0),
                            'f1': metrics.get('F1 Score', 0), 'roc_auc': roc_auc,
                            'train_time': t_time, 'y_pred': y_pred, 'y_proba': y_proba,
                            'y_test': y_test,
                        }
                        set_active_model(model_name)
                        save_model(model, model_name)
                        st.rerun()

        with c_load:
            if st.button("📂 LOAD"):
                models = list_models()
                if models:
                    payload = load_model(models[0])
                    st.session_state['model'] = payload['model']
                    st.session_state['is_trained'] = True
                    st.session_state['active_model_name'] = payload['name']
                    st.rerun()

        st.markdown("---")
        # Train All
        if st.button("⚡ TRAIN ALL MODELS", use_container_width=True, type="primary"):
            df = load_data(sample_size=sample_size)
            if not df.empty:
                X, y, le = preprocess_data(df)
                X_train, X_test, y_train, y_test = split_data(X, y)
                X_train, X_test, scaler = scale_after_split(X_train, X_test)
                st.session_state['test_data'] = (X_test, y_test)
                st.session_state['classes'] = le.classes_
                st.session_state['feature_names'] = X.columns.tolist()
                train_all_models(X_train, y_train, X_test, y_test, le.classes_)
                st.rerun()

    # Active model selector (from registry)
    if st.session_state['model_registry']:
        with st.expander("🎯 Active Model", expanded=True):
            reg = st.session_state['model_registry']
            best = st.session_state.get('best_model_name', '')
            options = list(reg.keys())
            current_idx = options.index(st.session_state['active_model_name']) if st.session_state['active_model_name'] in options else 0

            selected = st.selectbox("Select Active Model", options, index=current_idx,
                                    format_func=lambda x: f"🏆 {x} (Best)" if x == best else x)
            if selected != st.session_state['active_model_name']:
                set_active_model(selected)
                st.rerun()

            if best and best != st.session_state['active_model_name']:
                if st.button(f"🏆 Use Best: {best}", use_container_width=True):
                    set_active_model(best)
                    st.rerun()

    with st.expander("🖥️ System Health"):
        sys_m = get_system_metrics()
        st.progress(sys_m['ram_percent'] / 100)
        st.caption(f"RAM: {sys_m['ram_used_gb']} GB")

# ============================================================
# TABS
# ============================================================
tab_over, tab_ops, tab_compare, tab_intel, tab_res = st.tabs([
    "📊 OVERVIEW", "🚨 REAL-TIME OPS", "📈 MODEL COMPARISON", "🧠 INTELLIGENCE", "🖥️ RESOURCES"
])

# --- 1. OVERVIEW ---
with tab_over:
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Traffic", f"{st.session_state['total_packets']:,}",
              f"+{st.session_state['total_packets']}" if st.session_state['total_packets'] else "Idle")
    c2.metric("Attack Rate", f"{get_attack_rate():.1f}%",
              f"{st.session_state['blocked_packets']} blocked")
    c3.metric("Unique IPs", f"{len(st.session_state['unique_ips']):,}", "Live Sources")
    c4.metric("Threat Level", st.session_state['threat_level'],
              "Active" if st.session_state['simulation_running'] else "Monitoring")

    col_l, col_r = st.columns([2, 1])
    with col_l:
        st.subheader("Traffic Class Distribution")
        if st.session_state['is_trained'] and st.session_state['test_data']:
            _, y_t = st.session_state['test_data']
            counts = pd.Series(y_t).value_counts()
            fig = px.pie(values=counts.values,
                         names=st.session_state['classes'][counts.index],
                         hole=0.5, color_discrete_sequence=px.colors.qualitative.Pastel)
            fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", font_color="#E6EDF3", height=300)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Train a model to visualize distribution.")
    with col_r:
        st.subheader("Dataset Preview")
        df_prev = load_data(sample_size=100)
        st.dataframe(df_prev.head(10), use_container_width=True, hide_index=True)

    # Model Performance Snapshot (if active)
    if st.session_state['active_model_name'] in st.session_state['model_registry']:
        st.markdown("---")
        st.subheader("Active Model Performance Snapshot")
        entry = st.session_state['model_registry'][st.session_state['active_model_name']]
        mc1, mc2, mc3, mc4 = st.columns(4)
        mc1.metric("Accuracy", f"{entry['accuracy']*100:.1f}%")
        mc2.metric("F1 Score", f"{entry['f1']*100:.1f}%")
        mc3.metric("ROC-AUC", f"{entry['roc_auc']*100:.1f}%")
        mc4.metric("Train Time", f"{entry['train_time']:.2f}s")

# --- 2. REAL-TIME OPS ---
with tab_ops:
    col_stream, col_intel_panel = st.columns([2, 1])

    with col_stream:
        st.subheader("📡 Live Packet Stream")
        log_ph = st.empty()
        logs_html = "".join(st.session_state['packet_log'])
        log_ph.markdown(f'<div class="log-box">{logs_html}</div>', unsafe_allow_html=True)

    with col_intel_panel:
        st.subheader("Threat Intelligence")
        tl = st.session_state['threat_level']
        st.markdown(f"""
        <div style="background:#0D1117;border:1px solid #30363D;padding:20px;border-radius:8px;text-align:center;">
            <div style="color:#8B949E;font-size:0.9rem;margin-bottom:5px;">CURRENT THREAT LEVEL</div>
            <div class="{get_threat_color(tl)}" style="font-size:2.5rem;">{tl}</div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("### Session Metrics")
        m1, m2 = st.columns(2)
        m1.metric("Packets", st.session_state['total_packets'])
        m2.metric("Blocked", st.session_state['blocked_packets'], delta_color="inverse")
        st.metric("Attack Freq (30-pkt)", f"{get_attack_rate():.1f}%")
        st.metric("Unique IPs", len(st.session_state['unique_ips']))

        st.markdown("### Controls")
        if st.session_state['simulation_running']:
            c_stop, c_reset = st.columns(2)
            with c_stop:
                if st.button("⏹ STOP", use_container_width=True):
                    st.session_state['simulation_running'] = False
                    st.rerun()
            with c_reset:
                if st.button("🔄 RESET", use_container_width=True):
                    reset_simulation()
                    st.rerun()
            if st.session_state['is_trained']:
                simulate_packet(get_active_model(),
                                st.session_state['test_data'][0],
                                st.session_state['classes'])
                time.sleep(0.5)
                st.rerun()
        else:
            c_start, c_reset = st.columns(2)
            with c_start:
                if st.button("▶ START", use_container_width=True):
                    if st.session_state['is_trained']:
                        st.session_state['simulation_running'] = True
                        st.rerun()
                    else:
                        st.error("Model Offline. Train first.")
            with c_reset:
                if st.button("🔄 RESET", use_container_width=True, key="reset_stopped"):
                    reset_simulation()
                    st.rerun()

# --- 3. MODEL COMPARISON ---
with tab_compare:
    reg = st.session_state['model_registry']

    if not reg:
        st.markdown("""
        <div style="text-align:center;padding:50px;color:#8B949E;">
            <h3>📈 Model Comparison Module</h3>
            <p>Click <strong>⚡ TRAIN ALL MODELS</strong> in the sidebar to benchmark all architectures.</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        # --- Top Row: Best & Active Cards ---
        best_name = st.session_state.get('best_model_name', '')
        active_name = st.session_state['active_model_name']

        col_best, col_active = st.columns(2)
        with col_best:
            if best_name and best_name in reg:
                b = reg[best_name]
                st.markdown(f"""
                <div style="background:#161B22;border:2px solid #00FF9F;border-radius:8px;padding:20px;">
                    <div style="color:#00FF9F;font-size:1.2rem;font-weight:800;">🏆 BEST MODEL</div>
                    <div style="font-size:1.8rem;color:#E6EDF3;font-weight:700;">{best_name}</div>
                    <div style="color:#8B949E;">F1 Score: <strong style="color:#00FF9F;">{b['f1']*100:.2f}%</strong> | Accuracy: {b['accuracy']*100:.2f}%</div>
                </div>
                """, unsafe_allow_html=True)
        with col_active:
            if active_name in reg:
                a = reg[active_name]
                border = "#1F6FEB"
                st.markdown(f"""
                <div style="background:#161B22;border:2px solid {border};border-radius:8px;padding:20px;">
                    <div style="color:{border};font-size:1.2rem;font-weight:800;">🎯 ACTIVE MODEL</div>
                    <div style="font-size:1.8rem;color:#E6EDF3;font-weight:700;">{active_name}</div>
                    <div style="color:#8B949E;">F1 Score: <strong style="color:{border};">{a['f1']*100:.2f}%</strong> | Accuracy: {a['accuracy']*100:.2f}%</div>
                </div>
                """, unsafe_allow_html=True)

        st.markdown("")

        # --- Build comparison DataFrame ---
        comp_data = []
        for name, entry in reg.items():
            comp_data.append({
                'Model': name,
                'Accuracy': round(entry['accuracy'] * 100, 2),
                'Precision': round(entry['precision'] * 100, 2),
                'Recall': round(entry['recall'] * 100, 2),
                'F1 Score': round(entry['f1'] * 100, 2),
                'ROC-AUC': round(entry['roc_auc'] * 100, 2),
                'Train Time (s)': round(entry['train_time'], 2),
            })
        df_comp = pd.DataFrame(comp_data)

        # --- Summary Table ---
        st.subheader("Performance Summary")
        st.dataframe(df_comp.style.highlight_max(subset=['Accuracy', 'F1 Score', 'ROC-AUC'], color='#1a3a2a'),
                     use_container_width=True, hide_index=True)

        # --- Charts Row 1: Accuracy + F1 ---
        chart_l, chart_r = st.columns(2)

        dark_layout = dict(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                           font_color="#E6EDF3", height=350, margin=dict(l=0, r=0, t=40, b=0))

        with chart_l:
            fig_acc = px.bar(df_comp, x='Model', y='Accuracy', color='Accuracy',
                             color_continuous_scale='emrld', title="Accuracy (%)")
            fig_acc.update_layout(**dark_layout)
            st.plotly_chart(fig_acc, use_container_width=True)

        with chart_r:
            fig_f1 = px.bar(df_comp, x='Model', y='F1 Score', color='F1 Score',
                            color_continuous_scale='tealgrn', title="F1 Score (%)")
            fig_f1.update_layout(**dark_layout)
            st.plotly_chart(fig_f1, use_container_width=True)

        # --- Charts Row 2: ROC-AUC + Training Time ---
        chart_l2, chart_r2 = st.columns(2)
        with chart_l2:
            fig_roc = px.bar(df_comp, x='Model', y='ROC-AUC', color='ROC-AUC',
                             color_continuous_scale='blues', title="ROC-AUC (%)")
            fig_roc.update_layout(**dark_layout)
            st.plotly_chart(fig_roc, use_container_width=True)

        with chart_r2:
            fig_time = px.bar(df_comp, x='Model', y='Train Time (s)', color='Train Time (s)',
                              color_continuous_scale='oryel', title="Training Time (s)")
            fig_time.update_layout(**dark_layout)
            st.plotly_chart(fig_time, use_container_width=True)

        # --- Confusion Matrix Per Model ---
        st.markdown("---")
        st.subheader("Confusion Matrix")
        if st.session_state['test_data']:
            cm_model = st.selectbox("Select model for Confusion Matrix", list(reg.keys()), key="cm_select")
            if cm_model in reg and reg[cm_model].get('y_pred') is not None:
                # Use the y_test stored with this model to ensure consistent sample sizes
                y_t_cm = reg[cm_model].get('y_test')
                if y_t_cm is None:
                    _, y_t_cm = st.session_state['test_data']
                fig_cm = plot_confusion_matrix(y_t_cm, reg[cm_model]['y_pred'], st.session_state['classes'])
                st.plotly_chart(fig_cm, use_container_width=True)

# --- 4. INTELLIGENCE (Educational XAI Engine) ---
with tab_intel:
    if st.session_state['is_trained']:
        active_model = get_active_model()
        active_name = st.session_state['active_model_name']

        # ============================================
        # SECTION 1 — GLOBAL FEATURE IMPORTANCE
        # ============================================
        st.subheader(f"🔬 Global Feature Importance — {active_name}")

        col_chart, col_edu = st.columns([3, 2])

        with col_chart:
            fig = plot_feature_importance(active_model, st.session_state['feature_names'])
            if fig:
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.warning(f"**{active_name}** does not expose feature importances. Try a tree-based model (Random Forest, XGBoost, Decision Tree).")

        with col_edu:
            # A. What Is Feature Importance? (Beginner Panel)
            st.markdown("### 📘 What Is Feature Importance?")
            st.info("""
            **How does the model decide?**

            The model evaluates multiple signals from each network packet. Some signals (features) influence the classification **much more** than others.

            - **Higher importance** = Greater influence on the decision
            - These features help the model separate **normal** vs **malicious** traffic
            - Importance is calculated based on how much each feature reduces prediction error
            """)

            # C. Impact Scale Legend
            st.markdown("### 📊 Impact Scale")
            st.markdown("""
            | Score | Interpretation |
            |:---:|:---|
            | **> 0.15** | 🔴 **Dominant** — Primary decision driver |
            | **0.05 – 0.15** | 🟡 **Strong** — Significant contributor |
            | **< 0.05** | 🟢 **Weak** — Minor influence |
            """)

        # B. Auto-Generated Model Behavior Summary
        if hasattr(active_model, 'feature_importances_'):
            importances = active_model.feature_importances_
            feature_names = st.session_state['feature_names']
            feat_imp = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
            top3 = feat_imp[:3]

            # Intelligent category detection
            def categorize_feature(fname):
                fname_l = fname.lower()
                timing_kw = ['time', 'duration', 'idle', 'active', 'iat', 'ms']
                tcp_kw = ['tcp', 'win', 'flag', 'syn', 'ack', 'rst', 'fin', 'psh', 'urg', 'handshake', 'scale']
                proto_kw = ['tos', 'protocol', 'dscp', 'ttl', 'service', 'port']
                size_kw = ['byte', 'pkt', 'len', 'size', 'payload', 'header']
                for kw in timing_kw:
                    if kw in fname_l: return "timing"
                for kw in tcp_kw:
                    if kw in fname_l: return "tcp"
                for kw in proto_kw:
                    if kw in fname_l: return "protocol"
                for kw in size_kw:
                    if kw in fname_l: return "size"
                return "general"

            categories = [categorize_feature(f[0]) for f in top3]

            # Build narrative
            insights = []
            if "timing" in categories:
                insights.append("**unusual timing patterns** in packet flow (inter-arrival times, session duration), which are hallmarks of automated scanning tools")
            if "tcp" in categories:
                insights.append("**TCP handshake irregularities** (window scaling, flag combinations), indicating protocol-level manipulation typical of reconnaissance or exploitation")
            if "protocol" in categories:
                insights.append("**anomalous service-type fields** (Type of Service, TTL values), suggesting traffic that deviates from standard application behavior")
            if "size" in categories:
                insights.append("**unusual packet sizes or byte distributions**, which can indicate data exfiltration or payload injection")
            if "general" in categories and not insights:
                insights.append("**a combination of network-level features** that collectively diverge from normal traffic baselines")

            insight_text = ", and ".join(insights[:2]) if len(insights) >= 2 else insights[0] if insights else "multiple network features"

            st.markdown("---")
            st.markdown("### 🧠 Model Behavior Analysis")
            st.markdown(f"""
            <div style="background:#161B22;border:1px solid #30363D;border-radius:8px;padding:20px;border-left:4px solid #00FF9F;">
                <div style="color:#00FF9F;font-weight:700;margin-bottom:8px;">AUTO-GENERATED INSIGHT — {active_name}</div>
                <div style="color:#E6EDF3;line-height:1.8;">
                    The model primarily detects malicious traffic based on {insight_text}.
                </div>
                <div style="margin-top:12px;color:#8B949E;font-size:0.85rem;">
                    <strong>Top 3 Features:</strong> {top3[0][0]} ({top3[0][1]:.4f}), {top3[1][0]} ({top3[1][1]:.4f}), {top3[2][0]} ({top3[2][1]:.4f})
                </div>
            </div>
            """, unsafe_allow_html=True)

        # ============================================
        # SECTION 2 — LOCAL EXPLANATION
        # ============================================
        st.markdown("---")
        st.subheader("🔍 Local Explanation — Sample Packet Analysis")

        # Run a live prediction on a random test sample
        if st.session_state['test_data']:
            X_test, y_test = st.session_state['test_data']
            idx = np.random.randint(0, min(len(X_test), 100))
            sample = X_test.iloc[[idx]]
            probs = active_model.predict_proba(sample)[0]
            pred_idx = np.argmax(probs)
            confidence = probs[pred_idx]
            pred_label = st.session_state['classes'][pred_idx]
            true_label = st.session_state['classes'][y_test.iloc[idx]] if hasattr(y_test, 'iloc') else st.session_state['classes'][y_test[idx]]

            is_attack = pred_label != "Normal" and pred_label != 0

            col_why, col_conf = st.columns([3, 2])

            with col_why:
                # A. Why Was This Connection Flagged?
                st.markdown("### ❓ Why Was This Connection Flagged?")

                if is_attack:
                    attack_color = "#FF4B4B"
                    icon = "🚨"
                else:
                    attack_color = "#00FF9F"
                    icon = "✅"

                st.markdown(f"""
                <div style="background:#161B22;border:1px solid #30363D;border-radius:8px;padding:20px;">
                    <div style="font-size:1.3rem;color:{attack_color};font-weight:700;">{icon} Predicted: {pred_label}</div>
                    <div style="color:#8B949E;margin-top:4px;">True Label: {true_label} | Confidence: {confidence*100:.1f}%</div>
                </div>
                """, unsafe_allow_html=True)

                # Feature-based reasoning
                if hasattr(active_model, 'feature_importances_'):
                    top_feats = feat_imp[:3]
                    reasoning_map = {
                        'timing': 'The session exhibited an **unusual timing pattern**, deviating from expected inter-packet intervals for legitimate traffic.',
                        'tcp': 'The **TCP negotiation parameters** (window scale, flags) diverged from standard handshake behavior, suggesting protocol manipulation.',
                        'protocol': 'The **Type of Service / protocol fields** carried unexpected values, inconsistent with normal application-layer traffic.',
                        'size': 'The **packet size distribution** was abnormal, potentially indicating payload injection or data exfiltration attempts.',
                        'general': 'Multiple network-level indicators collectively triggered the classification threshold.'
                    }
                    st.markdown("")
                    for fname, imp in top_feats:
                        cat = categorize_feature(fname)
                        st.markdown(f"- **{fname}** (importance: `{imp:.4f}`): {reasoning_map.get(cat, reasoning_map['general'])}")

                # B. What This Suggests
                st.markdown("")
                if is_attack:
                    st.markdown("""
                    > **Assessment:** This traffic likely represents **scanning, probing, or exploitation behavior** rather than normal user activity. The combination of features mirrors known attack signatures in enterprise network environments.
                    """)
                else:
                    st.markdown("""
                    > **Assessment:** This traffic appears to be **legitimate network activity** consistent with normal application behavior patterns.
                    """)

            with col_conf:
                # C. Confidence Interpretation
                st.markdown("### 📊 Confidence Analysis")

                # Visual confidence gauge
                conf_pct = confidence * 100
                if confidence > 0.9:
                    conf_color = "#00FF9F"
                    conf_label = "HIGH CONFIDENCE"
                    conf_text = "The model is **highly confident** because multiple strong indicators aligned consistently."
                elif confidence > 0.7:
                    conf_color = "#FFC857"
                    conf_label = "MODERATE CONFIDENCE"
                    conf_text = "The model detected **several suspicious signals** but with some ambiguity in the pattern."
                else:
                    conf_color = "#FF4B4B"
                    conf_label = "LOW CONFIDENCE"
                    conf_text = "The classification has **moderate certainty** and may require further manual inspection."

                st.markdown(f"""
                <div style="background:#161B22;border:1px solid #30363D;border-radius:8px;padding:20px;text-align:center;">
                    <div style="font-size:2rem;color:{conf_color};font-weight:800;">{conf_pct:.1f}%</div>
                    <div style="color:{conf_color};font-weight:600;font-size:0.9rem;">{conf_label}</div>
                </div>
                """, unsafe_allow_html=True)
                st.markdown("")
                st.markdown(conf_text)

                # Probability distribution
                st.markdown("### Class Probabilities")
                prob_df = pd.DataFrame({
                    'Class': st.session_state['classes'][:len(probs)],
                    'Probability': probs
                }).sort_values('Probability', ascending=True)

                fig_prob = px.bar(prob_df, x='Probability', y='Class', orientation='h',
                                  color='Probability', color_continuous_scale='emrld')
                fig_prob.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    font_color="#E6EDF3", height=200, margin=dict(l=0, r=0, t=0, b=0),
                    showlegend=False, coloraxis_showscale=False
                )
                st.plotly_chart(fig_prob, use_container_width=True)

        # ============================================
        # SECTION 3 — RESPONSIBLE AI
        # ============================================
        st.markdown("---")
        st.markdown("### ⚖️ Responsible AI & Model Limitations")
        st.markdown("""
        <div style="background:#161B22;border:1px solid #30363D;border-radius:8px;padding:20px;border-left:4px solid #FFC857;">
            <div style="color:#FFC857;font-weight:700;margin-bottom:8px;">⚠️ IMPORTANT NOTICE</div>
            <div style="color:#C9D1D9;line-height:1.8;">
                <strong>Machine learning models may occasionally misclassify legitimate traffic</strong> that resembles attack patterns (false positives), 
                or miss novel attack vectors not represented in training data (false negatives).
                <br/><br/>
                <strong>Recommendations:</strong>
                <ul>
                    <li>Human review is recommended for all critical security decisions</li>
                    <li>Model predictions should complement — not replace — expert analysis</li>
                    <li>Regularly retrain models as new threat signatures emerge</li>
                    <li>Monitor model drift over time to ensure continued accuracy</li>
                </ul>
            </div>
        </div>
        """, unsafe_allow_html=True)

    else:
        # Offline Educational Placeholder
        st.markdown("""
        <div style="text-align:center;padding:40px;color:#8B949E;">
            <h2 style="color:#8B949E;">🔒 Intelligence Module Offline</h2>
            <p style="max-width:600px;margin:auto;line-height:1.8;">
                <strong>Explainable AI (XAI)</strong> helps you understand <em>why</em> a machine learning model 
                made a specific prediction. Instead of treating the model as a black box, XAI techniques like 
                <strong>SHAP</strong> and <strong>Feature Importance</strong> reveal which input signals 
                (features) influenced the decision most.
                <br/><br/>
                Train a model using the sidebar to activate this module and gain deep insight into your 
                intrusion detection system's reasoning process.
            </p>
        </div>
        """, unsafe_allow_html=True)

# --- 5. RESOURCE MONITOR ---
with tab_res:
    sys_metrics = get_system_metrics()
    col_ram, col_cpu = st.columns(2)
    with col_ram:
        st.markdown("### RAM Usage")
        st.metric("Memory", f"{sys_metrics['ram_percent']}%", f"{sys_metrics['ram_used_gb']} GB")
        st.progress(sys_metrics['ram_percent'] / 100)
    with col_cpu:
        st.markdown("### CPU Utilization")
        st.metric("CPU", f"{sys_metrics['cpu_percent']}%")
        st.progress(sys_metrics['cpu_percent'] / 100)
    st.caption(f"Last Updated: {datetime.now().strftime('%H:%M:%S')}")

# Footer
st.markdown("---")
st.markdown("""
<div style="text-align:center;color:#30363D;font-size:0.8rem;">
    CyberSentinel v3.0 Enterprise | Multi-Model SOC | © 2026 Security Ops
</div>
""", unsafe_allow_html=True)
