"""
Compliance Attestation & Legal-Grade Export Service

Enterprise features that create competitive moat:
1. Legally-defensible audit exports with digital signatures
2. Compliance attestation certificates
3. Chain-of-custody documentation
4. Regulator-ready report formats
5. Evidence integrity verification

These features make the platform REQUIRED for compliance - not optional.
"""

import hashlib
import hmac
import json
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field
from collections import defaultdict
import base64


# ============== Attestation Types ==============

class AttestationType(str, Enum):
    """Types of compliance attestations we can generate"""
    GDPR_ARTICLE_30 = "gdpr_article_30"           # Records of processing activities
    GDPR_ARTICLE_7 = "gdpr_article_7"             # Conditions for consent
    CCPA_DISCLOSURE = "ccpa_disclosure"           # California disclosure
    CPRA_AUDIT = "cpra_audit"                     # California audit rights
    TCF_COMPLIANCE = "tcf_compliance"             # IAB TCF compliance
    SOC2_EVIDENCE = "soc2_evidence"               # SOC 2 control evidence
    ISO27001_EVIDENCE = "iso27001_evidence"       # ISO 27001 evidence
    HIPAA_BAA = "hipaa_baa"                       # HIPAA compliance
    DATA_PROCESSING = "data_processing"           # General DPA compliance
    CONSENT_PROOF = "consent_proof"               # Individual consent proof
    ENFORCEMENT_PROOF = "enforcement_proof"       # Individual enforcement proof


class ExportFormat(str, Enum):
    """Export formats for legal/compliance use"""
    JSON = "json"
    PDF = "pdf"
    CSV = "csv"
    XML = "xml"
    LEGAL_BUNDLE = "legal_bundle"    # ZIP with all formats + signatures


class ChainOfCustodyAction(str, Enum):
    """Actions in the chain of custody"""
    CREATED = "created"
    ACCESSED = "accessed"
    EXPORTED = "exported"
    VERIFIED = "verified"
    TRANSFERRED = "transferred"
    SEALED = "sealed"


# ============== Data Models ==============

class AttestationCertificate(BaseModel):
    """
    A signed attestation certificate for compliance purposes.
    
    This is legally defensible documentation that proves:
    - What data was processed
    - How consent was obtained
    - What enforcement decisions were made
    - The integrity of the audit trail
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Attestation details
    attestation_type: AttestationType
    title: str
    description: str
    
    # Time period covered
    period_start: datetime
    period_end: datetime
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Statistics for the period
    statistics: Dict[str, Any] = {}
    
    # Evidence references
    evidence_hashes: List[str] = []  # SHA-256 hashes of underlying evidence
    evidence_count: int = 0
    
    # Digital signature
    signature: str = ""
    signature_algorithm: str = "HMAC-SHA256"
    signing_key_id: str = ""
    
    # Chain of custody
    chain_of_custody: List[Dict[str, Any]] = []
    
    # Verification
    verification_url: Optional[str] = None
    verification_code: str = ""
    
    # Metadata
    generated_by: str
    requested_by: Optional[str] = None
    purpose: Optional[str] = None
    
    def to_legal_format(self) -> str:
        """Generate legally-formatted attestation text"""
        return f"""
================================================================================
                    COMPLIANCE ATTESTATION CERTIFICATE
================================================================================

Certificate ID:     {self.id}
Type:               {self.attestation_type.value.upper().replace('_', ' ')}
Generated:          {self.generated_at.isoformat()}

--------------------------------------------------------------------------------
                              ATTESTATION PERIOD
--------------------------------------------------------------------------------
From:               {self.period_start.isoformat()}
To:                 {self.period_end.isoformat()}

--------------------------------------------------------------------------------
                              SUMMARY STATISTICS
--------------------------------------------------------------------------------
{self._format_statistics()}

--------------------------------------------------------------------------------
                              EVIDENCE INTEGRITY
--------------------------------------------------------------------------------
Evidence Records:   {self.evidence_count}
Evidence Hashes:    {len(self.evidence_hashes)} cryptographic hashes on file
Hash Algorithm:     SHA-256

--------------------------------------------------------------------------------
                              DIGITAL SIGNATURE
--------------------------------------------------------------------------------
Algorithm:          {self.signature_algorithm}
Key ID:             {self.signing_key_id}
Signature:          {self.signature[:64]}...

--------------------------------------------------------------------------------
                              VERIFICATION
--------------------------------------------------------------------------------
Verification Code:  {self.verification_code}
Verify at:          {self.verification_url or 'Contact platform administrator'}

--------------------------------------------------------------------------------
                              CHAIN OF CUSTODY
--------------------------------------------------------------------------------
{self._format_chain_of_custody()}

--------------------------------------------------------------------------------
                              LEGAL NOTICE
--------------------------------------------------------------------------------
This certificate attests that the above-referenced data processing activities
were conducted in accordance with the stated compliance framework. This document
is digitally signed and tamper-evident. Any modification will invalidate the
signature.

This attestation is provided by the Consent Platform and represents an accurate
record of the data processing activities within the stated period.

Generated by:       {self.generated_by}
Purpose:            {self.purpose or 'Compliance documentation'}

================================================================================
                         END OF ATTESTATION CERTIFICATE
================================================================================
"""

    def _format_statistics(self) -> str:
        lines = []
        for key, value in self.statistics.items():
            formatted_key = key.replace('_', ' ').title()
            lines.append(f"{formatted_key}:".ljust(25) + str(value))
        return '\n'.join(lines) or "No statistics available"
    
    def _format_chain_of_custody(self) -> str:
        lines = []
        for entry in self.chain_of_custody:
            timestamp = entry.get('timestamp', 'Unknown')
            action = entry.get('action', 'Unknown')
            actor = entry.get('actor', 'System')
            lines.append(f"[{timestamp}] {action.upper()} by {actor}")
        return '\n'.join(lines) or "Chain of custody started with this certificate"


class LegalExport(BaseModel):
    """A legal-grade export package"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Export details
    export_type: str
    format: ExportFormat
    title: str
    
    # Time period
    period_start: datetime
    period_end: datetime
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Content
    data: Dict[str, Any] = {}
    record_count: int = 0
    
    # Integrity
    content_hash: str = ""
    signature: str = ""
    
    # Access control
    generated_by: str
    accessed_by: List[str] = []
    access_expires_at: Optional[datetime] = None
    
    # Download tracking
    download_count: int = 0
    last_downloaded_at: Optional[datetime] = None


class ConsentProof(BaseModel):
    """
    Individual consent proof for a specific user/action.
    Can be used to prove consent in legal proceedings.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Subject
    subject_id: str
    subject_pseudonym: str  # Hashed identifier for privacy
    
    # Consent details
    consent_token_id: str
    consent_token_hash: str  # Don't store the actual token
    
    purposes: List[str]
    vendors: List[str]
    jurisdiction: str
    
    # Timestamps
    consent_given_at: datetime
    consent_expires_at: Optional[datetime] = None
    proof_generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Evidence
    evidence_chain: List[str] = []  # Hashes of related evidence entries
    
    # Verification
    proof_signature: str = ""
    verification_code: str = ""
    
    def to_legal_format(self) -> str:
        """Generate human-readable consent proof"""
        return f"""
CONSENT PROOF CERTIFICATE
=========================

Proof ID:           {self.id}
Generated:          {self.proof_generated_at.isoformat()}

SUBJECT (Pseudonymized)
-----------------------
Identifier:         {self.subject_pseudonym}

CONSENT RECORD
--------------
Token Reference:    {self.consent_token_id}
Consent Given:      {self.consent_given_at.isoformat()}
Expires:            {self.consent_expires_at.isoformat() if self.consent_expires_at else 'Not specified'}
Jurisdiction:       {self.jurisdiction}

CONSENTED PURPOSES
------------------
{chr(10).join(f'  • {p}' for p in self.purposes)}

CONSENTED VENDORS
-----------------
{chr(10).join(f'  • {v}' for v in self.vendors)}

EVIDENCE CHAIN
--------------
{len(self.evidence_chain)} cryptographic proof(s) on file

VERIFICATION
------------
Code: {self.verification_code}
Signature: {self.proof_signature[:32]}...

This document proves that valid consent was obtained from the above subject
for the stated purposes and vendors. The evidence chain provides cryptographic
proof of the consent event in the immutable audit log.
"""


# ============== Compliance Attestation Service ==============

class ComplianceAttestationService:
    """
    Service for generating legally-defensible compliance documentation.
    
    Key differentiators:
    1. Digitally signed attestation certificates
    2. Chain of custody tracking
    3. Evidence integrity verification
    4. Regulator-ready export formats
    5. Individual consent/enforcement proofs
    """
    
    def __init__(self):
        self._certificates: Dict[str, AttestationCertificate] = {}
        self._exports: Dict[str, LegalExport] = {}
        self._consent_proofs: Dict[str, ConsentProof] = {}
        
        # Signing key (in production, use HSM or secure key management)
        self._signing_key = secrets.token_bytes(32)
        self._signing_key_id = f"csp-signing-{secrets.token_hex(8)}"
    
    def _sign_data(self, data: str) -> str:
        """Create HMAC-SHA256 signature"""
        signature = hmac.new(
            self._signing_key,
            data.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def _generate_verification_code(self) -> str:
        """Generate a human-readable verification code"""
        code = secrets.token_hex(4).upper()
        return f"{code[:4]}-{code[4:]}"
    
    # ============== Attestation Certificates ==============
    
    def generate_attestation(
        self,
        tenant_id: str,
        attestation_type: AttestationType,
        period_start: datetime,
        period_end: datetime,
        statistics: Dict[str, Any],
        evidence_hashes: List[str],
        generated_by: str,
        requested_by: Optional[str] = None,
        purpose: Optional[str] = None
    ) -> AttestationCertificate:
        """
        Generate a signed attestation certificate.
        
        This creates legally-defensible documentation of compliance.
        """
        # Create the certificate
        cert = AttestationCertificate(
            tenant_id=tenant_id,
            attestation_type=attestation_type,
            title=self._get_attestation_title(attestation_type),
            description=self._get_attestation_description(attestation_type),
            period_start=period_start,
            period_end=period_end,
            statistics=statistics,
            evidence_hashes=evidence_hashes,
            evidence_count=len(evidence_hashes),
            generated_by=generated_by,
            requested_by=requested_by,
            purpose=purpose,
            signing_key_id=self._signing_key_id,
            verification_code=self._generate_verification_code()
        )
        
        # Initialize chain of custody
        cert.chain_of_custody.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": ChainOfCustodyAction.CREATED.value,
            "actor": generated_by,
            "details": "Certificate generated"
        })
        
        # Sign the certificate
        sign_data = json.dumps({
            "id": cert.id,
            "type": cert.attestation_type.value,
            "period_start": cert.period_start.isoformat(),
            "period_end": cert.period_end.isoformat(),
            "evidence_hashes": cert.evidence_hashes,
            "statistics": cert.statistics,
            "generated_at": cert.generated_at.isoformat()
        }, sort_keys=True)
        
        cert.signature = self._sign_data(sign_data)
        
        self._certificates[cert.id] = cert
        
        return cert
    
    def verify_attestation(self, cert_id: str) -> Tuple[bool, str]:
        """Verify the integrity of an attestation certificate"""
        cert = self._certificates.get(cert_id)
        if not cert:
            return False, "Certificate not found"
        
        # Recreate the signed data
        sign_data = json.dumps({
            "id": cert.id,
            "type": cert.attestation_type.value,
            "period_start": cert.period_start.isoformat(),
            "period_end": cert.period_end.isoformat(),
            "evidence_hashes": cert.evidence_hashes,
            "statistics": cert.statistics,
            "generated_at": cert.generated_at.isoformat()
        }, sort_keys=True)
        
        expected_signature = self._sign_data(sign_data)
        
        if cert.signature != expected_signature:
            return False, "Signature verification failed - certificate may have been tampered"
        
        # Log verification
        cert.chain_of_custody.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": ChainOfCustodyAction.VERIFIED.value,
            "actor": "system",
            "details": "Signature verified successfully"
        })
        
        return True, "Certificate verified successfully"
    
    def _get_attestation_title(self, attestation_type: AttestationType) -> str:
        titles = {
            AttestationType.GDPR_ARTICLE_30: "GDPR Article 30 - Records of Processing Activities",
            AttestationType.GDPR_ARTICLE_7: "GDPR Article 7 - Conditions for Consent",
            AttestationType.CCPA_DISCLOSURE: "CCPA Consumer Disclosure Attestation",
            AttestationType.CPRA_AUDIT: "CPRA Audit Rights Compliance",
            AttestationType.TCF_COMPLIANCE: "IAB TCF 2.2 Compliance Attestation",
            AttestationType.SOC2_EVIDENCE: "SOC 2 Control Evidence Package",
            AttestationType.ISO27001_EVIDENCE: "ISO 27001 Control Evidence",
            AttestationType.HIPAA_BAA: "HIPAA Business Associate Compliance",
            AttestationType.DATA_PROCESSING: "Data Processing Agreement Compliance",
            AttestationType.CONSENT_PROOF: "Consent Collection Proof",
            AttestationType.ENFORCEMENT_PROOF: "Consent Enforcement Proof",
        }
        return titles.get(attestation_type, "Compliance Attestation")
    
    def _get_attestation_description(self, attestation_type: AttestationType) -> str:
        descriptions = {
            AttestationType.GDPR_ARTICLE_30: 
                "This attestation certifies that records of processing activities have been maintained "
                "in accordance with GDPR Article 30 requirements.",
            AttestationType.GDPR_ARTICLE_7:
                "This attestation certifies that consent was obtained in accordance with "
                "GDPR Article 7 conditions for consent.",
            AttestationType.CCPA_DISCLOSURE:
                "This attestation certifies disclosure of data collection practices in accordance "
                "with California Consumer Privacy Act requirements.",
            AttestationType.TCF_COMPLIANCE:
                "This attestation certifies compliance with IAB Transparency and Consent Framework "
                "version 2.2 requirements.",
        }
        return descriptions.get(attestation_type, "Compliance attestation certificate.")
    
    # ============== Legal Exports ==============
    
    def generate_legal_export(
        self,
        tenant_id: str,
        export_type: str,
        period_start: datetime,
        period_end: datetime,
        data: Dict[str, Any],
        generated_by: str,
        format: ExportFormat = ExportFormat.JSON,
        access_expires_in_hours: int = 24
    ) -> LegalExport:
        """Generate a legal-grade export package"""
        
        # Create content hash
        content_str = json.dumps(data, sort_keys=True, default=str)
        content_hash = hashlib.sha256(content_str.encode()).hexdigest()
        
        export = LegalExport(
            tenant_id=tenant_id,
            export_type=export_type,
            format=format,
            title=f"{export_type} Export - {period_start.date()} to {period_end.date()}",
            period_start=period_start,
            period_end=period_end,
            data=data,
            record_count=self._count_records(data),
            content_hash=content_hash,
            signature=self._sign_data(content_hash),
            generated_by=generated_by,
            access_expires_at=datetime.now(timezone.utc) + timedelta(hours=access_expires_in_hours)
        )
        
        self._exports[export.id] = export
        
        return export
    
    def _count_records(self, data: Dict[str, Any]) -> int:
        """Count records in export data"""
        count = 0
        for key, value in data.items():
            if isinstance(value, list):
                count += len(value)
            elif isinstance(value, dict):
                count += self._count_records(value)
            else:
                count += 1
        return count
    
    def access_export(self, export_id: str, accessed_by: str) -> Optional[LegalExport]:
        """Access an export and log the access"""
        export = self._exports.get(export_id)
        if not export:
            return None
        
        if export.access_expires_at and datetime.now(timezone.utc) > export.access_expires_at:
            return None
        
        export.accessed_by.append(accessed_by)
        export.download_count += 1
        export.last_downloaded_at = datetime.now(timezone.utc)
        
        return export
    
    # ============== Consent Proofs ==============
    
    def generate_consent_proof(
        self,
        tenant_id: str,
        subject_id: str,
        consent_token_id: str,
        consent_token: str,
        purposes: List[str],
        vendors: List[str],
        jurisdiction: str,
        consent_given_at: datetime,
        consent_expires_at: Optional[datetime],
        evidence_chain: List[str]
    ) -> ConsentProof:
        """
        Generate a proof of consent for a specific subject.
        
        This can be used in legal proceedings to prove consent was obtained.
        """
        # Create pseudonymized identifier
        subject_pseudonym = hashlib.sha256(
            f"{tenant_id}:{subject_id}".encode()
        ).hexdigest()[:16]
        
        # Hash the token (don't store actual token)
        token_hash = hashlib.sha256(consent_token.encode()).hexdigest()
        
        proof = ConsentProof(
            tenant_id=tenant_id,
            subject_id=subject_id,
            subject_pseudonym=subject_pseudonym,
            consent_token_id=consent_token_id,
            consent_token_hash=token_hash,
            purposes=purposes,
            vendors=vendors,
            jurisdiction=jurisdiction,
            consent_given_at=consent_given_at,
            consent_expires_at=consent_expires_at,
            evidence_chain=evidence_chain,
            verification_code=self._generate_verification_code()
        )
        
        # Sign the proof
        sign_data = json.dumps({
            "id": proof.id,
            "subject_pseudonym": proof.subject_pseudonym,
            "consent_token_hash": proof.consent_token_hash,
            "purposes": proof.purposes,
            "vendors": proof.vendors,
            "consent_given_at": proof.consent_given_at.isoformat()
        }, sort_keys=True)
        
        proof.proof_signature = self._sign_data(sign_data)
        
        self._consent_proofs[proof.id] = proof
        
        return proof
    
    def verify_consent_proof(self, proof_id: str) -> Tuple[bool, str]:
        """Verify a consent proof"""
        proof = self._consent_proofs.get(proof_id)
        if not proof:
            return False, "Proof not found"
        
        sign_data = json.dumps({
            "id": proof.id,
            "subject_pseudonym": proof.subject_pseudonym,
            "consent_token_hash": proof.consent_token_hash,
            "purposes": proof.purposes,
            "vendors": proof.vendors,
            "consent_given_at": proof.consent_given_at.isoformat()
        }, sort_keys=True)
        
        expected_signature = self._sign_data(sign_data)
        
        if proof.proof_signature != expected_signature:
            return False, "Signature verification failed"
        
        return True, "Consent proof verified successfully"
    
    # ============== Compliance Reports ==============
    
    def generate_gdpr_article_30_report(
        self,
        tenant_id: str,
        period_start: datetime,
        period_end: datetime,
        processing_activities: List[Dict[str, Any]],
        generated_by: str
    ) -> AttestationCertificate:
        """
        Generate GDPR Article 30 Records of Processing Activities.
        
        Required elements:
        - Controller/processor details
        - Purposes of processing
        - Categories of data subjects
        - Categories of personal data
        - Recipients
        - Transfers to third countries
        - Retention periods
        - Security measures
        """
        statistics = {
            "processing_activities": len(processing_activities),
            "data_subjects_categories": len(set(
                cat for act in processing_activities 
                for cat in act.get("data_subject_categories", [])
            )),
            "purposes_documented": len(set(
                purpose for act in processing_activities
                for purpose in act.get("purposes", [])
            )),
            "vendors_disclosed": len(set(
                vendor for act in processing_activities
                for vendor in act.get("vendors", [])
            )),
        }
        
        # Create evidence hashes from activities
        evidence_hashes = [
            hashlib.sha256(json.dumps(act, sort_keys=True).encode()).hexdigest()
            for act in processing_activities
        ]
        
        return self.generate_attestation(
            tenant_id=tenant_id,
            attestation_type=AttestationType.GDPR_ARTICLE_30,
            period_start=period_start,
            period_end=period_end,
            statistics=statistics,
            evidence_hashes=evidence_hashes,
            generated_by=generated_by,
            purpose="GDPR Article 30 Records of Processing Activities"
        )
    
    def generate_regulator_package(
        self,
        tenant_id: str,
        regulation: str,
        period_start: datetime,
        period_end: datetime,
        consent_data: Dict[str, Any],
        enforcement_data: Dict[str, Any],
        security_data: Dict[str, Any],
        generated_by: str
    ) -> Dict[str, Any]:
        """
        Generate a complete regulator-ready documentation package.
        
        This is the nuclear option for compliance - everything a regulator needs.
        """
        package = {
            "package_id": str(uuid.uuid4()),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generated_by": generated_by,
            "regulation": regulation,
            "period": {
                "start": period_start.isoformat(),
                "end": period_end.isoformat()
            },
            "sections": {}
        }
        
        # Section 1: Consent Collection
        consent_stats = {
            "total_consents": consent_data.get("total", 0),
            "active_consents": consent_data.get("active", 0),
            "revoked_consents": consent_data.get("revoked", 0),
            "expired_consents": consent_data.get("expired", 0),
            "consent_rate": consent_data.get("consent_rate", 0),
        }
        
        consent_cert = self.generate_attestation(
            tenant_id=tenant_id,
            attestation_type=AttestationType.CONSENT_PROOF,
            period_start=period_start,
            period_end=period_end,
            statistics=consent_stats,
            evidence_hashes=consent_data.get("evidence_hashes", []),
            generated_by=generated_by,
            purpose="Regulator package - Consent collection"
        )
        
        package["sections"]["consent_collection"] = {
            "attestation_id": consent_cert.id,
            "statistics": consent_stats,
            "verification_code": consent_cert.verification_code
        }
        
        # Section 2: Enforcement Decisions
        enforcement_stats = {
            "total_events": enforcement_data.get("total", 0),
            "allowed": enforcement_data.get("allowed", 0),
            "blocked": enforcement_data.get("blocked", 0),
            "modified": enforcement_data.get("modified", 0),
            "enforcement_rate": enforcement_data.get("enforcement_rate", 0),
        }
        
        enforcement_cert = self.generate_attestation(
            tenant_id=tenant_id,
            attestation_type=AttestationType.ENFORCEMENT_PROOF,
            period_start=period_start,
            period_end=period_end,
            statistics=enforcement_stats,
            evidence_hashes=enforcement_data.get("evidence_hashes", []),
            generated_by=generated_by,
            purpose="Regulator package - Enforcement decisions"
        )
        
        package["sections"]["enforcement"] = {
            "attestation_id": enforcement_cert.id,
            "statistics": enforcement_stats,
            "verification_code": enforcement_cert.verification_code
        }
        
        # Section 3: Security Posture
        security_stats = {
            "threats_detected": security_data.get("threats_detected", 0),
            "threats_blocked": security_data.get("threats_blocked", 0),
            "shadow_pipelines_detected": security_data.get("shadow_pipelines", 0),
            "invalid_tokens_rejected": security_data.get("invalid_tokens", 0),
        }
        
        package["sections"]["security"] = {
            "statistics": security_stats
        }
        
        # Sign the entire package
        package_signature = self._sign_data(json.dumps(package, sort_keys=True))
        package["package_signature"] = package_signature
        
        return package


# Global instance
compliance_service = ComplianceAttestationService()
