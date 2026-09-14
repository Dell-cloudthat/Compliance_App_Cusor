# Compliance Platform backend — FastAPI + SQLite
#
# Build:  docker build -t compliance-backend ./backend
# Run:    docker run -p 8000:8000 --env-file backend/.env compliance-backend
#
# SQLite lives at /app/database/compliance.db inside the container. Mount a
# volume there in production so data survives container restarts/redeploys:
#   docker run -v compliance_data:/app/database ...

FROM python:3.12-slim

WORKDIR /app

# System deps for cryptography/bcrypt wheels on slim images
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/database

EXPOSE 8000

# Single worker: SQLite + in-memory rate limiter state don't support multiple
# processes safely. Scale vertically (more CPU/RAM) before scaling workers —
# see docs/DEPLOYMENT.md "Scaling beyond a single instance".
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
