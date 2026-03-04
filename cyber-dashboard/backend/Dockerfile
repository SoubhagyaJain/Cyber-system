# ============================================================================
# CyberSentinel Backend — FastAPI + ML Inference
# Multi-stage build for minimal image size with proper layer caching
# ============================================================================

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM python:3.11-slim AS dependencies

WORKDIR /app

# System deps for scikit-learn, xgboost, numpy (C extensions)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first → cache pip install layer
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime-only system deps (libgomp for xgboost OpenMP, curl for healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgomp1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Thread-safety env vars (prevent OpenMP deadlock)
ENV OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# Healthcheck: hit the /api/health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail http://localhost:8000/api/health || exit 1

# Run with uvicorn
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
