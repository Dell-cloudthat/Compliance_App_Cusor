# Consent Platform - Makefile
# Quick commands for development and deployment

.PHONY: help install dev docker-up docker-down test seed clean

help:
	@echo "Consent Platform - Available Commands"
	@echo "======================================"
	@echo ""
	@echo "  make install     - Install all dependencies"
	@echo "  make dev         - Start development servers"
	@echo "  make docker-up   - Start with Docker Compose"
	@echo "  make docker-down - Stop Docker services"
	@echo "  make monitoring  - Start with monitoring stack"
	@echo "  make test        - Run API tests"
	@echo "  make test-quick  - Run quick curl tests"
	@echo "  make seed        - Seed demo data"
	@echo "  make clean       - Clean up containers and volumes"
	@echo "  make logs        - View Docker logs"
	@echo ""

# Installation
install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing demo dependencies..."
	pip install httpx
	@echo "✓ Installation complete"

# Development
dev-backend:
	cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting development servers..."
	@echo "Run 'make dev-backend' in one terminal"
	@echo "Run 'make dev-frontend' in another terminal"

# Docker
docker-up:
	docker-compose up -d --build
	@echo ""
	@echo "✓ Services started!"
	@echo "  Dashboard: http://localhost:3001"
	@echo "  API:       http://localhost:8001"
	@echo "  API Docs:  http://localhost:8001/docs"

docker-down:
	docker-compose down

monitoring:
	docker-compose --profile monitoring up -d
	@echo ""
	@echo "✓ Services with monitoring started!"
	@echo "  Dashboard:  http://localhost:3001"
	@echo "  API:        http://localhost:8001"
	@echo "  Prometheus: http://localhost:9090"
	@echo "  Grafana:    http://localhost:3000 (admin/admin)"

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

# Testing
test:
	python demo/test_api.py --api-url http://localhost:8001 --api-key demo-api-key-12345

test-quick:
	chmod +x demo/test_curl.sh && ./demo/test_curl.sh

test-verbose:
	python demo/test_api.py --api-url http://localhost:8001 --api-key demo-api-key-12345 -v

# Data
seed:
	python demo/seed_demo_data.py --api-url http://localhost:8001 --api-key demo-api-key-12345

seed-large:
	python demo/seed_demo_data.py --api-url http://localhost:8001 --api-key demo-api-key-12345 --tokens 500 --events 2000

# Cleanup
clean:
	docker-compose down -v
	rm -rf backend/data/*.db
	rm -rf backend/__pycache__
	rm -rf backend/services/__pycache__
	@echo "✓ Cleanup complete"

# Health check
health:
	@curl -s http://localhost:8001/health | python -m json.tool

# Build frontend for production
build-frontend:
	cd frontend && npm run build
