"""
Third-Party Security Platform Coverage Catalog

Maps known security platforms to the SecurityOS controls they can satisfy
via attestation. This catalog drives:

  1. The attestation UI — when a user picks a provider, these controls
     are pre-selected for the grouped attestation.

  2. Smart grouping recommendations — when an org has multiple failing
     controls that a known provider covers, the system suggests attesting
     the group together.

  3. Future direct integrations — when a provider gains a direct API
     integration, the attested coverage can be superseded automatically.

Controls are referenced by their SecurityOS control IDs.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class ThirdPartyProvider:
    id: str                           # Stable identifier: "crowdstrike_falcon"
    name: str                         # Display name: "CrowdStrike"
    product: Optional[str]            # Product line: "Falcon"
    category: str                     # edr | iam | backup | email | siem | network | mdr | training | firewall | vuln
    controls: List[str]               # SecurityOS control IDs covered
    description: str                  # Short description shown in attestation UX
    icon: str                         # Emoji icon for mobile UI
    common_name: Optional[str] = None # Alias used in search (e.g. "Defender" for "Microsoft Defender")


# ── Provider Catalog ──────────────────────────────────────────────────────────

PROVIDERS: List[ThirdPartyProvider] = [

    # ── EDR / Endpoint ────────────────────────────────────────────────────────

    ThirdPartyProvider(
        id="crowdstrike_falcon",
        name="CrowdStrike",
        product="Falcon",
        category="edr",
        controls=["CTRL-DEV-003", "CTRL-DEV-005", "CTRL-NET-002"],
        description="CrowdStrike Falcon provides endpoint detection and response (EDR), threat intelligence, and continuous endpoint monitoring.",
        icon="🦅",
    ),
    ThirdPartyProvider(
        id="sentinelone",
        name="SentinelOne",
        product="Singularity",
        category="edr",
        controls=["CTRL-DEV-003", "CTRL-DEV-005", "CTRL-NET-002"],
        description="SentinelOne Singularity provides autonomous endpoint protection, EDR, and threat hunting across devices.",
        icon="🤖",
    ),
    ThirdPartyProvider(
        id="microsoft_defender",
        name="Microsoft Defender",
        product="Defender for Business",
        category="edr",
        controls=["CTRL-DEV-003", "CTRL-DEV-002", "CTRL-NET-002"],
        description="Microsoft Defender for Business provides endpoint protection, threat detection, and vulnerability management.",
        icon="🛡️",
        common_name="Defender",
    ),
    ThirdPartyProvider(
        id="huntress",
        name="Huntress",
        product="Managed EDR",
        category="mdr",
        controls=["CTRL-DEV-003", "CTRL-DEV-005", "CTRL-NET-002", "CTRL-ORG-002"],
        description="Huntress provides managed detection and response (MDR), 24/7 threat hunting, and incident investigation for SMBs.",
        icon="🔍",
    ),
    ThirdPartyProvider(
        id="arctic_wolf",
        name="Arctic Wolf",
        product="Managed Security Operations",
        category="mdr",
        controls=["CTRL-DEV-003", "CTRL-DEV-005", "CTRL-NET-002", "CTRL-ORG-002", "CTRL-NET-004"],
        description="Arctic Wolf provides 24/7 managed security operations, threat detection, and incident response.",
        icon="🐺",
    ),
    ThirdPartyProvider(
        id="blackpoint",
        name="Blackpoint Cyber",
        product="SNAP-Defense",
        category="mdr",
        controls=["CTRL-DEV-003", "CTRL-DEV-005", "CTRL-NET-002", "CTRL-ORG-002"],
        description="Blackpoint Cyber provides SOC-as-a-service and active threat response for MSPs and their clients.",
        icon="◼",
    ),
    ThirdPartyProvider(
        id="sophos",
        name="Sophos",
        product="Intercept X",
        category="edr",
        controls=["CTRL-DEV-003", "CTRL-DEV-002", "CTRL-DEV-005"],
        description="Sophos Intercept X provides endpoint protection, EDR, and device management.",
        icon="🔵",
    ),
    ThirdPartyProvider(
        id="malwarebytes",
        name="Malwarebytes",
        product="ThreatDown",
        category="edr",
        controls=["CTRL-DEV-003"],
        description="Malwarebytes ThreatDown provides endpoint protection and malware remediation.",
        icon="🛡️",
    ),
    ThirdPartyProvider(
        id="cisco_secure",
        name="Cisco",
        product="Secure Endpoint",
        category="edr",
        controls=["CTRL-DEV-003", "CTRL-DEV-005", "CTRL-NET-002"],
        description="Cisco Secure Endpoint provides endpoint protection, threat detection, and response.",
        icon="🌐",
    ),
    ThirdPartyProvider(
        id="palo_alto_cortex",
        name="Palo Alto Networks",
        product="Cortex XDR",
        category="edr",
        controls=["CTRL-DEV-003", "CTRL-DEV-005", "CTRL-NET-002", "CTRL-NET-001"],
        description="Palo Alto Cortex XDR provides extended detection and response across endpoints, network, and cloud.",
        icon="🔥",
    ),

    # ── IAM / Identity ────────────────────────────────────────────────────────

    ThirdPartyProvider(
        id="okta",
        name="Okta",
        product="Identity Cloud",
        category="iam",
        controls=["CTRL-ID-001", "CTRL-ID-002", "CTRL-ID-003", "CTRL-ID-004", "CTRL-ID-005", "CTRL-NET-004"],
        description="Okta provides identity management, MFA, SSO, and access governance for all users and applications.",
        icon="🔑",
    ),
    ThirdPartyProvider(
        id="duo",
        name="Duo Security",
        product="Duo MFA",
        category="iam",
        controls=["CTRL-ID-001", "CTRL-ID-002", "CTRL-NET-004"],
        description="Duo provides multi-factor authentication and zero-trust access for all users and devices.",
        icon="🔐",
        common_name="Cisco Duo",
    ),
    ThirdPartyProvider(
        id="jumpcloud",
        name="JumpCloud",
        product="Open Directory Platform",
        category="iam",
        controls=["CTRL-ID-001", "CTRL-ID-002", "CTRL-ID-003", "CTRL-ID-004", "CTRL-DEV-004", "CTRL-NET-004"],
        description="JumpCloud provides directory services, MFA, device management, and access control in a single platform.",
        icon="☁️",
    ),
    ThirdPartyProvider(
        id="azure_ad",
        name="Microsoft Entra ID",
        product="Entra ID (Azure AD)",
        category="iam",
        controls=["CTRL-ID-001", "CTRL-ID-002", "CTRL-ID-003", "CTRL-ID-004", "CTRL-ID-005", "CTRL-NET-004"],
        description="Microsoft Entra ID (formerly Azure AD) provides identity management, conditional access, MFA, and SSO.",
        icon="🏢",
        common_name="Azure AD",
    ),

    # ── MDM / Device Management ───────────────────────────────────────────────

    ThirdPartyProvider(
        id="microsoft_intune",
        name="Microsoft Intune",
        product="Intune",
        category="mdm",
        controls=["CTRL-DEV-001", "CTRL-DEV-002", "CTRL-DEV-004", "CTRL-DEV-005"],
        description="Microsoft Intune provides mobile device management (MDM), device encryption enforcement, update management, and device inventory.",
        icon="📱",
    ),
    ThirdPartyProvider(
        id="jamf",
        name="Jamf",
        product="Jamf Pro",
        category="mdm",
        controls=["CTRL-DEV-001", "CTRL-DEV-002", "CTRL-DEV-004", "CTRL-DEV-005"],
        description="Jamf Pro provides Apple device management — MDM, encryption, patching, and inventory for Mac, iPhone, and iPad.",
        icon="🍎",
    ),
    ThirdPartyProvider(
        id="ninjarmm",
        name="NinjaRMM",
        product="NinjaOne",
        category="mdm",
        controls=["CTRL-DEV-002", "CTRL-DEV-005", "CTRL-NET-002"],
        description="NinjaOne provides RMM, patch management, device inventory, and monitoring for MSP-managed endpoints.",
        icon="🥷",
        common_name="NinjaOne",
    ),
    ThirdPartyProvider(
        id="datto_rmm",
        name="Datto",
        product="Datto RMM",
        category="mdm",
        controls=["CTRL-DEV-002", "CTRL-DEV-005", "CTRL-NET-002"],
        description="Datto RMM provides managed patch management, device monitoring, and endpoint management for MSPs.",
        icon="💾",
    ),
    ThirdPartyProvider(
        id="connectwise_automate",
        name="ConnectWise",
        product="Automate",
        category="mdm",
        controls=["CTRL-DEV-002", "CTRL-DEV-005", "CTRL-NET-002"],
        description="ConnectWise Automate provides patch management, monitoring, and device management for MSP-managed endpoints.",
        icon="🔧",
    ),

    # ── Backup & Recovery ─────────────────────────────────────────────────────

    ThirdPartyProvider(
        id="veeam",
        name="Veeam",
        product="Backup & Replication",
        category="backup",
        controls=["CTRL-DATA-003", "CTRL-DATA-004"],
        description="Veeam Backup & Replication provides backup, recovery, and replication for virtual, physical, and cloud environments.",
        icon="☁️",
    ),
    ThirdPartyProvider(
        id="datto_backup",
        name="Datto",
        product="SIRIS / ALTO",
        category="backup",
        controls=["CTRL-DATA-003", "CTRL-DATA-004"],
        description="Datto SIRIS and ALTO provide image-based backup, instant virtualization, and cloud backup for SMBs.",
        icon="💾",
    ),
    ThirdPartyProvider(
        id="acronis",
        name="Acronis",
        product="Cyber Protect",
        category="backup",
        controls=["CTRL-DATA-003", "CTRL-DATA-004", "CTRL-DEV-003"],
        description="Acronis Cyber Protect combines backup, disaster recovery, and endpoint protection in one platform.",
        icon="🔄",
    ),
    ThirdPartyProvider(
        id="backblaze",
        name="Backblaze",
        product="Business Backup",
        category="backup",
        controls=["CTRL-DATA-003"],
        description="Backblaze Business Backup provides continuous cloud backup for all employee computers.",
        icon="☁️",
    ),
    ThirdPartyProvider(
        id="druva",
        name="Druva",
        product="Data Resiliency Cloud",
        category="backup",
        controls=["CTRL-DATA-003", "CTRL-DATA-004", "CTRL-DATA-005"],
        description="Druva provides cloud-native data protection, backup, and disaster recovery for SaaS and endpoints.",
        icon="🌩️",
    ),

    # ── Email Security ────────────────────────────────────────────────────────

    ThirdPartyProvider(
        id="proofpoint",
        name="Proofpoint",
        product="Email Protection",
        category="email",
        controls=["CTRL-NET-003", "CTRL-DEV-003", "CTRL-ORG-003"],
        description="Proofpoint provides email security, anti-phishing, and security awareness training.",
        icon="✉️",
    ),
    ThirdPartyProvider(
        id="mimecast",
        name="Mimecast",
        product="Email Security",
        category="email",
        controls=["CTRL-NET-003", "CTRL-DEV-003"],
        description="Mimecast provides email security, anti-phishing, and email continuity.",
        icon="📧",
    ),
    ThirdPartyProvider(
        id="defender_for_office",
        name="Microsoft Defender for Office 365",
        product="Defender for Office 365",
        category="email",
        controls=["CTRL-NET-003", "CTRL-DEV-003"],
        description="Microsoft Defender for Office 365 provides anti-phishing, safe links, and email threat protection.",
        icon="📧",
        common_name="MDO",
    ),
    ThirdPartyProvider(
        id="abnormal_security",
        name="Abnormal Security",
        product="Abnormal Email Security",
        category="email",
        controls=["CTRL-NET-003"],
        description="Abnormal Security provides AI-based email protection against phishing, BEC, and account takeover.",
        icon="⚡",
    ),

    # ── Security Awareness Training ───────────────────────────────────────────

    ThirdPartyProvider(
        id="knowbe4",
        name="KnowBe4",
        product="Security Awareness Training",
        category="training",
        controls=["CTRL-ORG-003"],
        description="KnowBe4 provides security awareness training and phishing simulations for all employees.",
        icon="🎓",
    ),
    ThirdPartyProvider(
        id="proofpoint_sat",
        name="Proofpoint",
        product="Security Awareness Training",
        category="training",
        controls=["CTRL-ORG-003"],
        description="Proofpoint Security Awareness Training provides phishing simulations and compliance training.",
        icon="🎓",
    ),
    ThirdPartyProvider(
        id="sans_security",
        name="SANS",
        product="Security Awareness",
        category="training",
        controls=["CTRL-ORG-003"],
        description="SANS Security Awareness provides role-based security training and phishing simulations.",
        icon="📚",
    ),

    # ── Network / Firewall ────────────────────────────────────────────────────

    ThirdPartyProvider(
        id="fortinet",
        name="Fortinet",
        product="FortiGate",
        category="firewall",
        controls=["CTRL-NET-001", "CTRL-NET-005", "CTRL-NET-002"],
        description="Fortinet FortiGate provides next-generation firewall, network segmentation, and security logging.",
        icon="🔥",
    ),
    ThirdPartyProvider(
        id="palo_alto_ngfw",
        name="Palo Alto Networks",
        product="Next-Gen Firewall",
        category="firewall",
        controls=["CTRL-NET-001", "CTRL-NET-005", "CTRL-NET-002"],
        description="Palo Alto NGFW provides advanced threat prevention, network segmentation, and traffic visibility.",
        icon="🔥",
    ),
    ThirdPartyProvider(
        id="cisco_firepower",
        name="Cisco",
        product="Firepower / Meraki",
        category="firewall",
        controls=["CTRL-NET-001", "CTRL-NET-005", "CTRL-NET-002"],
        description="Cisco Firepower and Meraki provide network security, intrusion prevention, and traffic monitoring.",
        icon="🌐",
    ),
    ThirdPartyProvider(
        id="sophos_firewall",
        name="Sophos",
        product="XG Firewall",
        category="firewall",
        controls=["CTRL-NET-001", "CTRL-NET-005"],
        description="Sophos XG Firewall provides network protection, web filtering, and VPN.",
        icon="🔵",
    ),

    # ── SIEM / Logging ────────────────────────────────────────────────────────

    ThirdPartyProvider(
        id="microsoft_sentinel",
        name="Microsoft Sentinel",
        product="Sentinel",
        category="siem",
        controls=["CTRL-NET-002", "CTRL-ORG-002"],
        description="Microsoft Sentinel provides cloud-native SIEM, security analytics, and incident response automation.",
        icon="🔭",
    ),
    ThirdPartyProvider(
        id="splunk",
        name="Splunk",
        product="Enterprise Security",
        category="siem",
        controls=["CTRL-NET-002", "CTRL-ORG-002"],
        description="Splunk provides security information and event management (SIEM), threat detection, and incident response.",
        icon="📊",
    ),

    # ── Vulnerability Management ──────────────────────────────────────────────

    ThirdPartyProvider(
        id="tenable",
        name="Tenable",
        product="Tenable.io / Nessus",
        category="vuln",
        controls=["CTRL-DEV-002", "CTRL-NET-001", "CTRL-NET-003"],
        description="Tenable provides vulnerability scanning, risk-based prioritization, and exposure management.",
        icon="🔬",
    ),
    ThirdPartyProvider(
        id="rapid7",
        name="Rapid7",
        product="InsightVM",
        category="vuln",
        controls=["CTRL-DEV-002", "CTRL-NET-001", "CTRL-NET-003"],
        description="Rapid7 InsightVM provides vulnerability management and exposure analytics.",
        icon="🔬",
    ),
]

# ── Lookup helpers ────────────────────────────────────────────────────────────

PROVIDERS_BY_ID: Dict[str, ThirdPartyProvider] = {p.id: p for p in PROVIDERS}

PROVIDERS_BY_CATEGORY: Dict[str, List[ThirdPartyProvider]] = {}
for _p in PROVIDERS:
    PROVIDERS_BY_CATEGORY.setdefault(_p.category, []).append(_p)


def get_provider(provider_id: str) -> Optional[ThirdPartyProvider]:
    return PROVIDERS_BY_ID.get(provider_id)


def get_providers_for_control(control_id: str) -> List[ThirdPartyProvider]:
    """Return all providers that cover the given control."""
    return [p for p in PROVIDERS if control_id in p.controls]


def recommend_attestation_groups(failing_control_ids: List[str]) -> List[Dict]:
    """
    Given a list of failing/unknown control IDs, return suggested grouped
    attestations sorted by coverage (most controls covered first).

    Returns:
        [
            {
                "provider": ThirdPartyProvider,
                "covered_controls": ["CTRL-DEV-003", ...],
                "coverage_count": 3,
            },
            ...
        ]
    """
    groups: Dict[str, Dict] = {}

    for control_id in failing_control_ids:
        for provider in get_providers_for_control(control_id):
            if provider.id not in groups:
                groups[provider.id] = {
                    "provider": provider,
                    "covered_controls": [],
                }
            if control_id not in groups[provider.id]["covered_controls"]:
                groups[provider.id]["covered_controls"].append(control_id)

    result = [
        {
            "provider": g["provider"],
            "covered_controls": g["covered_controls"],
            "coverage_count": len(g["covered_controls"]),
        }
        for g in groups.values()
        if len(g["covered_controls"]) >= 1  # only suggest if covers at least 1 failing control
    ]

    # Sort: most coverage first
    result.sort(key=lambda x: -x["coverage_count"])
    return result


def serialize_provider(p: ThirdPartyProvider) -> Dict:
    return {
        "id": p.id,
        "name": p.name,
        "product": p.product,
        "category": p.category,
        "controls": p.controls,
        "description": p.description,
        "icon": p.icon,
        "common_name": p.common_name,
    }
