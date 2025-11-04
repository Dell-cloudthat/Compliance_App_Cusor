# Backend Setup Instructions

## Quick Start

### 1. Install Python Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Server

```bash
# Option 1: Use run script
./run.sh

# Option 2: Manual
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Test the API

Visit: http://localhost:8000/docs

## Cost Prediction Example

For **50 users**:
- Monthly: ~$21
- Annual: ~$252
- Per user: ~$0.42/month

## PII/CUI Safety

✅ **PII Detection**: Automatically detects and tags PII
❌ **CUI Blocking**: Automatically rejects CUI data for FedRAMP compliance

## Next: Connect Frontend

Update `src/ComplianceMVP.jsx` to use `src/services/api.js` for backend integration.

