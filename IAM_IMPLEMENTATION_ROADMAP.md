# IAM & Vendor Access Implementation Roadmap
## Enterprise-Grade Permission Management with Complete Audit Trails

---

## 🎯 Core Requirements

### 1. Granular Vendor Access Control
- **Read-Only**: Vendors can view assigned controls/audits
- **Read-Write**: Vendors can update evidence, findings, status
- **Execute**: Vendors can run automated actions, generate reports

### 2. Scope-Based Access
- Vendors only see assigned controls/frameworks
- Entity-level isolation (multi-tenant)
- Time-limited access grants
- Approval workflows for access requests

### 3. Complete Audit Trail
- Who granted permission (user ID, email, role)
- When granted (timestamp with timezone)
- What access was granted (specific permissions)
- IP address and user agent
- Approval workflow history
- When permissions were revoked
- Immutable logs (blockchain-style hashing)

---

## 🏗️ Database Schema

```sql
-- User Roles & Permissions
CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_name TEXT NOT NULL, -- 'Admin', 'Engineer', 'Auditor', 'Vendor', 'ReadOnly'
  entity_id INTEGER, -- For multi-tenant isolation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Permission Templates
CREATE TABLE IF NOT EXISTS permission_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL, -- 'Vendor Read-Only', 'Vendor Read-Write', 'Engineer Full'
  description TEXT,
  permissions_json TEXT NOT NULL, -- JSON: {"controls": ["read"], "audits": ["read", "write"], "reports": ["read"]}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Permissions (Granular)
CREATE TABLE IF NOT EXISTS user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  resource_type TEXT NOT NULL, -- 'control', 'audit', 'report', 'evidence', 'vendor'
  resource_id TEXT, -- Specific control ID, audit ID, or NULL for all
  permission_type TEXT NOT NULL, -- 'read', 'write', 'execute', 'delete'
  granted_by INTEGER NOT NULL, -- User ID who granted this
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL for permanent
  approval_workflow_id INTEGER, -- Link to approval workflow
  metadata_json TEXT, -- Additional context
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- Approval Workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_name TEXT NOT NULL,
  requestor_id INTEGER NOT NULL,
  approver_id INTEGER, -- NULL if pending
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  permission_requested TEXT NOT NULL, -- JSON permission request
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  FOREIGN KEY (requestor_id) REFERENCES users(id),
  FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- Permission Audit Log (Immutable)
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash for immutability
  event_type TEXT NOT NULL, -- 'grant', 'revoke', 'modify', 'approve', 'reject'
  user_id INTEGER NOT NULL, -- User affected
  permission_id INTEGER, -- Link to user_permissions
  granted_by INTEGER, -- Who performed the action
  ip_address TEXT,
  user_agent TEXT,
  resource_type TEXT,
  resource_id TEXT,
  permission_type TEXT,
  previous_permissions TEXT, -- JSON snapshot before change
  new_permissions TEXT, -- JSON snapshot after change
  metadata_json TEXT, -- Additional context
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),
  FOREIGN KEY (permission_id) REFERENCES user_permissions(id)
);

-- Vendor Access Profiles
CREATE TABLE IF NOT EXISTS vendor_access_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER NOT NULL, -- Link to vendors table
  profile_name TEXT NOT NULL, -- 'SOC Team Read-Only', 'MDR Full Access'
  entity_id INTEGER, -- Multi-tenant isolation
  scope_json TEXT NOT NULL, -- {"controls": ["AC-001", "AC-002"], "frameworks": ["NIST"], "audits": [1, 2]}
  permissions_json TEXT NOT NULL, -- {"controls": ["read"], "audits": ["read", "write"], "evidence": ["read", "write", "execute"]}
  access_expires_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Vendor User Assignments
CREATE TABLE IF NOT EXISTS vendor_user_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_access_profile_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL, -- Vendor's user account
  assigned_by INTEGER NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'revoked'
  FOREIGN KEY (vendor_access_profile_id) REFERENCES vendor_access_profiles(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON user_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_timestamp ON permission_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_permission_audit_hash ON permission_audit_log(log_hash);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
```

---

## 🔧 Backend API Endpoints

### Permission Management
```python
# Grant permission
POST /api/permissions/grant
{
  "user_id": 123,
  "vendor_id": 456,  # Optional
  "resource_type": "control",
  "resource_id": "AC-001",  # Or null for all
  "permission_type": "read",  # or "write", "execute"
  "expires_at": "2024-12-31T23:59:59Z",  # Optional
  "approval_required": true
}

# Revoke permission
POST /api/permissions/revoke
{
  "permission_id": 789,
  "reason": "Vendor contract ended"
}

# List user permissions
GET /api/permissions/user/{user_id}
GET /api/permissions/vendor/{vendor_id}

# Check permission
GET /api/permissions/check
{
  "user_id": 123,
  "resource_type": "control",
  "resource_id": "AC-001",
  "permission_type": "write"
}
# Returns: {"allowed": true/false, "reason": "..."}
```

### Vendor Access Management
```python
# Create vendor access profile
POST /api/vendor-access/profiles
{
  "vendor_id": 456,
  "profile_name": "SOC Team Read-Only",
  "scope": {
    "controls": ["AC-001", "AC-002"],
    "frameworks": ["NIST"],
    "audits": [1, 2]
  },
  "permissions": {
    "controls": ["read"],
    "audits": ["read"],
    "evidence": ["read"]
  },
  "expires_at": "2024-12-31"
}

# Assign vendor user to profile
POST /api/vendor-access/assign
{
  "vendor_access_profile_id": 789,
  "vendor_user_id": 123,
  "expires_at": "2024-12-31"
}

# List vendor access
GET /api/vendor-access/vendor/{vendor_id}
GET /api/vendor-access/user/{user_id}
```

### Approval Workflows
```python
# Request permission
POST /api/permissions/request
{
  "resource_type": "audit",
  "resource_id": "1",
  "permission_type": "write",
  "reason": "Need to update findings"
}

# Approve/reject request
POST /api/permissions/approve/{workflow_id}
POST /api/permissions/reject/{workflow_id}
{
  "reason": "Not authorized"
}

# List pending approvals
GET /api/permissions/approvals/pending
GET /api/permissions/approvals/history
```

### Audit Trail
```python
# Get audit log
GET /api/permissions/audit-log
{
  "user_id": 123,  # Optional filter
  "vendor_id": 456,  # Optional filter
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "event_type": "grant"  # Optional filter
}

# Generate audit report
GET /api/permissions/audit-report
{
  "format": "pdf",  # or "csv", "json"
  "filters": {...}
}
```

---

## 🎨 Frontend Components

### 1. Permission Management UI
```jsx
// Permission Manager Component
<PermissionManager>
  <VendorAccessProfiles />
  <UserPermissions />
  <ApprovalWorkflows />
  <AuditTrail />
</PermissionManager>
```

### 2. Vendor Access Profile Builder
- Visual scope selector (controls, frameworks, audits)
- Permission type selector (read/write/execute)
- Time-based expiration
- Approval workflow configuration

### 3. Audit Trail Viewer
- Filterable timeline
- Search by user, vendor, resource
- Export to PDF/CSV
- Immutability verification (hash check)

---

## 🔐 Security Implementation

### 1. Permission Checking Middleware
```python
def check_permission(user_id: int, resource_type: str, resource_id: str, permission_type: str):
    """
    Check if user has permission to perform action
    Returns: (allowed: bool, reason: str)
    """
    # Check user permissions
    # Check role-based permissions
    # Check vendor access profiles
    # Check expiration
    # Log access attempt
    pass
```

### 2. Audit Log Immutability
```python
import hashlib
import json

def create_audit_log_entry(event_data):
    """
    Create immutable audit log entry with hash
    """
    # Serialize event data
    event_json = json.dumps(event_data, sort_keys=True)
    
    # Create hash (previous_hash + current_event)
    previous_hash = get_last_audit_hash()
    hash_input = f"{previous_hash}{event_json}"
    log_hash = hashlib.sha256(hash_input.encode()).hexdigest()
    
    # Insert with hash
    insert_audit_log({**event_data, "log_hash": log_hash})
    
    return log_hash
```

### 3. Rate Limiting & Security
- Rate limit permission requests
- IP whitelisting for vendor access
- MFA for sensitive permission grants
- Session management for vendor users

---

## 📊 Implementation Phases

### Phase 1: Core IAM (Weeks 1-2)
- [ ] Database schema implementation
- [ ] Basic permission checking
- [ ] User permission management API
- [ ] Frontend permission manager UI

### Phase 2: Vendor Access (Weeks 3-4)
- [ ] Vendor access profiles
- [ ] Scope-based access control
- [ ] Vendor user assignments
- [ ] Frontend vendor access UI

### Phase 3: Approval Workflows (Weeks 5-6)
- [ ] Approval workflow engine
- [ ] Email notifications
- [ ] Approval/rejection UI
- [ ] Workflow history tracking

### Phase 4: Audit Trail (Weeks 7-8)
- [ ] Immutable audit log system
- [ ] Audit log viewer UI
- [ ] Audit report generation
- [ ] Hash verification system

### Phase 5: Integration & Testing (Weeks 9-10)
- [ ] Integrate with existing features
- [ ] Permission checks on all endpoints
- [ ] Security testing
- [ ] Performance optimization

---

## 🎯 Key Features

### 1. Granular Permissions
- Resource-level: Control, Audit, Report, Evidence
- Action-level: Read, Write, Execute, Delete
- Scope-based: Entity, Framework, Control Group

### 2. Vendor-Specific Features
- Vendor access profiles (templates)
- Time-limited access
- Auto-renewal options
- Scope restrictions (only assigned controls)

### 3. Approval Workflows
- Configurable approval chains
- Email notifications
- Approval history
- Rejection reasons

### 4. Complete Audit Trail
- Every permission change logged
- Immutable logs (blockchain-style)
- Searchable and filterable
- Exportable for audits

### 5. Real-Time Monitoring
- Active permission dashboard
- Expiring permissions alerts
- Unusual access pattern detection
- Security alerts

---

## 💡 Unique Differentiators

### vs. Competitors:
1. **Granular Vendor Control** - No competitor has this level of vendor access management
2. **Immutable Audit Trails** - Blockchain-style hashing for tamper-proof logs
3. **Scope-Based Access** - Vendors only see what they need
4. **Approval Workflows** - Built-in governance
5. **Real-Time Monitoring** - Live permission tracking

---

*This IAM system will be a major competitive differentiator for enterprise sales.*

