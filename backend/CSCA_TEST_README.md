# CSCA Test Script - Quick Start Guide

## Overview
The `test_csca_ingestion.py` script populates your database with sample security events to test the Continuous Security-Compliance Alignment (CSCA) system.

## Prerequisites
1. FastAPI backend running on `http://localhost:8000`
2. User ID 1 exists in the database (or modify `USER_ID` in the script)
3. Python 3.7+ with `requests` library installed

## Installation

```bash
# Install requests if not already installed
pip install requests

# Or if using virtual environment
cd backend
source venv/bin/activate
pip install requests
```

## Usage

### Run the Test Script

```bash
cd backend
python test_csca_ingestion.py
```

### What the Script Does

1. **Ingests 8 Sample Security Events:**
   - Malware detection (Critical)
   - Critical vulnerability (High)
   - Unauthorized access incident (High)
   - S3 bucket policy violation (Medium)
   - Security group configuration change (Low)
   - Suspicious PowerShell execution (High)
   - Outdated SSL/TLS configuration (Medium)
   - Potential data breach (Critical)

2. **Automatic Mapping:**
   - Each event is automatically mapped to compliance controls
   - Compliance scores are updated based on event severity
   - Compliance alerts are generated for significant impacts

3. **Data Created:**
   - Security events in `security_events` table
   - Compliance mappings in `security_event_compliance_mapping` table
   - Score history in `compliance_score_history` table
   - Alerts in `compliance_alerts` table

## Viewing Results

### In the Frontend:
1. Navigate to **"Security-Compliance Alignment"** in the sidebar
2. View:
   - Security events table
   - Compliance score trends charts
   - Security-compliance correlation graphs
   - Compliance alerts

### Via API:
```bash
# Get all security events
curl -H "X-User-Id: 1" http://localhost:8000/api/security-events

# Get compliance alerts
curl -H "X-User-Id: 1" http://localhost:8000/api/compliance-alerts

# Get compliance score history
curl -H "X-User-Id: 1" "http://localhost:8000/api/compliance-score-history?days=30"

# Get security-compliance correlation
curl -H "X-User-Id: 1" "http://localhost:8000/api/security-compliance-correlation?days=30"
```

## Customization

### Modify User ID:
Edit `USER_ID = 1` in the script to use a different user.

### Add More Events:
Add to the `SAMPLE_EVENTS` array in the script with your own event data.

### Event Types Supported:
- `threat_detected`
- `vulnerability_found`
- `incident`
- `policy_violation`
- `configuration_change`
- `data_breach`

### Severity Levels:
- `critical` (-10 points)
- `high` (-5 points)
- `medium` (-2 points)
- `low` (-1 point)
- `info` (0 points)

## Expected Results

After running the script, you should see:
- ✅ 8 security events ingested
- ✅ Multiple compliance control mappings
- ✅ Compliance score history entries
- ✅ Compliance alerts (if scores dropped significantly)

## Troubleshooting

### Error: "Cannot reach API server"
- Ensure FastAPI is running: `cd backend && python -m uvicorn main:app --reload`
- Check if port 8000 is accessible

### Error: "User not found"
- Make sure user ID 1 exists in the database
- Or modify `USER_ID` in the script to match an existing user

### No Events Showing in Frontend
- Refresh the Security-Compliance Alignment page
- Check browser console for errors
- Verify backend is connected (green indicator in frontend)

## Next Steps

1. **Test Real Integrations:** Connect actual SIEM/EDR/CSPM tools
2. **View Trends:** Check the compliance score trend charts
3. **Analyze Correlation:** Review the security-compliance correlation graphs
4. **Handle Alerts:** Acknowledge compliance alerts in the UI

