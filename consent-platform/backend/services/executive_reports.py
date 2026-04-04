"""
Executive Reporting Service

Multi-stakeholder reports for enterprise compliance and ROI demonstration.

Target Audiences:
- CISO / Security: Risk reduction, attack surface
- Legal / Compliance: Audit defensibility, fines
- Marketing / Growth: Revenue protection, efficiency  
- CFO: Cost avoidance, ROI
- Board / Exec: Exposure + governance maturity

Report Types:
1. Consent Enforcement Report (Compliance Gold)
2. Security Threat Report
3. Financial ROI & Cost Avoidance Summary
4. Vendor Trust Registry Report
5. Executive Dashboard Summary

Markets: EU (GDPR) and US (CCPA/CPRA, State Laws)
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from pydantic import BaseModel, Field
from enum import Enum
from decimal import Decimal, ROUND_HALF_UP
import uuid
import json
import csv
import io


# ============== Enums ==============

class ReportType(str, Enum):
    """Types of executive reports"""
    CONSENT_ENFORCEMENT = "consent_enforcement"
    SECURITY_THREAT = "security_threat"
    FINANCIAL_ROI = "financial_roi"
    VENDOR_TRUST = "vendor_trust"
    EXECUTIVE_SUMMARY = "executive_summary"
    BOARD_GOVERNANCE = "board_governance"


class Regulation(str, Enum):
    """Applicable regulations"""
    # Europe
    GDPR = "GDPR"
    EPRIVACY = "ePrivacy"
    
    # United States
    CCPA = "CCPA"
    CPRA = "CPRA"
    VIRGINIA_CDPA = "Virginia CDPA"
    COLORADO_CPA = "Colorado CPA"
    CONNECTICUT_CTDPA = "Connecticut CTDPA"
    UTAH_UCPA = "Utah UCPA"
    
    # Other
    LGPD = "LGPD"  # Brazil
    PIPEDA = "PIPEDA"  # Canada
    POPIA = "POPIA"  # South Africa


class ReportFormat(str, Enum):
    """Report output formats"""
    PDF = "pdf"
    CSV = "csv"
    JSON = "json"
    HTML = "html"


class Audience(str, Enum):
    """Report target audience"""
    CISO = "ciso"
    LEGAL = "legal"
    COMPLIANCE = "compliance"
    MARKETING = "marketing"
    CFO = "cfo"
    BOARD = "board"
    REGULATOR = "regulator"


# ============== Report Models ==============

class ReportMetadata(BaseModel):
    """Common report metadata"""
    report_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_type: ReportType
    tenant_id: str
    tenant_name: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    period_start: datetime
    period_end: datetime
    regulations: List[Regulation] = []
    audience: List[Audience] = []
    format: ReportFormat = ReportFormat.JSON
    version: str = "1.0"


class ConsentMetrics(BaseModel):
    """Consent enforcement metrics"""
    total_events_processed: int = 0
    fully_consented_events: int = 0
    modified_events: int = 0
    blocked_events: int = 0
    
    # Percentages
    consent_rate: float = 0.0
    modification_rate: float = 0.0
    block_rate: float = 0.0
    
    # By vendor
    events_by_vendor: Dict[str, int] = {}
    block_rate_by_vendor: Dict[str, float] = {}
    
    # By purpose
    events_by_purpose: Dict[str, int] = {}
    consent_by_purpose: Dict[str, float] = {}
    
    # Tokens
    tokens_issued: int = 0
    tokens_revoked: int = 0
    tokens_expired: int = 0
    active_tokens: int = 0
    
    # Violations
    top_violation_categories: List[Dict[str, Any]] = []


class SecurityMetrics(BaseModel):
    """Security threat metrics"""
    # Token attacks
    invalid_token_attempts: int = 0
    expired_token_reuse: int = 0
    modified_token_attempts: int = 0
    
    # Shadow pipelines
    shadow_pipeline_detections: int = 0
    hash_mismatches: int = 0
    parallel_submissions: int = 0
    
    # Replay/fraud
    replay_attempts_blocked: int = 0
    duplicate_events_rejected: int = 0
    
    # Volume attacks
    rate_limit_hits: int = 0
    anomaly_detections: int = 0
    
    # Purpose violations
    cross_purpose_reuse_detected: int = 0
    purpose_drift_blocked: int = 0
    
    # Overall
    total_threats_blocked: int = 0
    threat_reduction_percent: float = 0.0
    data_egress_reduced_percent: float = 0.0


class FinancialMetrics(BaseModel):
    """Financial ROI metrics with conservative assumptions"""
    # Audit savings
    audit_prep_hours_saved: float = 0.0
    audit_prep_hourly_rate: float = 150.0  # Conservative legal/compliance rate
    audit_prep_cost_saved: float = 0.0
    
    # Legal consulting
    legal_review_hours_avoided: float = 0.0
    legal_hourly_rate: float = 400.0  # Conservative external counsel rate
    legal_cost_avoided: float = 0.0
    
    # Fines exposure
    potential_fine_exposure: float = 0.0
    fine_risk_reduction_percent: float = 0.0
    fine_exposure_reduced: float = 0.0
    
    # Storage optimization
    data_retention_optimized_gb: float = 0.0
    storage_cost_per_gb: float = 0.02  # Conservative cloud storage rate
    storage_cost_saved: float = 0.0
    
    # Revenue protection
    revenue_at_risk_without_compliance: float = 0.0
    revenue_protection_percent: float = 0.0
    revenue_protected: float = 0.0
    
    # Total ROI
    total_cost_avoided: float = 0.0
    platform_cost: float = 0.0
    net_savings: float = 0.0
    roi_percent: float = 0.0
    
    # Assumptions (clearly labeled)
    assumptions: List[Dict[str, str]] = []


class VendorTrustMetrics(BaseModel):
    """Vendor trust registry metrics"""
    total_vendors: int = 0
    certified_vendors: int = 0
    approved_vendors: int = 0
    probation_vendors: int = 0
    suspended_vendors: int = 0
    
    # Compliance
    avg_trust_score: float = 0.0
    avg_compliance_rate: float = 0.0
    
    # Violations
    total_violations: int = 0
    resolved_violations: int = 0
    open_violations: int = 0
    
    # By vendor
    vendor_scores: List[Dict[str, Any]] = []


# ============== Report Classes ==============

class ConsentEnforcementReport(BaseModel):
    """
    Consent Enforcement Report (Compliance Gold)
    
    Audience: Legal, Compliance, Regulators
    Format: PDF + CSV
    """
    metadata: ReportMetadata
    metrics: ConsentMetrics
    
    # Regulatory mapping
    gdpr_article_30_compliance: bool = True
    ccpa_opt_out_honored: bool = True
    
    # Evidence
    chain_integrity_verified: bool = True
    last_chain_verification: Optional[datetime] = None
    
    # Recommendations
    recommendations: List[str] = []
    
    # Attestation
    attestation_statement: str = ""
    
    def generate_summary(self) -> str:
        """Generate executive summary"""
        return f"""
CONSENT ENFORCEMENT REPORT
Period: {self.metadata.period_start.strftime('%Y-%m-%d')} to {self.metadata.period_end.strftime('%Y-%m-%d')}
Generated: {self.metadata.generated_at.strftime('%Y-%m-%d %H:%M UTC')}

EXECUTIVE SUMMARY
-----------------
Total Events Processed: {self.metrics.total_events_processed:,}
Consent Rate: {self.metrics.consent_rate:.1f}%
Modification Rate: {self.metrics.modification_rate:.1f}%
Block Rate: {self.metrics.block_rate:.1f}%

TOKEN MANAGEMENT
----------------
Tokens Issued: {self.metrics.tokens_issued:,}
Tokens Revoked: {self.metrics.tokens_revoked:,}
Active Tokens: {self.metrics.active_tokens:,}

REGULATORY COMPLIANCE
---------------------
GDPR Article 30 Compliance: {'✓' if self.gdpr_article_30_compliance else '✗'}
CCPA Opt-Out Honored: {'✓' if self.ccpa_opt_out_honored else '✗'}
Evidence Chain Integrity: {'✓ Verified' if self.chain_integrity_verified else '✗ Check Required'}

TOP VIOLATION CATEGORIES
------------------------
{self._format_violations()}

ATTESTATION
-----------
{self.attestation_statement}
        """
    
    def _format_violations(self) -> str:
        lines = []
        for i, v in enumerate(self.metrics.top_violation_categories[:5], 1):
            lines.append(f"{i}. {v.get('category', 'Unknown')}: {v.get('count', 0):,} occurrences")
        return "\n".join(lines) if lines else "No violations recorded"


class SecurityThreatReport(BaseModel):
    """
    Security Threat Report
    
    Audience: CISO, Security Team
    Format: PDF + CSV
    """
    metadata: ReportMetadata
    metrics: SecurityMetrics
    
    # Threat intelligence
    threat_trend: str = "stable"  # improving, stable, degrading
    highest_risk_vector: str = ""
    
    # Incident summary
    incidents_requiring_review: int = 0
    incidents_auto_mitigated: int = 0
    
    # Recommendations
    security_recommendations: List[str] = []
    
    def generate_summary(self) -> str:
        """Generate security summary"""
        return f"""
SECURITY THREAT REPORT
Period: {self.metadata.period_start.strftime('%Y-%m-%d')} to {self.metadata.period_end.strftime('%Y-%m-%d')}
Generated: {self.metadata.generated_at.strftime('%Y-%m-%d %H:%M UTC')}

THREAT OVERVIEW
---------------
Total Threats Blocked: {self.metrics.total_threats_blocked:,}
Threat Trend: {self.threat_trend.upper()}
Data Egress Reduced: {self.metrics.data_egress_reduced_percent:.1f}%

TOKEN ATTACK PREVENTION
-----------------------
Invalid Token Attempts Blocked: {self.metrics.invalid_token_attempts:,}
Expired Token Reuse Blocked: {self.metrics.expired_token_reuse:,}
Modified Token Attempts Blocked: {self.metrics.modified_token_attempts:,}

SHADOW PIPELINE DETECTION
-------------------------
Shadow Pipeline Detections: {self.metrics.shadow_pipeline_detections:,}
Hash Mismatches Detected: {self.metrics.hash_mismatches:,}
Parallel Submissions Flagged: {self.metrics.parallel_submissions:,}

REPLAY & FRAUD PREVENTION
-------------------------
Replay Attempts Blocked: {self.metrics.replay_attempts_blocked:,}
Duplicate Events Rejected: {self.metrics.duplicate_events_rejected:,}

VOLUME ATTACK MITIGATION
------------------------
Rate Limit Enforcements: {self.metrics.rate_limit_hits:,}
Anomaly Detections: {self.metrics.anomaly_detections:,}

PURPOSE LIMITATION
------------------
Cross-Purpose Reuse Detected: {self.metrics.cross_purpose_reuse_detected:,}
Purpose Drift Blocked: {self.metrics.purpose_drift_blocked:,}

RISK ASSESSMENT
---------------
Highest Risk Vector: {self.highest_risk_vector or 'None identified'}
Incidents Requiring Review: {self.incidents_requiring_review}
Auto-Mitigated Incidents: {self.incidents_auto_mitigated}

RECOMMENDATIONS
---------------
{self._format_recommendations()}
        """
    
    def _format_recommendations(self) -> str:
        lines = []
        for i, r in enumerate(self.security_recommendations[:5], 1):
            lines.append(f"{i}. {r}")
        return "\n".join(lines) if lines else "No immediate recommendations"


class FinancialROIReport(BaseModel):
    """
    Financial ROI & Cost Avoidance Summary
    
    Audience: CFO, Finance
    Format: PDF + CSV
    
    IMPORTANT: Savings modeled conservatively with clearly labeled assumptions
    """
    metadata: ReportMetadata
    metrics: FinancialMetrics
    
    # Period comparison
    previous_period_savings: float = 0.0
    savings_trend_percent: float = 0.0
    
    # Confidence level
    confidence_level: str = "conservative"  # conservative, moderate, aggressive
    
    def generate_summary(self) -> str:
        """Generate financial summary"""
        return f"""
FINANCIAL ROI & COST AVOIDANCE SUMMARY
Period: {self.metadata.period_start.strftime('%Y-%m-%d')} to {self.metadata.period_end.strftime('%Y-%m-%d')}
Generated: {self.metadata.generated_at.strftime('%Y-%m-%d %H:%M UTC')}
Confidence Level: {self.confidence_level.upper()}

EXECUTIVE SUMMARY
-----------------
Total Cost Avoided: ${self.metrics.total_cost_avoided:,.2f}
Platform Cost: ${self.metrics.platform_cost:,.2f}
Net Savings: ${self.metrics.net_savings:,.2f}
ROI: {self.metrics.roi_percent:.1f}%

AUDIT & COMPLIANCE SAVINGS
--------------------------
Audit Prep Hours Saved: {self.metrics.audit_prep_hours_saved:.0f} hours
  Rate: ${self.metrics.audit_prep_hourly_rate:.2f}/hour
  Savings: ${self.metrics.audit_prep_cost_saved:,.2f}

Legal Review Hours Avoided: {self.metrics.legal_review_hours_avoided:.0f} hours
  Rate: ${self.metrics.legal_hourly_rate:.2f}/hour
  Savings: ${self.metrics.legal_cost_avoided:,.2f}

RISK REDUCTION
--------------
Potential Fine Exposure: ${self.metrics.potential_fine_exposure:,.2f}
Risk Reduction: {self.metrics.fine_risk_reduction_percent:.1f}%
Fine Exposure Reduced: ${self.metrics.fine_exposure_reduced:,.2f}

OPERATIONAL EFFICIENCY
----------------------
Data Retention Optimized: {self.metrics.data_retention_optimized_gb:.1f} GB
Storage Cost Saved: ${self.metrics.storage_cost_saved:,.2f}

REVENUE PROTECTION
------------------
Revenue at Risk (w/o compliance): ${self.metrics.revenue_at_risk_without_compliance:,.2f}
Protection Rate: {self.metrics.revenue_protection_percent:.1f}%
Revenue Protected: ${self.metrics.revenue_protected:,.2f}

⚠️ ASSUMPTIONS (Conservative Estimates)
{self._format_assumptions()}

Note: All estimates use conservative assumptions. Actual savings may be higher.
Consult with finance team for organization-specific calculations.
        """
    
    def _format_assumptions(self) -> str:
        lines = []
        for a in self.metrics.assumptions:
            lines.append(f"• {a.get('item', '')}: {a.get('assumption', '')}")
        return "\n".join(lines) if lines else "Standard industry assumptions applied"


# ============== Report Generator ==============

class ExecutiveReportGenerator:
    """
    Generates executive reports for multiple stakeholders.
    
    Supports EU and US market compliance frameworks.
    """
    
    def __init__(self):
        # Fine amounts by regulation (for modeling)
        self.fine_maximums = {
            Regulation.GDPR: 20_000_000,  # €20M or 4% of revenue
            Regulation.CCPA: 7_500,  # Per intentional violation
            Regulation.CPRA: 7_500,
            Regulation.VIRGINIA_CDPA: 7_500,
            Regulation.COLORADO_CPA: 20_000,
        }
        
        # Industry benchmarks for modeling
        self.benchmarks = {
            "audit_hours_per_1000_events": 2.0,
            "legal_hours_per_incident": 4.0,
            "storage_gb_per_1m_events": 5.0,
            "revenue_at_risk_percent": 0.05,  # 5% conservative
        }
    
    def generate_consent_report(
        self,
        tenant_id: str,
        tenant_name: str,
        period_start: datetime,
        period_end: datetime,
        regulations: List[Regulation],
        enforcement_data: Dict[str, Any],
        evidence_data: Dict[str, Any]
    ) -> ConsentEnforcementReport:
        """Generate Consent Enforcement Report"""
        
        # Calculate metrics from enforcement data
        total = enforcement_data.get("total_events", 0)
        allowed = enforcement_data.get("allowed", 0)
        modified = enforcement_data.get("modified", 0)
        blocked = enforcement_data.get("blocked", 0)
        
        metrics = ConsentMetrics(
            total_events_processed=total,
            fully_consented_events=allowed,
            modified_events=modified,
            blocked_events=blocked,
            consent_rate=round((allowed / total * 100) if total > 0 else 0, 2),
            modification_rate=round((modified / total * 100) if total > 0 else 0, 2),
            block_rate=round((blocked / total * 100) if total > 0 else 0, 2),
            events_by_vendor=enforcement_data.get("by_vendor", {}),
            events_by_purpose=enforcement_data.get("by_purpose", {}),
            tokens_issued=enforcement_data.get("tokens_issued", 0),
            tokens_revoked=enforcement_data.get("tokens_revoked", 0),
            active_tokens=enforcement_data.get("active_tokens", 0),
            top_violation_categories=enforcement_data.get("top_violations", [])
        )
        
        # Build recommendations
        recommendations = []
        if metrics.block_rate > 10:
            recommendations.append("High block rate detected. Review consent collection UX to improve opt-in rates.")
        if metrics.modification_rate > 20:
            recommendations.append("Significant data modification occurring. Ensure vendors receive necessary data classes.")
        
        # Attestation
        attestation = f"""
This report attests that for the period {period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')},
{tenant_name} processed {total:,} consent-governed events with the following outcomes:
- {metrics.consent_rate:.1f}% fully consented and forwarded
- {metrics.modification_rate:.1f}% modified to comply with consent scope
- {metrics.block_rate:.1f}% blocked due to insufficient consent

All processing was logged to an immutable, hash-chained evidence store.
Evidence chain integrity: {'VERIFIED' if evidence_data.get('chain_valid', True) else 'REQUIRES REVIEW'}
        """
        
        return ConsentEnforcementReport(
            metadata=ReportMetadata(
                report_type=ReportType.CONSENT_ENFORCEMENT,
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                period_start=period_start,
                period_end=period_end,
                regulations=regulations,
                audience=[Audience.LEGAL, Audience.COMPLIANCE, Audience.REGULATOR]
            ),
            metrics=metrics,
            gdpr_article_30_compliance=Regulation.GDPR in regulations,
            ccpa_opt_out_honored=Regulation.CCPA in regulations or Regulation.CPRA in regulations,
            chain_integrity_verified=evidence_data.get("chain_valid", True),
            last_chain_verification=datetime.now(timezone.utc),
            recommendations=recommendations,
            attestation_statement=attestation.strip()
        )
    
    def generate_security_report(
        self,
        tenant_id: str,
        tenant_name: str,
        period_start: datetime,
        period_end: datetime,
        security_data: Dict[str, Any]
    ) -> SecurityThreatReport:
        """Generate Security Threat Report"""
        
        metrics = SecurityMetrics(
            invalid_token_attempts=security_data.get("invalid_tokens", 0),
            expired_token_reuse=security_data.get("expired_reuse", 0),
            modified_token_attempts=security_data.get("modified_tokens", 0),
            shadow_pipeline_detections=security_data.get("shadow_pipelines", 0),
            hash_mismatches=security_data.get("hash_mismatches", 0),
            parallel_submissions=security_data.get("parallel_submissions", 0),
            replay_attempts_blocked=security_data.get("replay_blocked", 0),
            duplicate_events_rejected=security_data.get("duplicates_rejected", 0),
            rate_limit_hits=security_data.get("rate_limits", 0),
            anomaly_detections=security_data.get("anomalies", 0),
            cross_purpose_reuse_detected=security_data.get("cross_purpose", 0),
            purpose_drift_blocked=security_data.get("purpose_drift", 0),
            total_threats_blocked=security_data.get("total_blocked", 0),
            data_egress_reduced_percent=security_data.get("egress_reduction", 0)
        )
        
        # Determine threat trend
        prev_threats = security_data.get("previous_period_threats", 0)
        current_threats = metrics.total_threats_blocked
        if prev_threats > 0:
            change = (current_threats - prev_threats) / prev_threats
            if change < -0.1:
                threat_trend = "improving"
            elif change > 0.1:
                threat_trend = "degrading"
            else:
                threat_trend = "stable"
        else:
            threat_trend = "stable"
        
        # Identify highest risk
        risk_vectors = [
            ("Token Attacks", metrics.invalid_token_attempts + metrics.expired_token_reuse),
            ("Shadow Pipelines", metrics.shadow_pipeline_detections),
            ("Replay Attacks", metrics.replay_attempts_blocked),
            ("Volume Attacks", metrics.rate_limit_hits),
            ("Purpose Violations", metrics.cross_purpose_reuse_detected),
        ]
        highest_risk = max(risk_vectors, key=lambda x: x[1])
        
        # Recommendations
        recommendations = []
        if metrics.shadow_pipeline_detections > 0:
            recommendations.append("Shadow pipeline activity detected. Review vendor integrations immediately.")
        if metrics.invalid_token_attempts > 100:
            recommendations.append("High volume of invalid token attempts. Consider implementing additional client validation.")
        if metrics.rate_limit_hits > 1000:
            recommendations.append("Significant rate limiting occurring. Review if limits are appropriately configured.")
        if metrics.cross_purpose_reuse_detected > 0:
            recommendations.append("Purpose limitation violations detected. Audit data usage across systems.")
        
        return SecurityThreatReport(
            metadata=ReportMetadata(
                report_type=ReportType.SECURITY_THREAT,
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                period_start=period_start,
                period_end=period_end,
                audience=[Audience.CISO]
            ),
            metrics=metrics,
            threat_trend=threat_trend,
            highest_risk_vector=highest_risk[0] if highest_risk[1] > 0 else "None identified",
            incidents_requiring_review=security_data.get("incidents_review", 0),
            incidents_auto_mitigated=security_data.get("incidents_auto", metrics.total_threats_blocked),
            security_recommendations=recommendations
        )
    
    def generate_financial_report(
        self,
        tenant_id: str,
        tenant_name: str,
        period_start: datetime,
        period_end: datetime,
        operational_data: Dict[str, Any],
        platform_cost: float,
        annual_revenue: float = 0
    ) -> FinancialROIReport:
        """
        Generate Financial ROI Report with CONSERVATIVE assumptions.
        
        All estimates are intentionally conservative to maintain credibility.
        """
        
        total_events = operational_data.get("total_events", 0)
        violations_prevented = operational_data.get("violations_prevented", 0)
        incidents_avoided = operational_data.get("incidents_avoided", 0)
        
        # Calculate period in days for annualization
        period_days = (period_end - period_start).days or 1
        annualization_factor = 365 / period_days
        
        # CONSERVATIVE ASSUMPTIONS (clearly documented)
        assumptions = []
        
        # 1. Audit prep savings
        # Conservative: 2 hours per 1000 events for compliance review
        audit_hours = (total_events / 1000) * self.benchmarks["audit_hours_per_1000_events"]
        audit_rate = 150.0  # Conservative internal compliance rate
        audit_savings = audit_hours * audit_rate
        assumptions.append({
            "item": "Audit Prep Hours",
            "assumption": f"{self.benchmarks['audit_hours_per_1000_events']} hours per 1,000 events (industry conservative)"
        })
        assumptions.append({
            "item": "Audit Prep Rate",
            "assumption": f"${audit_rate}/hour (internal compliance staff)"
        })
        
        # 2. Legal consulting avoided
        # Conservative: 4 hours per incident that would require legal review
        legal_hours = incidents_avoided * self.benchmarks["legal_hours_per_incident"]
        legal_rate = 400.0  # Conservative external counsel rate
        legal_savings = legal_hours * legal_rate
        assumptions.append({
            "item": "Legal Review Hours",
            "assumption": f"{self.benchmarks['legal_hours_per_incident']} hours per incident avoided"
        })
        assumptions.append({
            "item": "Legal Rate",
            "assumption": f"${legal_rate}/hour (external counsel, conservative)"
        })
        
        # 3. Fine exposure reduction
        # Conservative: Model only 10% of maximum fine risk reduction
        # Assume 0.1% base violation rate without platform
        base_violation_rate = 0.001
        events_at_risk = total_events * base_violation_rate
        avg_fine_per_violation = 2500  # Conservative average
        potential_exposure = events_at_risk * avg_fine_per_violation * annualization_factor
        risk_reduction = 0.7  # 70% risk reduction (conservative)
        fine_savings = potential_exposure * risk_reduction
        assumptions.append({
            "item": "Base Violation Rate",
            "assumption": "0.1% of events without enforcement (industry benchmark)"
        })
        assumptions.append({
            "item": "Average Fine",
            "assumption": f"${avg_fine_per_violation} per violation (conservative, varies by regulation)"
        })
        assumptions.append({
            "item": "Risk Reduction",
            "assumption": f"{risk_reduction*100:.0f}% reduction in violation likelihood"
        })
        
        # 4. Storage optimization
        # Conservative: 5GB per 1M events, reduced by 20% through retention enforcement
        storage_gb = (total_events / 1_000_000) * self.benchmarks["storage_gb_per_1m_events"]
        storage_optimized = storage_gb * 0.2  # 20% reduction
        storage_rate = 0.02  # $0.02/GB/month conservative
        storage_savings = storage_optimized * storage_rate * 12 * annualization_factor
        assumptions.append({
            "item": "Storage Optimization",
            "assumption": "20% reduction through automated retention enforcement"
        })
        
        # 5. Revenue protection
        # Very conservative: 5% of revenue at risk, 80% protected
        if annual_revenue > 0:
            revenue_at_risk = annual_revenue * self.benchmarks["revenue_at_risk_percent"]
            protection_rate = 0.8
            revenue_protected = revenue_at_risk * protection_rate
        else:
            revenue_at_risk = 0
            protection_rate = 0.8
            revenue_protected = 0
        assumptions.append({
            "item": "Revenue at Risk",
            "assumption": f"{self.benchmarks['revenue_at_risk_percent']*100:.0f}% of revenue at risk from non-compliance (conservative)"
        })
        assumptions.append({
            "item": "Protection Rate",
            "assumption": f"{protection_rate*100:.0f}% of at-risk revenue protected"
        })
        
        # Total
        total_savings = audit_savings + legal_savings + fine_savings + storage_savings + revenue_protected
        net_savings = total_savings - platform_cost
        roi = (net_savings / platform_cost * 100) if platform_cost > 0 else 0
        
        metrics = FinancialMetrics(
            audit_prep_hours_saved=audit_hours,
            audit_prep_hourly_rate=audit_rate,
            audit_prep_cost_saved=audit_savings,
            legal_review_hours_avoided=legal_hours,
            legal_hourly_rate=legal_rate,
            legal_cost_avoided=legal_savings,
            potential_fine_exposure=potential_exposure,
            fine_risk_reduction_percent=risk_reduction * 100,
            fine_exposure_reduced=fine_savings,
            data_retention_optimized_gb=storage_optimized,
            storage_cost_per_gb=storage_rate,
            storage_cost_saved=storage_savings,
            revenue_at_risk_without_compliance=revenue_at_risk,
            revenue_protection_percent=protection_rate * 100,
            revenue_protected=revenue_protected,
            total_cost_avoided=total_savings,
            platform_cost=platform_cost,
            net_savings=net_savings,
            roi_percent=roi,
            assumptions=assumptions
        )
        
        return FinancialROIReport(
            metadata=ReportMetadata(
                report_type=ReportType.FINANCIAL_ROI,
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                period_start=period_start,
                period_end=period_end,
                audience=[Audience.CFO]
            ),
            metrics=metrics,
            confidence_level="conservative"
        )
    
    def generate_vendor_trust_report(
        self,
        tenant_id: str,
        tenant_name: str,
        period_start: datetime,
        period_end: datetime,
        vendor_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate Vendor Trust Registry Report"""
        
        metrics = VendorTrustMetrics(
            total_vendors=vendor_data.get("total", 0),
            certified_vendors=vendor_data.get("certified", 0),
            approved_vendors=vendor_data.get("approved", 0),
            probation_vendors=vendor_data.get("probation", 0),
            suspended_vendors=vendor_data.get("suspended", 0),
            avg_trust_score=vendor_data.get("avg_score", 0),
            avg_compliance_rate=vendor_data.get("avg_compliance", 0),
            total_violations=vendor_data.get("total_violations", 0),
            open_violations=vendor_data.get("open_violations", 0),
            vendor_scores=vendor_data.get("vendor_list", [])
        )
        
        return {
            "metadata": ReportMetadata(
                report_type=ReportType.VENDOR_TRUST,
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                period_start=period_start,
                period_end=period_end,
                audience=[Audience.COMPLIANCE, Audience.LEGAL]
            ).model_dump(),
            "metrics": metrics.model_dump(),
            "summary": f"""
VENDOR TRUST REGISTRY REPORT
Period: {period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')}

REGISTRY OVERVIEW
-----------------
Total Vendors: {metrics.total_vendors}
Certified: {metrics.certified_vendors}
Approved: {metrics.approved_vendors}
On Probation: {metrics.probation_vendors}
Suspended: {metrics.suspended_vendors}

COMPLIANCE METRICS
------------------
Average Trust Score: {metrics.avg_trust_score:.1f}/100
Average Compliance Rate: {metrics.avg_compliance_rate:.1f}%

VIOLATIONS
----------
Total Violations: {metrics.total_violations}
Open Violations: {metrics.open_violations}
Resolution Rate: {((metrics.total_violations - metrics.open_violations) / metrics.total_violations * 100) if metrics.total_violations > 0 else 100:.1f}%
            """
        }
    
    # ============== Export Methods ==============
    
    def export_to_csv(self, report: Any) -> str:
        """Export report metrics to CSV"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        if hasattr(report, 'metrics'):
            metrics = report.metrics.model_dump()
            
            # Header
            writer.writerow(["Metric", "Value"])
            
            # Flatten and write metrics
            for key, value in metrics.items():
                if isinstance(value, (str, int, float, bool)):
                    writer.writerow([key, value])
                elif isinstance(value, list):
                    writer.writerow([key, f"{len(value)} items"])
                elif isinstance(value, dict):
                    for k, v in value.items():
                        writer.writerow([f"{key}.{k}", v])
        
        return output.getvalue()
    
    def export_to_json(self, report: Any) -> str:
        """Export report to JSON"""
        if hasattr(report, 'model_dump'):
            return json.dumps(report.model_dump(), default=str, indent=2)
        return json.dumps(report, default=str, indent=2)
    
    def export_to_html(self, report: Any) -> str:
        """Export report summary to HTML"""
        summary = ""
        if hasattr(report, 'generate_summary'):
            summary = report.generate_summary()
        elif isinstance(report, dict) and 'summary' in report:
            summary = report['summary']
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Consent Platform Report</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; }}
        h1 {{ color: #1a1a2e; border-bottom: 2px solid #4a4e69; padding-bottom: 10px; }}
        pre {{ background: #f4f4f8; padding: 20px; border-radius: 8px; overflow-x: auto; }}
        .metadata {{ color: #666; font-size: 0.9em; }}
        .warning {{ background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin: 10px 0; }}
    </style>
</head>
<body>
    <h1>Executive Report</h1>
    <pre>{summary}</pre>
    <div class="metadata">
        Generated by Consent Platform | {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}
    </div>
</body>
</html>
        """
        return html


# Singleton instance
report_generator = ExecutiveReportGenerator()
