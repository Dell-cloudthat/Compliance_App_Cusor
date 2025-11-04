# Quick Start Guide - Compliance Platform

## Backend Setup

### 1. Install Backend Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run Backend Server

```bash
# Option 1: Use the run script
./run.sh

# Option 2: Manual start
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

## Frontend Setup

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Configure API URL

Create `.env` file in root directory:

```env
VITE_API_URL=http://localhost:8000
```

### 3. Run Frontend

```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173`

## Testing the Integration

### Example: Create a Data Source

```javascript
import api from './src/services/api';

// Create a user first
const user = await api.createUser({
  name: "Test User",
  email: "test@example.com",
  organization: "Test Org",
  plan: "free",
  role: "admin"
});

// Create a data source (API integration)
const dataSource = await api.createDataSource(user.id, {
  source_type: "API",
  source_name: "CrowdStrike Falcon API",
  vendor: "CrowdStrike",
  connection_info: {
    endpoint: "https://api.crowdstrike.com",
    api_key: "encrypted_key_here"
  },
  sync_frequency: "real-time",
  metadata_tags: ["ENDPOINT_DATA", "ENCRYPTED"],
  responsible_party: "SOC Team (External)"
});

// Create a data segment (automatically segments by control)
const segment = await api.createDataSegment(user.id, {
  data_source_id: dataSource.id,
  control_id: "EP-001",
  segment_name: "Endpoint Protection Status",
  data_payload: {
    endpoint_status: "protected",
    coverage: "95%",
    last_scan: "2024-12-15T10:30:00Z"
  },
  metadata_tags: ["ENDPOINT_DATA", "ENCRYPTED"],
  data_classification: "INTERNAL",
  responsible_party: "SOC Team"
});
```

### Example: Predict Costs

```javascript
const costPrediction = await api.predictCosts({
  num_users: 50,
  avg_storage_gb_per_user: 0.2,
  api_requests_per_month: 50000,
  retention_days: 90
});

console.log(`Monthly Cost: $${costPrediction.monthly.total}`);
console.log(`Annual Cost: $${costPrediction.annual}`);
console.log(`Per User: $${costPrediction.per_user_monthly}/month`);
```

## PII/CUI Handling

### Automatic Detection

The backend automatically:
- ✅ Detects PII (Email, SSN, Phone, Address, etc.)
- ✅ Blocks CUI data (FedRAMP compliance)
- ✅ Classifies data (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED)
- ✅ Tags metadata automatically

### Example: CUI Data Rejection

```javascript
// This will be rejected automatically
try {
  await api.createDataSegment(userId, {
    data_source_id: sourceId,
    control_id: "AC-001",
    segment_name: "Test Segment",
    data_payload: {
      classified_information: "Secret data",
      federal_clearance: "required"
    },
    metadata_tags: []
  });
} catch (error) {
  // Error: "CUI data cannot be ingested in non-FedRAMP environments"
  console.error(error.message);
}
```

## Data Segmentation Flow

1. **API Data Arrives** → Backend receives data from integration
2. **PII/CUI Detection** → Automatically scans for sensitive data
3. **Control Mapping** → Matches data fields to compliance controls
4. **Segmentation** → Creates separate segments per control
5. **Metadata Tagging** → Adds tags for Responsibility Matrix
6. **Storage** → Stores segmented data with classification

## Cost Prediction Example

### 50 Users (SMB)
- Authentication: $0.28/month
- Storage (10 GB): $0.23/month
- API Requests (50k): $5.00/month
- Compute: $10.50/month
- Database: $5.12/month
- **Total: ~$21/month**

### 500 Users (Enterprise)
- Authentication: $2.75/month
- Storage (100 GB): $2.30/month
- API Requests (500k): $49.00/month
- Compute: $15.00/month
- Database: $6.15/month
- **Total: ~$75/month**

## Next Steps

1. **Integrate with Frontend**: Update `ComplianceMVP.jsx` to use `api.js`
2. **Add Real API Integrations**: Connect to actual security tools
3. **Implement Authentication**: Add JWT tokens for user auth
4. **Scale Database**: Move from SQLite to PostgreSQL for production
5. **Add Monitoring**: Set up logging and error tracking

## Troubleshooting

### Backend won't start
- Check Python version: `python3 --version` (need 3.9+)
- Activate virtual environment
- Install dependencies: `pip install -r requirements.txt`

### Frontend can't connect to backend
- Check backend is running on port 8000
- Verify `VITE_API_URL` in `.env` file
- Check CORS settings in `backend/main.py`

### Database errors
- Delete `backend/database/compliance.db` to reset
- Backend will recreate on next startup

