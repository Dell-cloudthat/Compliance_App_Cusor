#!/bin/bash
# Consent Platform - Quick API Tests using curl
# 
# Usage:
#   ./test_curl.sh                    # Run all tests against localhost:8001
#   ./test_curl.sh https://api.example.com   # Run against custom URL
#   API_KEY=your-key ./test_curl.sh   # Use custom API key
#

set -e

# Configuration
API_URL="${1:-http://localhost:8001}"
API_KEY="${API_KEY:-demo-api-key-12345}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Consent Platform - Quick API Tests  ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo "API URL: $API_URL"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local extra_headers=$5
    
    echo -e "${YELLOW}▶ $description${NC}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "X-API-Key: $API_KEY" \
            -H "Content-Type: application/json" \
            $extra_headers \
            "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "X-API-Key: $API_KEY" \
            -H "Content-Type: application/json" \
            $extra_headers \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$status_code" =~ ^2 ]]; then
        echo -e "  ${GREEN}✓ Status: $status_code${NC}"
        echo "  Response: $(echo "$body" | head -c 200)..."
    else
        echo -e "  ${RED}✗ Status: $status_code${NC}"
        echo "  Response: $body"
    fi
    echo ""
}

# ==========================================
# 1. Health & Status
# ==========================================
echo -e "${BLUE}━━━ Health & Status ━━━${NC}"
echo ""

test_endpoint "GET" "/health" "Health Check"
test_endpoint "GET" "/metrics/summary" "Metrics Summary"

# ==========================================
# 2. Consent Token Operations
# ==========================================
echo -e "${BLUE}━━━ Consent Token Operations ━━━${NC}"
echo ""

# Issue a consent token
CONSENT_RESPONSE=$(curl -s -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "subject_id": "test_user_123",
        "purposes": {
            "analytics": {"allowed": true, "ttl_days": 30},
            "advertising": {"allowed": true, "ttl_days": 14}
        },
        "vendors": {
            "google": {"allowed": true, "data_classes": ["behavioral"]},
            "meta": {"allowed": true, "data_classes": ["behavioral"]}
        },
        "jurisdiction": "EU",
        "ttl_seconds": 3600
    }' \
    "$API_URL/consent")

TOKEN=$(echo "$CONSENT_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
TOKEN_ID=$(echo "$CONSENT_RESPONSE" | grep -o '"token_id":"[^"]*"' | cut -d'"' -f4)

echo -e "${YELLOW}▶ Issue Consent Token${NC}"
if [ -n "$TOKEN" ]; then
    echo -e "  ${GREEN}✓ Token issued successfully${NC}"
    echo "  Token ID: $TOKEN_ID"
    echo "  Token: ${TOKEN:0:50}..."
else
    echo -e "  ${RED}✗ Failed to issue token${NC}"
    echo "  Response: $CONSENT_RESPONSE"
fi
echo ""

# Validate token
if [ -n "$TOKEN" ]; then
    test_endpoint "POST" "/consent/validate" "Validate Token" \
        "{\"token\": \"$TOKEN\"}"
fi

# ==========================================
# 3. Event Enforcement
# ==========================================
echo -e "${BLUE}━━━ Event Enforcement ━━━${NC}"
echo ""

if [ -n "$TOKEN" ]; then
    # Send event with consent
    echo -e "${YELLOW}▶ Send Event (with consent)${NC}"
    EVENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "event_name": "page_view",
            "vendor": "google",
            "purpose": "analytics",
            "data_class": "behavioral",
            "event_data": {
                "page": "/test",
                "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
            }
        }' \
        "$API_URL/event")
    
    status_code=$(echo "$EVENT_RESPONSE" | tail -n1)
    body=$(echo "$EVENT_RESPONSE" | sed '$d')
    
    if [[ "$status_code" =~ ^2 ]]; then
        decision=$(echo "$body" | grep -o '"decision":"[^"]*"' | cut -d'"' -f4)
        echo -e "  ${GREEN}✓ Status: $status_code, Decision: $decision${NC}"
    else
        echo -e "  ${RED}✗ Status: $status_code${NC}"
        echo "  Response: $body"
    fi
    echo ""
    
    # Send event with idempotency key
    IDEM_KEY="idem_$(date +%s)"
    test_endpoint "POST" "/event" "Send Event (with idempotency)" \
        '{
            "event_name": "purchase",
            "vendor": "meta",
            "purpose": "advertising",
            "data_class": "behavioral",
            "event_data": {"value": 100}
        }' \
        "-H \"Authorization: Bearer $TOKEN\" -H \"X-Idempotency-Key: $IDEM_KEY\""
fi

# ==========================================
# 4. Vendor Management
# ==========================================
echo -e "${BLUE}━━━ Vendor Management ━━━${NC}"
echo ""

test_endpoint "GET" "/vendors" "List Vendors"

test_endpoint "POST" "/vendors" "Create Vendor" \
    '{
        "name": "test_vendor_'"$(date +%s)"'",
        "display_name": "Test Vendor",
        "vendor_type": "analytics",
        "allowed_data_classes": ["behavioral", "contextual"]
    }'

test_endpoint "GET" "/vendors/trust-registry" "Vendor Trust Registry"

# ==========================================
# 5. TCF 2.2 Integration
# ==========================================
echo -e "${BLUE}━━━ TCF 2.2 Integration ━━━${NC}"
echo ""

test_endpoint "POST" "/tcf/generate" "Generate TCF String" \
    '{
        "purposes": ["analytics", "advertising"],
        "vendors": ["google", "meta"],
        "jurisdiction": "EU"
    }'

test_endpoint "POST" "/tcf/api-response" "TCF API Response" \
    '{
        "purposes": ["analytics"],
        "vendors": ["google"]
    }'

# ==========================================
# 6. Google Consent Mode v2
# ==========================================
echo -e "${BLUE}━━━ Google Consent Mode v2 ━━━${NC}"
echo ""

test_endpoint "POST" "/gcm/settings" "GCM Settings" \
    '{
        "purposes": ["analytics", "advertising"],
        "all_consented": false,
        "region": "EU"
    }'

test_endpoint "POST" "/gcm/script" "GCM Script" \
    '{
        "region": "EU",
        "gtm_container_id": "GTM-TEST123"
    }'

# ==========================================
# 7. Webhooks
# ==========================================
echo -e "${BLUE}━━━ Webhooks ━━━${NC}"
echo ""

test_endpoint "GET" "/webhooks" "List Webhooks"

test_endpoint "POST" "/webhooks" "Create Webhook" \
    '{
        "url": "https://webhook.site/test-'"$(date +%s)"'",
        "events": ["consent.issued", "enforcement.blocked"],
        "active": true
    }'

# ==========================================
# 8. Audit & Reporting
# ==========================================
echo -e "${BLUE}━━━ Audit & Reporting ━━━${NC}"
echo ""

test_endpoint "GET" "/decisions" "List Decisions"

test_endpoint "GET" "/audit/export?start_date=2024-01-01T00:00:00Z&end_date=2030-01-01T00:00:00Z&format=json" "Audit Export"

test_endpoint "POST" "/reports/consent-enforcement" "Consent Report" \
    '{
        "tenant_id": "demo",
        "start_date": "2024-01-01T00:00:00Z",
        "end_date": "2030-01-01T00:00:00Z",
        "regulations": ["GDPR"],
        "format": "json"
    }'

test_endpoint "POST" "/reports/financial-roi" "Financial ROI Report" \
    '{
        "tenant_id": "demo",
        "start_date": "2024-01-01T00:00:00Z",
        "end_date": "2030-01-01T00:00:00Z",
        "platform_cost": 5000.0,
        "annual_revenue": 10000000.0,
        "format": "json"
    }'

# ==========================================
# 9. Registry & Security
# ==========================================
echo -e "${BLUE}━━━ Registry & Security ━━━${NC}"
echo ""

test_endpoint "GET" "/registry" "Public Registry"
test_endpoint "GET" "/security/events" "Security Events"
test_endpoint "GET" "/security/threats" "Security Threats"

# ==========================================
# Summary
# ==========================================
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Quick Test Complete!  ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo "For more comprehensive tests, run:"
echo "  python demo/test_api.py --api-url $API_URL --api-key $API_KEY"
echo ""
echo "API Documentation available at:"
echo "  $API_URL/docs"
echo ""
