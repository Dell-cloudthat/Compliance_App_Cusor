#!/bin/bash
# Consent Platform - Quick Start Script
#
# Usage:
#   ./start.sh          # Start with Docker
#   ./start.sh local    # Start locally (no Docker)
#   ./start.sh monitor  # Start with monitoring stack
#

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║   Consent as a Service Platform           ║"
echo "║   Server-Side Consent Enforcement         ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

MODE="${1:-docker}"

case "$MODE" in
    docker)
        echo -e "${YELLOW}Starting with Docker Compose...${NC}"
        docker-compose up -d --build
        
        echo ""
        echo -e "${GREEN}Waiting for services to start...${NC}"
        sleep 5
        
        # Health check
        until curl -s http://localhost:8001/health > /dev/null 2>&1; do
            echo "Waiting for API..."
            sleep 2
        done
        
        echo ""
        echo -e "${GREEN}✓ Platform is ready!${NC}"
        echo ""
        echo "  Dashboard:  http://localhost:3001"
        echo "  API:        http://localhost:8001"
        echo "  API Docs:   http://localhost:8001/docs"
        echo ""
        echo "Demo API Key: demo-api-key-12345"
        echo ""
        echo "Quick test:"
        echo "  curl http://localhost:8001/health"
        echo ""
        echo "Seed demo data:"
        echo "  python demo/seed_demo_data.py"
        echo ""
        echo "Run tests:"
        echo "  python demo/test_api.py"
        echo ""
        echo "View logs:"
        echo "  docker-compose logs -f"
        ;;
        
    local)
        echo -e "${YELLOW}Starting locally (without Docker)...${NC}"
        echo ""
        echo "Step 1: Start the backend"
        echo "  cd backend && pip install -r requirements.txt"
        echo "  python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"
        echo ""
        echo "Step 2: Start the frontend (in another terminal)"
        echo "  cd frontend && npm install && npm run dev"
        echo ""
        echo "Or run:"
        echo "  make dev-backend   # Terminal 1"
        echo "  make dev-frontend  # Terminal 2"
        ;;
        
    monitor|monitoring)
        echo -e "${YELLOW}Starting with monitoring stack...${NC}"
        docker-compose --profile monitoring up -d --build
        
        echo ""
        echo -e "${GREEN}Waiting for services to start...${NC}"
        sleep 10
        
        echo ""
        echo -e "${GREEN}✓ Platform with monitoring is ready!${NC}"
        echo ""
        echo "  Dashboard:   http://localhost:3001"
        echo "  API:         http://localhost:8001"
        echo "  API Docs:    http://localhost:8001/docs"
        echo "  Prometheus:  http://localhost:9090"
        echo "  Grafana:     http://localhost:3000 (admin/admin)"
        echo ""
        ;;
        
    stop)
        echo -e "${YELLOW}Stopping services...${NC}"
        docker-compose down
        echo -e "${GREEN}✓ Services stopped${NC}"
        ;;
        
    clean)
        echo -e "${YELLOW}Stopping and cleaning up...${NC}"
        docker-compose down -v
        echo -e "${GREEN}✓ Cleanup complete${NC}"
        ;;
        
    *)
        echo "Usage: ./start.sh [docker|local|monitor|stop|clean]"
        echo ""
        echo "  docker   - Start with Docker Compose (default)"
        echo "  local    - Instructions for local development"
        echo "  monitor  - Start with Prometheus + Grafana"
        echo "  stop     - Stop all services"
        echo "  clean    - Stop and remove all data"
        ;;
esac
