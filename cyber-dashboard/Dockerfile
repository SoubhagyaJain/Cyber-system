# ============================================================================
# CyberSentinel Frontend — React + Vite → Nginx
# Multi-stage build: Node build → production Nginx image (~30MB)
# ============================================================================

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first → cache npm ci layer
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# ── Stage 2: Build the Vite app ──────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Reuse cached node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env: in Docker, the frontend is served by nginx which
# reverse-proxies /api/* to the backend container, so we use a
# relative URL. Override via --build-arg if needed.
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# ── Stage 3: Production Nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (SPA routing + API reverse proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=build /app/dist /usr/share/nginx/html

# Add security: run as non-root (nginx user already exists in alpine)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80

# Use 127.0.0.1 (not localhost) — Alpine resolves localhost to IPv6 [::1]
# where nginx may not be listening
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
