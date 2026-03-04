# ============================================================================
# CyberSentinel AI Dashboard — Makefile
# Shortcuts for Docker Compose operations
# ============================================================================

.PHONY: up down dev dev-down logs logs-backend logs-frontend rebuild-backend rebuild-frontend clean status health

# ── Production ────────────────────────────────────────────────────────────────

up: ## Build and start all services (production)
	docker compose up --build -d

down: ## Stop all services
	docker compose down

status: ## Show running containers
	docker compose ps

health: ## Check service health
	@echo "── Backend Health ──"
	@curl -s http://localhost:8000/api/health 2>/dev/null || echo "Backend not reachable"
	@echo ""
	@echo "── Frontend ──"
	@curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3000/ 2>/dev/null || echo "Frontend not reachable"
	@echo ""
	@echo "── Streamlit ──"
	@curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:8501/ 2>/dev/null || echo "Streamlit not reachable"
	@echo ""

# ── Development (Hot Reload) ─────────────────────────────────────────────────

dev: ## Start in dev mode with hot reload
	docker compose -f docker-compose.dev.yml up --build -d

dev-down: ## Stop dev services
	docker compose -f docker-compose.dev.yml down

dev-logs: ## Tail dev logs
	docker compose -f docker-compose.dev.yml logs -f

# ── Logs ──────────────────────────────────────────────────────────────────────

logs: ## Tail all logs
	docker compose logs -f

logs-backend: ## Tail backend logs only
	docker compose logs -f backend

logs-frontend: ## Tail frontend logs only
	docker compose logs -f frontend

logs-streamlit: ## Tail streamlit logs only
	docker compose logs -f streamlit

# ── Rebuild Individual Services ──────────────────────────────────────────────

rebuild-backend: ## Rebuild and restart only the backend
	docker compose up --build -d --no-deps backend

rebuild-frontend: ## Rebuild and restart only the frontend
	docker compose up --build -d --no-deps frontend

rebuild-streamlit: ## Rebuild and restart only streamlit
	docker compose up --build -d --no-deps streamlit

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Stop containers + remove volumes and orphans
	docker compose down -v --remove-orphans
	docker compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true

prune: ## Remove dangling Docker images (safe)
	docker image prune -f

# ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
