# Integration Architecture - IAM System with External Devices & Systems

## Overview

The IAM system automatically tracks user access, login sessions, and permissions by integrating with external security tools, network appliances, identity providers, and cloud platforms. This document explains how the system works when users integrate their devices, network appliances, EDRs, and other systems.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Systems                              │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│   EDRs       │   Network    │  Identity    │   Cloud Platforms  │
│              │  Appliances  │  Providers   │                    │
│              │              │              │                    │
│ CrowdStrike  │ Firewalls    │ Okta         │ AWS CloudTrail     │
│ SentinelOne  │ VPNs         │ Azure AD     │ Azure Activity    │
│ Defender     │ Proxies      │ Google WS    │ GCP Audit Logs     │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬────────────┘
       │             │               │               │
       └─────────────┴───────────────┴───────────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │   Integration Service       │
       │  (Normalization & Routing)   │
       └──────────────┬───────────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │   IAM Service                │
       │  - Login Session Tracking    │
       │  - Access Log Creation       │
       │  - Permission Auto-Mapping   │
       └──────────────┬───────────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │   Database                   │
       │  - user_login_sessions       │
       │  - user_access_logs          │
       │  - auto_mapped_permissions    │
       │  - edr_events                │
       │  - network_appliance_logs     │
       │  - identity_provider_events   │
       │  - cloud_platform_events     │
       └──────────────────────────────┘
```

## Integration Types

### 1. EDR (Endpoint Detection and Response) Systems

**Supported Systems:**
- CrowdStrike Falcon
- SentinelOne
- Microsoft Defender for Endpoint
- Carbon Black
- Any EDR with API/webhook support

**Event Types Captured:**
- `login` - User login to endpoint → Creates login session
- `logout` - User logout → Ends login session
- `file_access` - File access events → Logs as read/write access
- `process_execution` - Process execution → Logs as execute access
- `network_connection` - Network connections → Logs as network access
- `privilege_escalation` - Privilege changes → Updates permission mappings

**Example Integration:**

```python
# Register EDR integration
POST /api/integrations/register
{
  "integration_type": "edr",
  "name": "CrowdStrike Falcon",
  "config": {
    "api_key": "encrypted_key",
    "api_url": "https://api.crowdstrike.com",
    "webhook_secret": "secret"
  }
}

# Ingest login event from EDR
POST /api/integrations/edr/events
Headers:
  X-Integration-Id: 1
  X-User-Id: 1
Body:
{
  "event_type": "login",
  "user_identifier": "john.doe@company.com",
  "device_identifier": "DESKTOP-ABC123",
  "ip_address": "192.168.1.100",
  "user_agent": "Windows 11",
  "event_timestamp": "2024-01-15T10:30:00Z"
}
```

**What Happens:**
1. System normalizes `user_identifier` to platform `user_id`
2. Creates a login session via `create_login_session()`
3. Auto-maps user permissions based on role/profile
4. Stores raw EDR event for audit trail

### 2. Network Appliances

**Supported Systems:**
- Firewalls (Palo Alto, Fortinet, Cisco)
- VPN Gateways (Cisco AnyConnect, GlobalProtect)
- Web Proxies (Blue Coat, Zscaler)
- DNS Servers
- Load Balancers

**Log Types Captured:**
- `authentication` - VPN/network auth → Creates login session
- `connection` - Network connections → Logs as network access
- `dns_query` - DNS queries → Logs as DNS access
- `web_proxy` - Web access → Logs as web resource access

**Example Integration:**

```python
# Register network appliance
POST /api/integrations/register
{
  "integration_type": "network_appliance",
  "name": "Palo Alto Firewall",
  "config": {
    "api_key": "encrypted_key",
    "syslog_endpoint": "tcp://platform.company.com:514"
  }
}

# Ingest VPN authentication
POST /api/integrations/network/logs
Headers:
  X-Integration-Id: 2
  X-User-Id: 1
Body:
{
  "log_type": "authentication",
  "user_identifier": "john.doe",
  "source_ip": "10.0.0.50",
  "destination_ip": "vpn.company.com",
  "action": "allow",
  "log_timestamp": "2024-01-15T08:00:00Z"
}
```

**What Happens:**
1. Normalizes user identifier
2. Creates login session if authentication successful
3. Logs network access events with source/destination IPs
4. Tracks network resource access patterns

### 3. Identity Providers

**Supported Systems:**
- Okta
- Azure Active Directory
- Google Workspace
- OneLogin
- Any SAML/OIDC provider

**Event Types Captured:**
- `user.login` → Creates login session
- `user.logout` → Ends login session
- `user.created` → Creates new user record
- `user.updated` → Updates user profile
- `group.membership.added` → Updates role/permissions
- `permission.granted` → Creates audit log + re-maps permissions
- `permission.revoked` → Creates audit log + re-maps permissions

**Example Integration:**

```python
# Register identity provider
POST /api/integrations/register
{
  "integration_type": "identity_provider",
  "name": "Okta",
  "config": {
    "api_token": "encrypted_token",
    "webhook_secret": "secret",
    "domain": "company.okta.com"
  }
}

# Ingest permission grant event
POST /api/integrations/identity/events
Headers:
  X-Integration-Id: 3
  X-User-Id: 1
Body:
{
  "event_type": "permission.granted",
  "user_identifier": "john.doe@company.com",
  "resource_identifier": "control-123",
  "resource_type": "control",
  "permission_type": "write",
  "event_timestamp": "2024-01-15T09:00:00Z"
}
```

**What Happens:**
1. Normalizes user identifier
2. Creates immutable audit log entry
3. Triggers `auto_map_user_permissions()` to update permission mappings
4. Updates compliance mapping if applicable

### 4. Cloud Platforms

**Supported Systems:**
- AWS (CloudTrail)
- Azure (Activity Logs)
- GCP (Audit Logs)
- Multi-cloud environments

**Event Types Captured:**
- `console_login` → Creates login session
- `api_call` → Logs as resource access (read/write/execute/delete)
- `resource_access` → Logs access to cloud resources
- `permission_change` → Updates IAM permissions

**Example Integration:**

```python
# Register cloud platform
POST /api/integrations/register
{
  "integration_type": "cloud_platform",
  "name": "AWS CloudTrail",
  "config": {
    "aws_account_id": "123456789012",
    "s3_bucket": "cloudtrail-logs",
    "region": "us-east-1"
  }
}

# Ingest API call event
POST /api/integrations/cloud/events
Headers:
  X-Integration-Id: 4
  X-User-Id: 1
Body:
{
  "event_type": "api_call",
  "user_identifier": "arn:aws:iam::123456789012:user/john.doe",
  "service_name": "s3",
  "resource_arn": "arn:aws:s3:::my-bucket/my-object",
  "api_action": "GetObject",
  "source_ip": "203.0.113.1",
  "event_timestamp": "2024-01-15T10:00:00Z"
}
```

**What Happens:**
1. Normalizes AWS user ARN to platform user_id
2. Maps API action to permission type:
   - `Get*`, `List*`, `Describe*` → `read`
   - `Put*`, `Update*`, `Modify*` → `write`
   - `Delete*`, `Remove*` → `delete`
   - Others → `execute`
3. Logs as access event with cloud resource ARN
4. Updates auto-mapped permissions

## User Identifier Normalization

The system automatically maps external user identifiers to platform user IDs:

1. **Email Matching** - Primary method
   - `john.doe@company.com` → Matches user with that email

2. **Username Matching** - Secondary method
   - `jdoe` → Matches user with that username

3. **External ID Mapping** - For complex scenarios
   - Maintains a `user_mappings` table for external system IDs
   - Example: AWS ARN → Platform User ID

## Auto-Mapping Permissions

When events are ingested, the system automatically:

1. **Creates Login Sessions** - From login events (EDR, Network, Identity, Cloud)
2. **Logs Access Events** - From resource access events
3. **Updates Permission Mappings** - Based on observed access patterns
4. **Updates Compliance Mappings** - Links permissions to NIST 800-53 controls

### Permission Discovery Sources

- **Direct Permissions** - Explicitly granted permissions
- **Role-Based** - Permissions from user roles
- **Vendor Profiles** - Permissions from vendor access profiles
- **Observed Activity** - Permissions inferred from actual access patterns

### Confidence Scoring

- **Direct Permission**: 1.0 (100% confidence)
- **Role-Based**: 1.0 (100% confidence)
- **Vendor Profile**: 0.9 (90% confidence)
- **Observed Activity**: Starts at 0.8, increases with more observations

## Real-Time vs Batch Processing

### Real-Time Processing (Webhooks/Streaming)

```python
# Systems send events via webhook
POST /api/integrations/edr/events
# → Immediately processed
# → Login session created
# → Access logged
# → Permissions updated
```

### Batch Processing (Scheduled Sync)

```python
# Systems sync periodically
# Example: CloudTrail S3 → Lambda → API
# Runs every 5 minutes
# Processes batch of events
```

## Compliance Integration

All access events automatically map to compliance controls:

- **AC-2** (Account Management) - Login/logout events
- **AC-3** (Access Enforcement) - All access events
- **AC-6** (Least Privilege) - Write/execute/delete events
- **AC-7** (Unsuccessful Login Attempts) - Failed login events
- **AU-2** (Audit Events) - All events logged
- **AU-3** (Content of Audit Records) - Detailed event data

## Security Considerations

1. **API Authentication** - All endpoints require authentication
2. **Encrypted Config** - Integration credentials encrypted at rest
3. **Rate Limiting** - Prevents abuse of ingestion endpoints
4. **Data Validation** - All events validated before processing
5. **Audit Trail** - All integrations logged for compliance

## Example: Complete Integration Flow

### Step 1: User Logs into Laptop (EDR Event)

```json
POST /api/integrations/edr/events
{
  "event_type": "login",
  "user_identifier": "sarah.chen@company.com",
  "device_identifier": "LAPTOP-ABC123",
  "ip_address": "192.168.1.50"
}
```

**Result:**
- Login session created
- Permissions auto-mapped
- IAM dashboard shows new login

### Step 2: User Connects to VPN (Network Appliance)

```json
POST /api/integrations/network/logs
{
  "log_type": "authentication",
  "user_identifier": "sarah.chen@company.com",
  "source_ip": "192.168.1.50",
  "action": "allow"
}
```

**Result:**
- VPN session logged
- Network access tracked
- Session linked to user

### Step 3: User Accesses Cloud Resource (Cloud Platform)

```json
POST /api/integrations/cloud/events
{
  "event_type": "api_call",
  "user_identifier": "sarah.chen@company.com",
  "service_name": "s3",
  "api_action": "GetObject",
  "resource_arn": "arn:aws:s3:::compliance-data/report.pdf"
}
```

**Result:**
- Access logged as "read" permission
- Cloud resource access tracked
- Permission auto-mapped (if not already)
- Compliance control AC-3 updated

### Step 4: User Gets Permission Grant (Identity Provider)

```json
POST /api/integrations/identity/events
{
  "event_type": "permission.granted",
  "user_identifier": "sarah.chen@company.com",
  "resource_type": "control",
  "resource_identifier": "AC-2",
  "permission_type": "write"
}
```

**Result:**
- Audit log created
- Permissions re-mapped
- Compliance mapping updated
- IAM dashboard reflects new permission

## Dashboard Visualization

All integrated events appear in the IAM dashboard:

1. **Login Sessions** - Shows all logins from all sources
2. **Access Timeline** - Chronological view of all access events
3. **Permission Map** - Visual representation of user permissions
4. **Compliance Status** - Real-time compliance mapping
5. **Access by Area** - Grouped by resource type (control, audit, cloud, etc.)

## Next Steps

1. **Set up integrations** - Register your EDR, network appliances, identity providers
2. **Configure webhooks** - Point external systems to integration endpoints
3. **Verify data flow** - Check IAM dashboard for incoming events
4. **Review permissions** - Verify auto-mapped permissions are correct
5. **Monitor compliance** - Track compliance status in real-time

