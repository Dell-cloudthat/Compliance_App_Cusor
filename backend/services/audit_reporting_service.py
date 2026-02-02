"""
Audit and Compliance Reporting Service
Provides comprehensive audit logs and compliance reports for the Consent SaaS platform.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import json
import hashlib
import uuid


# ============== Enums ==============

class AuditEventType(str, Enum):
    # Consent Events
    CONSENT_GRANTED = "consent.granted"
    CONSENT_WITHDRAWN = "consent.withdrawn"
    CONSENT_UPDATED = "consent.updated"
    CONSENT_EXPIRED = "consent.expired"
    
    # Token Events
    TOKEN_ISSUED = "token.issued"
    TOKEN_VALIDATED = "token.validated"
    TOKEN_REVOKED = "token.revoked"
    TOKEN_EXPIRED = "token.expired"
    
    # Policy Events
    POLICY_CREATED = "policy.created"
    POLICY_UPDATED = "policy.updated"
    POLICY_ACTIVATED = "policy.activated"
    POLICY_ARCHIVED = "policy.archived"
    POLICY_EVALUATED = "policy.evaluated"
    
    # Data Flow Events
    DATA_FLOW_ALLOWED = "data_flow.allowed"
    DATA_FLOW_BLOCKED = "data_flow.blocked"
    DATA_FLOW_FILTERED = "data_flow.filtered"
    
    # Vendor Events
    VENDOR_ADDED = "vendor.added"
    VENDOR_UPDATED = "vendor.updated"
    VENDOR_REMOVED = "vendor.removed"
    
    # DSAR Events
    DSAR_RECEIVED = "dsar.received"
    DSAR_VERIFIED = "dsar.verified"
    DSAR_COMPLETED = "dsar.completed"
    DSAR_REJECTED = "dsar.rejected"
    
    # Admin Events
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    API_KEY_CREATED = "api_key.created"
    API_KEY_REVOKED = "api_key.revoked"
    SETTINGS_UPDATED = "settings.updated"


class ReportType(str, Enum):
    CONSENT_SUMMARY = "consent_summary"
    COMPLIANCE_STATUS = "compliance_status"
    DATA_FLOW_AUDIT = "data_flow_audit"
    DSAR_REPORT = "dsar_report"
    TOKEN_USAGE = "token_usage"
    POLICY_DECISIONS = "policy_decisions"
    VENDOR_DATA_SHARING = "vendor_data_sharing"


class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"


# ============== Models ==============

class AuditEvent(BaseModel):
    """A single audit event"""
    id: str
    tenant_id: str
    event_type: AuditEventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Actor information
    actor_type: str = "system"      # system, user, api, subject
    actor_id: Optional[str] = None
    actor_ip: Optional[str] = None
    actor_user_agent: Optional[str] = None
    
    # Resource information
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    
    # Event details
    action: str
    details: Dict[str, Any] = {}
    
    # Context
    subject_id: Optional[str] = None
    purpose: Optional[str] = None
    vendor_id: Optional[str] = None
    
    # Integrity
    previous_event_hash: Optional[str] = None
    event_hash: str = ""


class ComplianceReport(BaseModel):
    """A generated compliance report"""
    id: str
    tenant_id: str
    report_type: ReportType
    title: str
    description: Optional[str] = None
    
    # Report period
    period_start: datetime
    period_end: datetime
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Report data
    summary: Dict[str, Any] = {}
    details: List[Dict[str, Any]] = []
    charts_data: Dict[str, Any] = {}
    
    # Metadata
    generated_by: Optional[str] = None
    parameters: Dict[str, Any] = {}
    
    # Status
    status: str = "completed"


class ConsentMetrics(BaseModel):
    """Consent metrics for a period"""
    total_consents: int = 0
    consents_granted: int = 0
    consents_withdrawn: int = 0
    consent_rate: float = 0.0
    
    by_purpose: Dict[str, Dict[str, int]] = {}
    by_jurisdiction: Dict[str, Dict[str, int]] = {}
    by_legal_basis: Dict[str, int] = {}
    
    unique_subjects: int = 0
    active_subjects: int = 0


class TokenMetrics(BaseModel):
    """Token metrics for a period"""
    tokens_issued: int = 0
    tokens_validated: int = 0
    tokens_revoked: int = 0
    tokens_expired: int = 0
    
    avg_token_lifetime_seconds: float = 0.0
    avg_validations_per_token: float = 0.0
    
    by_purpose: Dict[str, int] = {}


class PolicyMetrics(BaseModel):
    """Policy evaluation metrics"""
    total_evaluations: int = 0
    allowed: int = 0
    denied: int = 0
    required_consent: int = 0
    
    by_policy: Dict[str, Dict[str, int]] = {}
    by_rule: Dict[str, int] = {}
    
    avg_evaluation_time_ms: float = 0.0


# ============== Audit Service ==============

class AuditReportingService:
    """
    Service for audit logging and compliance reporting.
    Provides immutable audit trail and various compliance reports.
    """
    
    def __init__(self):
        self.audit_events: List[AuditEvent] = []
        self.reports: Dict[str, ComplianceReport] = {}
        self._last_event_hash: Optional[str] = None
        
        # Initialize with some demo events
        self._init_demo_events()
    
    def _generate_id(self) -> str:
        return str(uuid.uuid4())
    
    def _compute_event_hash(self, event: AuditEvent) -> str:
        """Compute hash for an audit event (for chain integrity)"""
        data = {
            "id": event.id,
            "tenant_id": event.tenant_id,
            "event_type": event.event_type.value,
            "timestamp": event.timestamp.isoformat(),
            "actor_type": event.actor_type,
            "action": event.action,
            "details": event.details,
            "previous_hash": event.previous_event_hash
        }
        return hashlib.sha256(
            json.dumps(data, sort_keys=True).encode()
        ).hexdigest()
    
    def _init_demo_events(self):
        """Initialize demo audit events"""
        tenant_id = "demo-tenant"
        now = datetime.utcnow()
        
        demo_events = [
            {
                "event_type": AuditEventType.POLICY_CREATED,
                "action": "create",
                "details": {"policy_id": "policy-gdpr-default", "name": "GDPR Default Policy"},
                "timestamp": now - timedelta(days=30)
            },
            {
                "event_type": AuditEventType.VENDOR_ADDED,
                "action": "add",
                "details": {"vendor_id": "google_ads", "name": "Google Ads"},
                "vendor_id": "google_ads",
                "timestamp": now - timedelta(days=25)
            },
            {
                "event_type": AuditEventType.CONSENT_GRANTED,
                "action": "grant",
                "subject_id": "user-001",
                "purpose": "marketing",
                "details": {"consent_method": "explicit", "legal_basis": "consent"},
                "timestamp": now - timedelta(days=20)
            },
            {
                "event_type": AuditEventType.TOKEN_ISSUED,
                "action": "issue",
                "subject_id": "user-001",
                "details": {"token_id": "token-001", "purposes": ["marketing"]},
                "timestamp": now - timedelta(days=20)
            },
            {
                "event_type": AuditEventType.DATA_FLOW_ALLOWED,
                "action": "allow",
                "subject_id": "user-001",
                "vendor_id": "google_ads",
                "details": {"data_category": "marketing_data", "token_id": "token-001"},
                "timestamp": now - timedelta(days=19)
            }
        ]
        
        for event_data in demo_events:
            self.log_event(tenant_id=tenant_id, **event_data)
    
    # ============== Audit Logging ==============
    
    def log_event(self, tenant_id: str, event_type: AuditEventType, action: str,
                 details: Dict[str, Any] = None, actor_type: str = "system",
                 actor_id: str = None, actor_ip: str = None,
                 resource_type: str = None, resource_id: str = None,
                 subject_id: str = None, purpose: str = None,
                 vendor_id: str = None, timestamp: datetime = None) -> AuditEvent:
        """
        Log an audit event. Events are append-only and cryptographically chained.
        """
        event = AuditEvent(
            id=self._generate_id(),
            tenant_id=tenant_id,
            event_type=event_type,
            timestamp=timestamp or datetime.utcnow(),
            actor_type=actor_type,
            actor_id=actor_id,
            actor_ip=actor_ip,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            details=details or {},
            subject_id=subject_id,
            purpose=purpose,
            vendor_id=vendor_id,
            previous_event_hash=self._last_event_hash
        )
        
        event.event_hash = self._compute_event_hash(event)
        self._last_event_hash = event.event_hash
        
        self.audit_events.append(event)
        return event
    
    def get_events(self, tenant_id: str, event_type: AuditEventType = None,
                  subject_id: str = None, start_time: datetime = None,
                  end_time: datetime = None, limit: int = 100) -> List[AuditEvent]:
        """Get audit events with filtering"""
        events = [e for e in self.audit_events if e.tenant_id == tenant_id]
        
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        if subject_id:
            events = [e for e in events if e.subject_id == subject_id]
        if start_time:
            events = [e for e in events if e.timestamp >= start_time]
        if end_time:
            events = [e for e in events if e.timestamp <= end_time]
        
        events.sort(key=lambda e: e.timestamp, reverse=True)
        return events[:limit]
    
    def verify_audit_chain(self, tenant_id: str) -> Dict[str, Any]:
        """Verify the integrity of the audit chain"""
        events = [e for e in self.audit_events if e.tenant_id == tenant_id]
        events.sort(key=lambda e: e.timestamp)
        
        if not events:
            return {"valid": True, "events_checked": 0}
        
        prev_hash = None
        for event in events:
            # Check chain link
            if event.previous_event_hash != prev_hash:
                return {
                    "valid": False,
                    "error": f"Chain broken at event {event.id}",
                    "event_id": event.id
                }
            
            # Verify event hash
            computed_hash = self._compute_event_hash(event)
            if computed_hash != event.event_hash:
                return {
                    "valid": False,
                    "error": f"Hash mismatch at event {event.id}",
                    "event_id": event.id
                }
            
            prev_hash = event.event_hash
        
        return {
            "valid": True,
            "events_checked": len(events),
            "latest_hash": events[-1].event_hash if events else None
        }
    
    # ============== Reporting ==============
    
    def generate_consent_summary(self, tenant_id: str, 
                                start_date: datetime, end_date: datetime) -> ComplianceReport:
        """Generate a consent summary report"""
        events = self.get_events(
            tenant_id, 
            start_time=start_date, 
            end_time=end_date,
            limit=10000
        )
        
        # Filter consent events
        consent_events = [e for e in events if e.event_type.value.startswith("consent.")]
        
        # Calculate metrics
        granted = len([e for e in consent_events if e.event_type == AuditEventType.CONSENT_GRANTED])
        withdrawn = len([e for e in consent_events if e.event_type == AuditEventType.CONSENT_WITHDRAWN])
        
        # By purpose
        by_purpose = {}
        for event in consent_events:
            purpose = event.purpose or "unknown"
            if purpose not in by_purpose:
                by_purpose[purpose] = {"granted": 0, "withdrawn": 0}
            if event.event_type == AuditEventType.CONSENT_GRANTED:
                by_purpose[purpose]["granted"] += 1
            elif event.event_type == AuditEventType.CONSENT_WITHDRAWN:
                by_purpose[purpose]["withdrawn"] += 1
        
        # Unique subjects
        unique_subjects = len(set(e.subject_id for e in consent_events if e.subject_id))
        
        report = ComplianceReport(
            id=self._generate_id(),
            tenant_id=tenant_id,
            report_type=ReportType.CONSENT_SUMMARY,
            title="Consent Summary Report",
            description=f"Consent activity from {start_date.date()} to {end_date.date()}",
            period_start=start_date,
            period_end=end_date,
            summary={
                "total_consent_events": len(consent_events),
                "consents_granted": granted,
                "consents_withdrawn": withdrawn,
                "consent_rate": round(granted / (granted + withdrawn) * 100, 2) if (granted + withdrawn) > 0 else 0,
                "unique_subjects": unique_subjects
            },
            details=[
                {"purpose": k, **v} for k, v in by_purpose.items()
            ],
            charts_data={
                "consent_trend": self._get_daily_trend(consent_events, "consent"),
                "by_purpose": by_purpose
            }
        )
        
        self.reports[report.id] = report
        return report
    
    def generate_data_flow_audit(self, tenant_id: str,
                                start_date: datetime, end_date: datetime,
                                vendor_id: str = None) -> ComplianceReport:
        """Generate a data flow audit report"""
        events = self.get_events(
            tenant_id,
            start_time=start_date,
            end_time=end_date,
            limit=10000
        )
        
        # Filter data flow events
        flow_events = [e for e in events if e.event_type.value.startswith("data_flow.")]
        if vendor_id:
            flow_events = [e for e in flow_events if e.vendor_id == vendor_id]
        
        allowed = len([e for e in flow_events if e.event_type == AuditEventType.DATA_FLOW_ALLOWED])
        blocked = len([e for e in flow_events if e.event_type == AuditEventType.DATA_FLOW_BLOCKED])
        filtered = len([e for e in flow_events if e.event_type == AuditEventType.DATA_FLOW_FILTERED])
        
        # By vendor
        by_vendor = {}
        for event in flow_events:
            vendor = event.vendor_id or "unknown"
            if vendor not in by_vendor:
                by_vendor[vendor] = {"allowed": 0, "blocked": 0, "filtered": 0}
            if event.event_type == AuditEventType.DATA_FLOW_ALLOWED:
                by_vendor[vendor]["allowed"] += 1
            elif event.event_type == AuditEventType.DATA_FLOW_BLOCKED:
                by_vendor[vendor]["blocked"] += 1
            elif event.event_type == AuditEventType.DATA_FLOW_FILTERED:
                by_vendor[vendor]["filtered"] += 1
        
        report = ComplianceReport(
            id=self._generate_id(),
            tenant_id=tenant_id,
            report_type=ReportType.DATA_FLOW_AUDIT,
            title="Data Flow Audit Report",
            description=f"Data flow activity from {start_date.date()} to {end_date.date()}",
            period_start=start_date,
            period_end=end_date,
            summary={
                "total_flows": len(flow_events),
                "allowed": allowed,
                "blocked": blocked,
                "filtered": filtered,
                "block_rate": round(blocked / len(flow_events) * 100, 2) if flow_events else 0,
                "unique_vendors": len(by_vendor)
            },
            details=[
                {"vendor_id": k, **v} for k, v in by_vendor.items()
            ],
            parameters={"vendor_id": vendor_id} if vendor_id else {}
        )
        
        self.reports[report.id] = report
        return report
    
    def generate_token_usage_report(self, tenant_id: str,
                                   start_date: datetime, end_date: datetime) -> ComplianceReport:
        """Generate a token usage report"""
        events = self.get_events(
            tenant_id,
            start_time=start_date,
            end_time=end_date,
            limit=10000
        )
        
        # Filter token events
        token_events = [e for e in events if e.event_type.value.startswith("token.")]
        
        issued = len([e for e in token_events if e.event_type == AuditEventType.TOKEN_ISSUED])
        validated = len([e for e in token_events if e.event_type == AuditEventType.TOKEN_VALIDATED])
        revoked = len([e for e in token_events if e.event_type == AuditEventType.TOKEN_REVOKED])
        expired = len([e for e in token_events if e.event_type == AuditEventType.TOKEN_EXPIRED])
        
        report = ComplianceReport(
            id=self._generate_id(),
            tenant_id=tenant_id,
            report_type=ReportType.TOKEN_USAGE,
            title="Token Usage Report",
            description=f"Token activity from {start_date.date()} to {end_date.date()}",
            period_start=start_date,
            period_end=end_date,
            summary={
                "tokens_issued": issued,
                "tokens_validated": validated,
                "tokens_revoked": revoked,
                "tokens_expired": expired,
                "avg_validations_per_token": round(validated / issued, 2) if issued > 0 else 0
            },
            charts_data={
                "token_trend": self._get_daily_trend(token_events, "token")
            }
        )
        
        self.reports[report.id] = report
        return report
    
    def generate_compliance_status(self, tenant_id: str) -> ComplianceReport:
        """Generate a compliance status report"""
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        
        # Get recent events
        events = self.get_events(tenant_id, start_time=thirty_days_ago, limit=10000)
        
        # Calculate compliance indicators
        consent_events = [e for e in events if e.event_type.value.startswith("consent.")]
        policy_events = [e for e in events if e.event_type.value.startswith("policy.")]
        dsar_events = [e for e in events if e.event_type.value.startswith("dsar.")]
        
        # Consent compliance
        granted = len([e for e in consent_events if e.event_type == AuditEventType.CONSENT_GRANTED])
        withdrawn = len([e for e in consent_events if e.event_type == AuditEventType.CONSENT_WITHDRAWN])
        consent_rate = round(granted / (granted + withdrawn) * 100, 2) if (granted + withdrawn) > 0 else 100
        
        # Policy compliance
        policy_evals = len([e for e in policy_events if e.event_type == AuditEventType.POLICY_EVALUATED])
        
        # DSAR compliance
        dsar_received = len([e for e in dsar_events if e.event_type == AuditEventType.DSAR_RECEIVED])
        dsar_completed = len([e for e in dsar_events if e.event_type == AuditEventType.DSAR_COMPLETED])
        dsar_completion_rate = round(dsar_completed / dsar_received * 100, 2) if dsar_received > 0 else 100
        
        # Overall compliance score (simplified)
        compliance_score = round((consent_rate + dsar_completion_rate) / 2, 2)
        
        report = ComplianceReport(
            id=self._generate_id(),
            tenant_id=tenant_id,
            report_type=ReportType.COMPLIANCE_STATUS,
            title="Compliance Status Report",
            description=f"Compliance overview as of {now.date()}",
            period_start=thirty_days_ago,
            period_end=now,
            summary={
                "overall_compliance_score": compliance_score,
                "consent_rate": consent_rate,
                "dsar_completion_rate": dsar_completion_rate,
                "policy_evaluations": policy_evals,
                "status": "compliant" if compliance_score >= 90 else "needs_attention" if compliance_score >= 70 else "at_risk"
            },
            details=[
                {
                    "category": "Consent Management",
                    "score": consent_rate,
                    "status": "good" if consent_rate >= 90 else "warning"
                },
                {
                    "category": "DSAR Processing",
                    "score": dsar_completion_rate,
                    "status": "good" if dsar_completion_rate >= 90 else "warning"
                },
                {
                    "category": "Policy Enforcement",
                    "score": 100 if policy_evals > 0 else 0,
                    "status": "good" if policy_evals > 0 else "warning"
                }
            ]
        )
        
        self.reports[report.id] = report
        return report
    
    def _get_daily_trend(self, events: List[AuditEvent], prefix: str) -> List[Dict[str, Any]]:
        """Get daily trend data from events"""
        daily = {}
        for event in events:
            date_key = event.timestamp.strftime("%Y-%m-%d")
            if date_key not in daily:
                daily[date_key] = 0
            daily[date_key] += 1
        
        return [{"date": k, "count": v} for k, v in sorted(daily.items())]
    
    # ============== Report Management ==============
    
    def get_report(self, report_id: str) -> Optional[ComplianceReport]:
        """Get a report by ID"""
        return self.reports.get(report_id)
    
    def list_reports(self, tenant_id: str, report_type: ReportType = None,
                    limit: int = 50) -> List[ComplianceReport]:
        """List reports for a tenant"""
        reports = [r for r in self.reports.values() if r.tenant_id == tenant_id]
        
        if report_type:
            reports = [r for r in reports if r.report_type == report_type]
        
        reports.sort(key=lambda r: r.generated_at, reverse=True)
        return reports[:limit]
    
    def export_report(self, report_id: str, format: ExportFormat = ExportFormat.JSON) -> Dict[str, Any]:
        """Export a report in the specified format"""
        report = self.reports.get(report_id)
        if not report:
            return {"error": "Report not found"}
        
        if format == ExportFormat.JSON:
            return report.model_dump()
        elif format == ExportFormat.CSV:
            # In production, generate actual CSV
            return {
                "format": "csv",
                "content_type": "text/csv",
                "data": "CSV export would be generated here"
            }
        elif format == ExportFormat.PDF:
            # In production, generate actual PDF
            return {
                "format": "pdf",
                "content_type": "application/pdf",
                "data": "PDF export would be generated here"
            }
        
        return {"error": "Unsupported format"}


# Create singleton instance
audit_reporting_service = AuditReportingService()
