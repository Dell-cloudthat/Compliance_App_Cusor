# Compliance Platform Backend

FastAPI backend for the Compliance Automation Platform with PII/CUI handling, data segmentation, and cost prediction.

## Features

- **Data Segmentation**: Automatically segments API data by compliance control
- **PII/CUI Detection**: Automatically detects and filters PII/CUI data for FedRAMP compliance
- **Metadata Tagging**: Automatic metadata tagging for responsibility matrix
- **Cost Prediction**: Predict backend costs based on usage metrics
- **SQLite Database**: Lightweight database for development and small deployments

## Setup

### Prerequisites

- Python 3.9+
- pip

### Installation

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Database Initialization

The database is automatically initialized on first run. The schema is defined in `database/schema.sql`.

### Running the Server

```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or use Python directly
python main.py
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI): `http://localhost:8000/docs`

## API Endpoints

### Users
- `POST /api/users` - Create a new user
- `GET /api/users/{user_id}` - Get user by ID

### Data Sources
- `POST /api/data-sources?user_id={id}` - Create a data source (API integration)
- Blocks CUI data sources automatically

### Data Segments
- `POST /api/data-segments?user_id={id}` - Create a data segment
- Automatically detects PII/CUI and classifies data
- `GET /api/data-segments/by-control/{control_id}?user_id={id}` - Get segments for a control

### Responsibility Matrix
- `GET /api/responsibility-matrix/{user_id}` - Get responsibility matrix

### Cost Prediction
- `POST /api/cost-prediction` - Predict monthly/annual costs

### Metadata Tags
- `GET /api/metadata-tags` - Get all available metadata tags

## PII/CUI Handling

### PII Detection
The system automatically detects:
- Email addresses
- Social Security Numbers
- Phone numbers
- Addresses
- Names
- Dates of birth
- Credit card numbers
- IP addresses
- Device IDs

### CUI Filtering
CUI (Controlled Unclassified Information) data is **automatically rejected** for non-FedRAMP environments. The system detects:
- Classified/Secret keywords
- Federal/Government data indicators
- Defense/Military data
- Clearance-related information

### Data Classification
Data is automatically classified as:
- **PUBLIC**: No sensitive data
- **INTERNAL**: Internal use only
- **CONFIDENTIAL**: Contains PII
- **RESTRICTED**: Contains CUI (rejected)

## Cost Prediction

### Example: 50 Users

| Metric | Estimate | Cost |
|--------|-----------|------|
| Authentication | 50 users × $0.0055 | $0.28 |
| Storage | 10 GB × $0.023 | $0.23 |
| API Requests | 50k requests | $5.00 |
| Compute | Base + requests | $10.50 |
| Database | Base + storage | $5.12 |
| **Total Monthly** | | **~$21.13** |

### Scaling Estimates

- **100 users**: ~$35/month
- **500 users**: ~$150/month
- **1000 users**: ~$280/month

## Database Schema

Key tables:
- `users` - User accounts
- `data_sources` - API integrations
- `data_segments` - Segmented data by control
- `controls` - Compliance controls
- `responsibility_matrix` - Pre-computed responsibility matrix
- `cost_tracking` - Monthly cost records
- `metadata_tags_registry` - Available metadata tags

## Development

### Adding New Metadata Tags

Add to `metadata_tags_registry` table or update `schema.sql`:

```sql
INSERT INTO metadata_tags_registry (tag_name, tag_category, description, pii_related, cui_related)
VALUES ('NEW_TAG', 'CATEGORY', 'Description', 0, 0);
```

### Customizing PII Detection

Edit `services/metadata_service.py` - `PII_PATTERNS` dictionary

### Customizing Cost Pricing

Edit `services/cost_calculator.py` - `PRICING` dictionary

## Production Deployment

For production:
1. Replace SQLite with PostgreSQL or MySQL
2. Add authentication/authorization (JWT tokens)
3. Enable HTTPS
4. Add rate limiting
5. Set up monitoring and logging
6. Configure CORS properly
7. Add database backups

## Environment Variables

Create `.env` file:

```env
API_URL=http://localhost:8000
DATABASE_PATH=./database/compliance.db
ENVIRONMENT=development
FEDRAMP_COMPLIANT=false
```

