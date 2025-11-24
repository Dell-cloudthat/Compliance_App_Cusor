# Report Generation Testing Guide

## Overview
This guide explains how to test the automated report generation system through the UI.

## Prerequisites
1. Backend server running on port 8000 (or frontend configured to use demo mode)
2. At least one audit engagement created
3. Some findings and evidence added to the audit (optional, but recommended for full testing)

## Testing Steps

### 1. Access Audit Detail View
1. Navigate to the **Audits** section in the sidebar
2. Click on an existing audit, or create a new one:
   - Click "Create Audit"
   - Fill in audit details (name, framework, dates, scope)
   - Save the audit

### 2. Add Test Data (Optional but Recommended)
To see comprehensive reports, add some test data:

**Add Findings:**
- Click "Add Finding" button
- Fill in finding details (control ID, severity, description)
- Save the finding

**Add Evidence:**
- Click "Upload Evidence" button
- Fill in evidence details (control ID, type, name)
- Save the evidence

**Or use Automated Collection:**
- Click "Collect All Evidence" button in the Automated Evidence Collection section
- This will automatically collect evidence from integrated systems (demo mode will create sample evidence)

### 3. Test Report Generation

#### A. Full Audit Report
1. Scroll to the **"Audit Report Generation"** section
2. Click the **"Full Audit Report"** button
3. Expected behavior:
   - Report is generated (may take a few seconds)
   - JSON file downloads automatically
   - File name: `audit-report-{audit-name}-{date}.json`
4. Open the downloaded file and verify it contains:
   - `report_type`: "full_audit_report"
   - `executive_summary` with readiness score and metrics
   - `findings_summary` with all findings
   - `evidence_inventory` with all evidence
   - `recommendations` array
   - `appendices` with detailed data

#### B. Evidence Package
1. Click the **"Evidence Package"** button
2. Expected behavior:
   - CSV file downloads automatically
   - File name: `evidence-package-{audit-name}-{date}.csv`
3. Open the CSV file and verify it contains:
   - Column headers: Control ID, Evidence Name, Type, Validated, Uploaded, Expiration
   - One row per evidence item
   - All evidence items from the audit

#### C. Executive Summary
1. Click the **"Executive Summary"** button
2. Expected behavior:
   - Text file downloads automatically
   - File name: `executive-summary-{audit-name}-{date}.txt`
3. Open the text file and verify it contains:
   - Audit overview (name, framework, status)
   - Key metrics (readiness score, findings count, evidence count)
   - Top findings (if any critical/high severity findings exist)
   - Recommendations
   - Next steps

### 4. Verify Report Contents

#### Full Audit Report Should Include:
- ✅ Executive summary with readiness score
- ✅ Control coverage analysis
- ✅ Findings grouped by severity and status
- ✅ Evidence inventory grouped by control
- ✅ Recommendations based on findings
- ✅ Appendices with detailed data

#### Evidence Package Should Include:
- ✅ All evidence items
- ✅ Validation status
- ✅ Control mapping
- ✅ Evidence types
- ✅ Upload dates

#### Executive Summary Should Include:
- ✅ High-level metrics
- ✅ Assessment level (Excellent/Good/Fair/etc.)
- ✅ Top findings (critical/high severity)
- ✅ Actionable recommendations
- ✅ Next steps based on audit status

### 5. Test Error Handling

#### Test with No Audit Selected:
- Should show appropriate error message

#### Test with Empty Audit (no findings/evidence):
- Reports should still generate
- Should show zeros for counts
- Should include appropriate messaging

#### Test with Backend Disconnected (Demo Mode):
- Reports should still generate using local data
- Should work seamlessly

## Expected Results

### Success Indicators:
- ✅ All three report types generate successfully
- ✅ Files download automatically
- ✅ Reports contain accurate data
- ✅ Reports are properly formatted
- ✅ No errors in browser console

### Common Issues:

**Issue: Reports not generating**
- Check browser console for errors
- Verify backend is running (if not using demo mode)
- Check network tab for API call failures

**Issue: Reports empty or missing data**
- Ensure audit has findings and evidence
- Check that data is properly saved
- Verify audit scope is set correctly

**Issue: Download not working**
- Check browser download settings
- Verify popup blocker isn't blocking downloads
- Try different browser

## Demo Mode Testing

If backend is not connected, the system will use demo mode:
- Reports will generate using local state data
- All three report types will work
- Data will be based on what's visible in the UI
- No API calls will be made

## Backend API Testing (Optional)

If you want to test the backend endpoints directly:

```bash
# Get audit ID first
curl http://localhost:8000/api/audits -H "X-User-Id: 1"

# Generate full report
curl http://localhost:8000/api/audits/{audit_id}/reports/full -H "X-User-Id: 1"

# Generate evidence package
curl http://localhost:8000/api/audits/{audit_id}/reports/evidence-package -H "X-User-Id: 1"

# Generate executive summary
curl http://localhost:8000/api/audits/{audit_id}/reports/executive-summary -H "X-User-Id: 1"
```

## Notes

- Reports are generated on-demand (not cached)
- Each report generation is independent
- Reports include timestamps for when they were generated
- File formats: JSON (full report), CSV (evidence package), TXT (executive summary)
- Reports can be regenerated at any time with updated data

