# Consent as a Service Platform

A comprehensive, enterprise-grade Consent Management Platform (CMP) that enables organizations to collect, manage, and track user consent for data processing activities in compliance with GDPR, CCPA, and other privacy regulations.

## Consent Flow Architecture

The platform implements a complete consent enforcement flow:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CONSENT FLOW ARCHITECTURE                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐          │
│   │   USER      │     │  AUTHORIZATION  │     │   AD DATA PROXY  │          │
│   │  CONSENT    │────▶│     TOKEN       │────▶│  (ENFORCEMENT)   │          │
│   └─────────────┘     └─────────────────┘     └────────┬─────────┘          │
│         │                     │                        │                     │
│         │                     │                        │                     │
│         │                     │                        ▼                     │
│         │                     │              ┌──────────────────┐           │
│         │                     │              │    VENDOR /      │           │
│         │                     │              │    PLATFORM      │           │
│         │                     │              └────────┬─────────┘           │
│         │                     │                        │                     │
│         ▼                     ▼                        ▼                     │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │                  IMMUTABLE EVIDENCE LEDGER                   │           │
│   │   (Cryptographically secured, append-only audit trail)       │           │
│   └─────────────────────────────────────────────────────────────┘           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Flow Stages

1. **User Consent**: User grants consent through banner or preference center
2. **Authorization Token**: Token is issued based on consent scope, encoding which purposes are allowed
3. **Ad Data Proxy**: Enforcement layer that validates tokens, applies rules, and controls data flow
4. **Vendor/Platform**: Authorized data is sent to registered vendors (ad platforms, analytics, etc.)
5. **Evidence Ledger**: Every action is recorded in an immutable, cryptographically-chained ledger

## Overview

The Consent as a Service Platform provides a complete solution for managing user consent across your digital properties. It includes:

- **Admin Dashboard**: Comprehensive management interface for consent configuration
- **Embeddable Widget**: Customizable consent banner for any website
- **Preference Center**: User-facing portal for consent management
- **Analytics**: Real-time insights into consent metrics
- **DSAR Management**: Handle data subject access requests
- **Audit Trail**: Complete compliance documentation
- **Multi-tenant Support**: Manage multiple organizations

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Consent Platform                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  Admin Dashboard │  │ Consent Widget  │  │ Preference Center│    │
│  │   (React/Vite)   │  │   (Embeddable)  │  │   (React/Vite)  │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                     │                     │              │
│           └─────────────────────┼─────────────────────┘              │
│                                 │                                    │
│                    ┌────────────┴────────────┐                      │
│                    │     Consent API         │                      │
│                    │     (FastAPI)           │                      │
│                    └────────────┬────────────┘                      │
│                                 │                                    │
│           ┌─────────────────────┼─────────────────────┐             │
│           │                     │                     │              │
│  ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐    │
│  │  Consent Store   │  │  Analytics DB   │  │   Audit Log    │     │
│  │  (PostgreSQL)    │  │   (TimeSeries)  │  │   (Immutable)  │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Consent Management
- **Multi-purpose consent**: Define multiple consent purposes (analytics, marketing, personalization, etc.)
- **Legal basis tracking**: Support for all GDPR legal bases (consent, legitimate interest, contract, etc.)
- **Granular control**: Allow users to consent to specific purposes
- **Version control**: Track consent and policy versions

### 2. Consent Banner Widget
- **Customizable design**: Match your brand with custom colors, text, and styling
- **Multiple layouts**: Bar, modal, popup, or floating designs
- **Position options**: Top, bottom, center, or corner placement
- **Multi-language support**: Built-in translation system
- **Geo-targeting**: Show different banners based on user location

### 3. User Preference Center
- **Self-service portal**: Users can manage their preferences anytime
- **Consent history**: View complete consent history
- **Data rights**: Exercise GDPR/CCPA rights (access, deletion, portability)

### 4. Analytics Dashboard
- **Real-time metrics**: Track consent rates, impressions, and interactions
- **Trend analysis**: Monitor changes over time
- **Geographic breakdown**: Understand consent patterns by region
- **Device analytics**: Desktop vs. mobile consent rates

### 5. DSAR Management
- **Request intake**: Accept and track data subject requests
- **Workflow automation**: Automated verification and processing
- **Due date tracking**: Never miss a compliance deadline
- **Audit trail**: Complete documentation for regulators

### 6. Compliance Features
- **GDPR compliant**: Meets all EU data protection requirements
- **CCPA ready**: California Consumer Privacy Act support
- **Proof of consent**: Store evidence for regulatory inquiries
- **Data retention**: Automatic cleanup based on retention policies

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Initialize the database:
```bash
sqlite3 database/compliance.db < database/consent_schema.sql
```

4. Start the server:
```bash
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Access the application at `http://localhost:5173`

## API Reference

### Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent/organizations` | Create organization |
| GET | `/api/consent/organizations` | List organizations |
| GET | `/api/consent/organizations/{id}` | Get organization |
| PUT | `/api/consent/organizations/{id}` | Update organization |

### Consent Purposes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent/organizations/{org_id}/purposes` | Create purpose |
| GET | `/api/consent/organizations/{org_id}/purposes` | List purposes |
| GET | `/api/consent/purposes/{id}` | Get purpose |
| PUT | `/api/consent/purposes/{id}` | Update purpose |
| DELETE | `/api/consent/purposes/{id}` | Delete purpose |

### Consent Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent/organizations/{org_id}/consent` | Record consent |
| POST | `/api/consent/organizations/{org_id}/consent/bulk` | Bulk consent (from banner) |
| GET | `/api/consent/organizations/{org_id}/consent/status/{subject_id}` | Get consent status |
| GET | `/api/consent/organizations/{org_id}/consent/records` | Get consent records |

### Banners

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent/organizations/{org_id}/banners` | Create banner |
| GET | `/api/consent/organizations/{org_id}/banners` | List banners |
| GET | `/api/consent/banners/{id}` | Get banner |
| PUT | `/api/consent/banners/{id}` | Update banner |
| GET | `/api/consent/organizations/{org_id}/banners/config` | Get banner config (for widget) |

### Widget (Public Endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consent/widget/{org_id}` | Get widget configuration |
| POST | `/api/consent/widget/{org_id}/consent` | Submit widget consent |

### DSAR (Data Subject Access Requests)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent/organizations/{org_id}/dsar` | Create DSAR request |
| GET | `/api/consent/organizations/{org_id}/dsar` | List DSAR requests |
| GET | `/api/consent/dsar/{id}` | Get DSAR details |
| PUT | `/api/consent/dsar/{id}` | Update DSAR status |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consent/organizations/{org_id}/analytics` | Get analytics data |
| GET | `/api/consent/organizations/{org_id}/analytics/summary` | Get analytics summary |
| POST | `/api/consent/organizations/{org_id}/analytics/interaction` | Record interaction |

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consent/organizations/{org_id}/audit-logs` | Get audit logs |

### Data Export/Deletion

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consent/organizations/{org_id}/subjects/{subject_id}/export` | Export subject data |
| DELETE | `/api/consent/organizations/{org_id}/subjects/{subject_id}` | Delete subject data |

### Authorization Tokens (Flow API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent/flow/{org_id}/tokens` | Issue authorization token |
| GET | `/api/consent/flow/{org_id}/tokens` | List tokens |
| POST | `/api/consent/flow/tokens/{token_id}/revoke` | Revoke a token |

### Vendors (Flow API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent/flow/{org_id}/vendors` | Register vendor |
| GET | `/api/consent/flow/{org_id}/vendors` | List vendors |
| GET | `/api/consent/flow/vendors/{vendor_id}` | Get vendor details |
| PUT | `/api/consent/flow/vendors/{vendor_id}` | Update vendor |

### Proxy Rules (Flow API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent/flow/{org_id}/proxy-rules` | Create proxy rule |
| GET | `/api/consent/flow/{org_id}/proxy-rules` | List proxy rules |
| PUT | `/api/consent/flow/proxy-rules/{rule_id}` | Update rule |
| DELETE | `/api/consent/flow/proxy-rules/{rule_id}` | Delete rule |

### Ad Data Proxy (Flow API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consent/flow/{org_id}/proxy` | Process data through proxy |
| POST | `/api/consent/flow/{org_id}/complete-flow` | Execute complete flow |

### Evidence Ledger (Flow API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consent/flow/{org_id}/evidence` | Get evidence entries |
| GET | `/api/consent/flow/{org_id}/evidence/verify` | Verify chain integrity |

### Flow Sessions (Flow API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consent/flow/{org_id}/sessions` | List flow sessions |
| GET | `/api/consent/flow/{org_id}/sessions/{flow_id}` | Get session details |
| GET | `/api/consent/flow/{org_id}/statistics` | Get flow statistics |

## Embedding the Consent Widget

### Script Tag Integration

Add the following code to your website:

```html
<script src="https://your-consent-domain.com/widget.js"></script>
<script>
  ConsentWidget.init({
    organizationId: 'your-org-id',
    bannerId: 'your-banner-id', // optional
    onAccept: function(preferences) {
      console.log('Consent accepted:', preferences);
    },
    onReject: function(preferences) {
      console.log('Consent rejected:', preferences);
    },
    onSave: function(preferences) {
      console.log('Preferences saved:', preferences);
    }
  });
</script>
```

### React Integration

```jsx
import ConsentBannerWidget from './components/consent/ConsentBannerWidget';

function App() {
  const handleAcceptAll = (preferences) => {
    // Handle accept all
  };

  const handleRejectAll = (preferences) => {
    // Handle reject all
  };

  return (
    <div>
      <ConsentBannerWidget
        config={bannerConfig}
        onAcceptAll={handleAcceptAll}
        onRejectAll={handleRejectAll}
        onSavePreferences={handleSave}
        position="bottom"
        visible={true}
      />
    </div>
  );
}
```

## Database Schema

The consent platform uses the following main tables:

- `consent_organizations`: Multi-tenant organization management
- `consent_purposes`: Consent purposes/categories
- `consent_subjects`: Data subjects (users)
- `consent_records`: Consent decisions
- `consent_audit_log`: Immutable audit trail
- `consent_banners`: Banner configurations
- `consent_dsar_requests`: DSAR tracking
- `consent_analytics`: Aggregated metrics
- `consent_api_keys`: API authentication
- `consent_webhooks`: Event notifications

See `backend/database/consent_schema.sql` for the complete schema.

## Configuration

### Banner Configuration Example

```json
{
  "name": "Main Cookie Banner",
  "banner_type": "cookie_banner",
  "position": "bottom",
  "layout": "bar",
  "title": "We value your privacy",
  "description": "We use cookies to enhance your experience...",
  "accept_button_text": "Accept All",
  "reject_button_text": "Reject All",
  "customize_button_text": "Manage Preferences",
  "show_reject_button": true,
  "show_customize_button": true,
  "blocking_mode": false,
  "styling": {
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937",
    "buttonColor": "#3B82F6",
    "buttonTextColor": "#ffffff",
    "borderRadius": "8px"
  },
  "translations": {
    "es": {
      "title": "Valoramos su privacidad",
      "accept_button": "Aceptar Todo"
    }
  }
}
```

### Purpose Configuration Example

```json
{
  "name": "Analytics",
  "description": "Help us understand how visitors interact with our website.",
  "legal_basis": "consent",
  "is_essential": false,
  "default_enabled": false,
  "data_categories": ["usage_data", "device_data"],
  "retention_period_days": 180,
  "third_party_sharing": true,
  "third_parties": ["Google Analytics", "Mixpanel"]
}
```

## Security Considerations

1. **API Authentication**: Use API keys for server-to-server communication
2. **CORS Configuration**: Configure allowed origins for widget embedding
3. **Rate Limiting**: Built-in rate limiting for public endpoints
4. **Data Encryption**: Sensitive data encrypted at rest
5. **Audit Logging**: All consent changes are logged immutably

## Compliance Notes

### GDPR Requirements Met
- ✅ Clear and plain language in consent requests
- ✅ Freely given consent (no pre-checked boxes)
- ✅ Specific purpose consent
- ✅ Informed consent (privacy policy links)
- ✅ Unambiguous indication (clear affirmative action)
- ✅ Easy withdrawal mechanism
- ✅ Proof of consent storage
- ✅ Data subject rights support

### CCPA Requirements Met
- ✅ Right to know (access)
- ✅ Right to delete
- ✅ Right to opt-out of sale
- ✅ Non-discrimination
- ✅ Financial incentive disclosure

## Support

For questions or issues, please:
1. Check the documentation
2. Review the API reference
3. Contact support at privacy@example.com

## License

This software is proprietary. All rights reserved.

---

Built with ❤️ for privacy-first organizations
