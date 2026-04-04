# Consent Platform - Deployment Guide

This guide covers deploying the Consent Platform for development, testing, and production environments.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Cloud VM Deployment](#cloud-vm-deployment)
5. [Production Considerations](#production-considerations)
6. [Testing the Platform](#testing-the-platform)
7. [Monitoring & Observability](#monitoring--observability)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and navigate to the project
cd consent-platform

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the platform
# Dashboard: http://localhost:3001
# API: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

### Option 2: Manual Start

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

---

## Local Development

### Prerequisites

- **Python 3.11+** (for backend)
- **Node.js 18+** (for frontend)
- **Docker & Docker Compose** (optional, for containerized deployment)

### Backend Setup

```bash
cd consent-platform/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Server runs at http://localhost:8001
# API docs at http://localhost:8001/docs
```

### Frontend Setup

```bash
cd consent-platform/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Dashboard runs at http://localhost:3001
```

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_PATH=./data/consent_platform.db

# Server
HOST=0.0.0.0
PORT=8001
LOG_LEVEL=INFO

# Security (generate your own keys in production!)
JWT_SECRET=your-secret-key-change-in-production
DEMO_MODE=true

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
```

---

## Docker Deployment

### Basic Deployment

```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### With Monitoring Stack

```bash
# Start with Prometheus and Grafana
docker-compose --profile monitoring up -d

# Access:
# - Dashboard: http://localhost:3001
# - API: http://localhost:8001
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3000 (admin/admin)
```

### Container Management

```bash
# Stop services
docker-compose down

# Stop and remove volumes (clears all data)
docker-compose down -v

# Rebuild a specific service
docker-compose build backend
docker-compose up -d backend

# Scale services (if needed)
docker-compose up -d --scale backend=3
```

---

## Cloud VM Deployment

### AWS EC2 / GCP Compute / Azure VM

1. **Provision a VM**
   - Recommended: Ubuntu 22.04 LTS
   - Minimum: 2 vCPU, 4GB RAM
   - Open ports: 80, 443, 8001 (API), 3001 (dashboard)

2. **Install Docker**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Logout and login again for group changes
```

3. **Deploy the Platform**

```bash
# Clone repository
git clone https://github.com/your-org/consent-platform.git
cd consent-platform

# Create production environment file
cat > .env << EOF
DATABASE_PATH=/app/data/consent_platform.db
DEMO_MODE=false
LOG_LEVEL=INFO
CORS_ORIGINS=https://your-domain.com
EOF

# Start services
docker-compose up -d

# Enable monitoring
docker-compose --profile monitoring up -d
```

4. **Configure Reverse Proxy (nginx)**

```nginx
# /etc/nginx/sites-available/consent-platform
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name app.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

5. **Enable SSL with Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.your-domain.com -d app.your-domain.com
```

### DigitalOcean App Platform

```yaml
# app.yaml for DigitalOcean App Platform
name: consent-platform
services:
  - name: backend
    github:
      repo: your-org/consent-platform
      branch: main
      deploy_on_push: true
    source_dir: backend
    run_command: uvicorn main:app --host 0.0.0.0 --port 8080
    environment_slug: python
    instance_count: 1
    instance_size_slug: basic-xs
    http_port: 8080
    routes:
      - path: /api

  - name: frontend
    github:
      repo: your-org/consent-platform
      branch: main
    source_dir: frontend
    build_command: npm run build
    environment_slug: node-js
    routes:
      - path: /
```

---

## Production Considerations

### Security Checklist

- [ ] Change default API keys and secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure authentication properly
- [ ] Regular security updates

### Database

For production, consider using PostgreSQL instead of SQLite:

```python
# backend/services/database.py
# Change DATABASE_PATH to use PostgreSQL connection string
DATABASE_URL = "postgresql://user:pass@host:5432/consent_platform"
```

### Scaling

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Backup Strategy

```bash
# Backup SQLite database
docker-compose exec backend cat /app/data/consent_platform.db > backup_$(date +%Y%m%d).db

# Backup with volume
docker run --rm -v consent-backend-data:/data -v $(pwd):/backup \
  alpine tar cvf /backup/backup_$(date +%Y%m%d).tar /data
```

---

## Testing the Platform

### Run API Tests

```bash
# Install test dependencies
pip install httpx

# Run comprehensive test suite
python demo/test_api.py --api-url http://localhost:8001 --api-key demo-api-key-12345

# Run specific test group
python demo/test_api.py --test consent
python demo/test_api.py --test enforcement
python demo/test_api.py --test tcf

# Verbose output
python demo/test_api.py -v
```

### Quick curl Tests

```bash
# Make script executable
chmod +x demo/test_curl.sh

# Run quick tests
./demo/test_curl.sh http://localhost:8001

# With custom API key
API_KEY=your-key ./demo/test_curl.sh
```

### Seed Demo Data

```bash
# Seed realistic demo data
python demo/seed_demo_data.py \
  --api-url http://localhost:8001 \
  --api-key demo-api-key-12345 \
  --tokens 100 \
  --events 500
```

### Manual API Testing

```bash
# Health check
curl http://localhost:8001/health

# Issue consent token
curl -X POST http://localhost:8001/consent \
  -H "X-API-Key: demo-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_id": "user_123",
    "purposes": {"analytics": {"allowed": true}},
    "vendors": {"google": {"allowed": true}},
    "jurisdiction": "EU"
  }'

# Send event
curl -X POST http://localhost:8001/event \
  -H "X-API-Key: demo-api-key-12345" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "page_view",
    "vendor": "google",
    "purpose": "analytics",
    "event_data": {"page": "/test"}
  }'
```

---

## Monitoring & Observability

### Prometheus Metrics

Access metrics at: `http://localhost:8001/metrics`

Key metrics:
- `consent_platform_requests_total` - Total HTTP requests
- `consent_platform_tokens_issued_total` - Tokens issued
- `consent_platform_enforcement_decisions_total` - Enforcement decisions
- `consent_platform_vendor_trust_score` - Vendor trust scores

### Grafana Dashboard

1. Access Grafana: `http://localhost:3000` (admin/admin)
2. Navigate to Dashboards
3. Select "Consent Platform" dashboard

### Log Analysis

```bash
# View backend logs
docker-compose logs -f backend

# Filter for errors
docker-compose logs backend 2>&1 | grep -i error

# JSON log parsing
docker-compose logs backend --no-log-prefix | jq '.'
```

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port
lsof -i :8001
# Kill process
kill -9 <PID>
```

**Database locked:**
```bash
# Restart the backend service
docker-compose restart backend
```

**CORS errors:**
- Check CORS_ORIGINS environment variable
- Ensure the frontend URL is included

**API returning 401:**
- Verify API key is correct
- Check X-API-Key header is included

### Health Checks

```bash
# Check all services
curl http://localhost:8001/health
curl http://localhost:3001  # Should return HTML

# Check database
docker-compose exec backend python -c "
from services.database import db
import asyncio
asyncio.run(db.initialize())
print('Database OK')
"
```

### Getting Support

1. Check the logs: `docker-compose logs`
2. Review API documentation: `http://localhost:8001/docs`
3. Run the test suite: `python demo/test_api.py`

---

## Next Steps

1. **Configure real vendor integrations** (Meta, Google APIs)
2. **Set up production database** (PostgreSQL)
3. **Configure alerting** (via webhooks or Grafana)
4. **Implement CI/CD pipeline**
5. **Security audit and penetration testing**
