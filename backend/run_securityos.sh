#!/bin/bash
# Start the SecurityOS API server

echo "SecurityOS API starting..."
echo "Port:  8001"
echo "Docs:  http://localhost:8001/docs"
echo "Health: http://localhost:8001/health"
echo ""

cd "$(dirname "$0")/.." || exit 1

# Install deps if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
    pip install -r backend/requirements.txt
fi

# Start
python3 -m uvicorn backend.securityos_main:app \
    --host 0.0.0.0 \
    --port 8001 \
    --reload
