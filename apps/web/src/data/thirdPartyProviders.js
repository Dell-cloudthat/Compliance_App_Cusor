/**
 * SecurityOS Third-Party Provider Coverage Catalog (frontend)
 *
 * Maps known security platforms to the SecurityOS controls they cover.
 * Drives the attestation wizard — when a user picks a provider, the
 * relevant controls are pre-selected for grouped attestation.
 *
 * Mirrors backend/evidence/third_party_coverage.py.
 * Control IDs reference compliance/controls/catalog.json.
 */

export const PROVIDERS = [
  // ── EDR / Endpoint ────────────────────────────────────────────────────────
  {
    id: 'crowdstrike_falcon',
    name: 'CrowdStrike',
    product: 'Falcon',
    category: 'edr',
    icon: '🦅',
    controls: ['CTRL-DEV-003', 'CTRL-DEV-005', 'CTRL-NET-002'],
    description: 'CrowdStrike Falcon provides endpoint detection and response (EDR), threat intelligence, and continuous endpoint monitoring.',
  },
  {
    id: 'sentinelone',
    name: 'SentinelOne',
    product: 'Singularity',
    category: 'edr',
    icon: '🤖',
    controls: ['CTRL-DEV-003', 'CTRL-DEV-005', 'CTRL-NET-002'],
    description: 'SentinelOne Singularity provides autonomous endpoint protection, EDR, and threat hunting.',
  },
  {
    id: 'microsoft_defender',
    name: 'Microsoft Defender',
    product: 'Defender for Business',
    category: 'edr',
    icon: '🛡️',
    controls: ['CTRL-DEV-003', 'CTRL-DEV-002', 'CTRL-NET-002'],
    description: 'Microsoft Defender for Business provides endpoint protection, threat detection, and vulnerability management.',
  },
  {
    id: 'huntress',
    name: 'Huntress',
    product: 'Managed EDR',
    category: 'mdr',
    icon: '🔍',
    controls: ['CTRL-DEV-003', 'CTRL-DEV-005', 'CTRL-NET-002', 'CTRL-ORG-002'],
    description: 'Huntress provides managed detection and response (MDR), 24/7 threat hunting, and incident investigation.',
  },
  {
    id: 'arctic_wolf',
    name: 'Arctic Wolf',
    product: 'Managed Security Operations',
    category: 'mdr',
    icon: '🐺',
    controls: ['CTRL-DEV-003', 'CTRL-DEV-005', 'CTRL-NET-002', 'CTRL-ORG-002', 'CTRL-NET-004'],
    description: 'Arctic Wolf provides 24/7 managed security operations, threat detection, and incident response.',
  },
  {
    id: 'blackpoint',
    name: 'Blackpoint Cyber',
    product: 'SNAP-Defense',
    category: 'mdr',
    icon: '◼',
    controls: ['CTRL-DEV-003', 'CTRL-DEV-005', 'CTRL-NET-002', 'CTRL-ORG-002'],
    description: 'Blackpoint Cyber provides SOC-as-a-service and active threat response.',
  },
  {
    id: 'sophos',
    name: 'Sophos',
    product: 'Intercept X',
    category: 'edr',
    icon: '🔵',
    controls: ['CTRL-DEV-003', 'CTRL-DEV-002', 'CTRL-DEV-005'],
    description: 'Sophos Intercept X provides endpoint protection, EDR, and device management.',
  },
  {
    id: 'malwarebytes',
    name: 'Malwarebytes',
    product: 'ThreatDown',
    category: 'edr',
    icon: '🛡️',
    controls: ['CTRL-DEV-003'],
    description: 'Malwarebytes ThreatDown provides endpoint protection and malware remediation.',
  },

  // ── IAM / Identity ────────────────────────────────────────────────────────
  {
    id: 'okta',
    name: 'Okta',
    product: 'Identity Cloud',
    category: 'iam',
    icon: '🔑',
    controls: ['CTRL-ID-001', 'CTRL-ID-002', 'CTRL-ID-003', 'CTRL-ID-004', 'CTRL-ID-005', 'CTRL-NET-004'],
    description: 'Okta provides identity management, MFA, SSO, and access governance.',
  },
  {
    id: 'duo',
    name: 'Duo Security',
    product: 'Duo MFA',
    category: 'iam',
    icon: '🔐',
    controls: ['CTRL-ID-001', 'CTRL-ID-002', 'CTRL-NET-004'],
    description: 'Duo provides multi-factor authentication and zero-trust access.',
  },
  {
    id: 'jumpcloud',
    name: 'JumpCloud',
    product: 'Open Directory Platform',
    category: 'iam',
    icon: '☁️',
    controls: ['CTRL-ID-001', 'CTRL-ID-002', 'CTRL-ID-003', 'CTRL-ID-004', 'CTRL-DEV-004', 'CTRL-NET-004'],
    description: 'JumpCloud provides directory, MFA, device management, and access control.',
  },
  {
    id: 'azure_ad',
    name: 'Microsoft Entra ID',
    product: 'Entra ID (Azure AD)',
    category: 'iam',
    icon: '🏢',
    controls: ['CTRL-ID-001', 'CTRL-ID-002', 'CTRL-ID-003', 'CTRL-ID-004', 'CTRL-ID-005', 'CTRL-NET-004'],
    description: 'Microsoft Entra ID provides identity management, conditional access, MFA, and SSO.',
  },

  // ── MDM / Device Management ───────────────────────────────────────────────
  {
    id: 'microsoft_intune',
    name: 'Microsoft Intune',
    product: 'Intune',
    category: 'mdm',
    icon: '📱',
    controls: ['CTRL-DEV-001', 'CTRL-DEV-002', 'CTRL-DEV-004', 'CTRL-DEV-005'],
    description: 'Microsoft Intune provides MDM, device encryption, update management, and device inventory.',
  },
  {
    id: 'jamf',
    name: 'Jamf',
    product: 'Jamf Pro',
    category: 'mdm',
    icon: '🍎',
    controls: ['CTRL-DEV-001', 'CTRL-DEV-002', 'CTRL-DEV-004', 'CTRL-DEV-005'],
    description: 'Jamf Pro provides Apple device management — MDM, encryption, patching, and inventory.',
  },
  {
    id: 'ninjarmm',
    name: 'NinjaRMM',
    product: 'NinjaOne',
    category: 'mdm',
    icon: '🥷',
    controls: ['CTRL-DEV-002', 'CTRL-DEV-005', 'CTRL-NET-002'],
    description: 'NinjaOne provides RMM, patch management, device inventory, and monitoring.',
  },
  {
    id: 'datto_rmm',
    name: 'Datto RMM',
    product: 'Datto RMM',
    category: 'mdm',
    icon: '💾',
    controls: ['CTRL-DEV-002', 'CTRL-DEV-005', 'CTRL-NET-002'],
    description: 'Datto RMM provides managed patch management, device monitoring, and endpoint management.',
  },
  {
    id: 'connectwise_automate',
    name: 'ConnectWise Automate',
    product: 'Automate',
    category: 'mdm',
    icon: '🔧',
    controls: ['CTRL-DEV-002', 'CTRL-DEV-005', 'CTRL-NET-002'],
    description: 'ConnectWise Automate provides patch management, monitoring, and device management.',
  },

  // ── Backup & Recovery ─────────────────────────────────────────────────────
  {
    id: 'veeam',
    name: 'Veeam',
    product: 'Backup & Replication',
    category: 'backup',
    icon: '☁️',
    controls: ['CTRL-DATA-003', 'CTRL-DATA-004'],
    description: 'Veeam provides backup, recovery, and replication for virtual, physical, and cloud environments.',
  },
  {
    id: 'datto_backup',
    name: 'Datto SIRIS / ALTO',
    product: 'SIRIS / ALTO',
    category: 'backup',
    icon: '💾',
    controls: ['CTRL-DATA-003', 'CTRL-DATA-004'],
    description: 'Datto provides image-based backup, instant virtualization, and cloud backup for SMBs.',
  },
  {
    id: 'acronis',
    name: 'Acronis',
    product: 'Cyber Protect',
    category: 'backup',
    icon: '🔄',
    controls: ['CTRL-DATA-003', 'CTRL-DATA-004', 'CTRL-DEV-003'],
    description: 'Acronis combines backup, disaster recovery, and endpoint protection.',
  },
  {
    id: 'druva',
    name: 'Druva',
    product: 'Data Resiliency Cloud',
    category: 'backup',
    icon: '🌩️',
    controls: ['CTRL-DATA-003', 'CTRL-DATA-004', 'CTRL-DATA-005'],
    description: 'Druva provides cloud-native data protection, backup, and disaster recovery.',
  },

  // ── Email Security ────────────────────────────────────────────────────────
  {
    id: 'proofpoint',
    name: 'Proofpoint',
    product: 'Email Protection',
    category: 'email',
    icon: '✉️',
    controls: ['CTRL-NET-003', 'CTRL-DEV-003', 'CTRL-ORG-003'],
    description: 'Proofpoint provides email security, anti-phishing, and security awareness training.',
  },
  {
    id: 'mimecast',
    name: 'Mimecast',
    product: 'Email Security',
    category: 'email',
    icon: '📧',
    controls: ['CTRL-NET-003', 'CTRL-DEV-003'],
    description: 'Mimecast provides email security, anti-phishing, and email continuity.',
  },
  {
    id: 'defender_for_office',
    name: 'Microsoft Defender for Office 365',
    product: 'MDO',
    category: 'email',
    icon: '📧',
    controls: ['CTRL-NET-003', 'CTRL-DEV-003'],
    description: 'Microsoft Defender for Office 365 provides anti-phishing, safe links, and email threat protection.',
  },

  // ── Security Awareness Training ───────────────────────────────────────────
  {
    id: 'knowbe4',
    name: 'KnowBe4',
    product: 'Security Awareness Training',
    category: 'training',
    icon: '🎓',
    controls: ['CTRL-ORG-003'],
    description: 'KnowBe4 provides security awareness training and phishing simulations.',
  },
  {
    id: 'proofpoint_sat',
    name: 'Proofpoint Security Awareness',
    product: 'Security Awareness Training',
    category: 'training',
    icon: '🎓',
    controls: ['CTRL-ORG-003'],
    description: 'Proofpoint Security Awareness provides phishing simulations and compliance training.',
  },

  // ── Network / Firewall ────────────────────────────────────────────────────
  {
    id: 'fortinet',
    name: 'Fortinet',
    product: 'FortiGate',
    category: 'firewall',
    icon: '🔥',
    controls: ['CTRL-NET-001', 'CTRL-NET-005', 'CTRL-NET-002'],
    description: 'Fortinet FortiGate provides next-generation firewall, network segmentation, and security logging.',
  },
  {
    id: 'palo_alto_ngfw',
    name: 'Palo Alto Networks',
    product: 'Next-Gen Firewall',
    category: 'firewall',
    icon: '🔥',
    controls: ['CTRL-NET-001', 'CTRL-NET-005', 'CTRL-NET-002'],
    description: 'Palo Alto NGFW provides advanced threat prevention and network segmentation.',
  },
];

// ── Category labels ───────────────────────────────────────────────────────────
export const CATEGORY_LABELS = {
  edr:      'Endpoint Protection (EDR)',
  mdr:      'Managed Detection & Response',
  iam:      'Identity & Access (IAM/MFA)',
  mdm:      'Device Management (MDM/RMM)',
  backup:   'Backup & Recovery',
  email:    'Email Security',
  training: 'Security Awareness Training',
  firewall: 'Network & Firewall',
  siem:     'SIEM & Logging',
  vuln:     'Vulnerability Management',
};

// ── Lookup helpers ────────────────────────────────────────────────────────────
export const PROVIDERS_BY_ID = Object.fromEntries(PROVIDERS.map(p => [p.id, p]));

export const PROVIDERS_BY_CATEGORY = PROVIDERS.reduce((acc, p) => {
  if (!acc[p.category]) acc[p.category] = [];
  acc[p.category].push(p);
  return acc;
}, {});

export function getProvidersForControl(controlId) {
  return PROVIDERS.filter(p => p.controls.includes(controlId));
}

/**
 * Given a list of failing/unknown control IDs, return provider suggestions
 * sorted by how many failing controls they cover (most coverage first).
 */
export function recommendAttestationGroups(failingControlIds) {
  const coverage = {};
  for (const controlId of failingControlIds) {
    for (const provider of getProvidersForControl(controlId)) {
      if (!coverage[provider.id]) {
        coverage[provider.id] = { provider, coveredControls: [] };
      }
      if (!coverage[provider.id].coveredControls.includes(controlId)) {
        coverage[provider.id].coveredControls.push(controlId);
      }
    }
  }
  return Object.values(coverage)
    .sort((a, b) => b.coveredControls.length - a.coveredControls.length);
}

export const ATTESTATION_VALIDITY_OPTIONS = [
  { days: 30,  label: '30 days' },
  { days: 60,  label: '60 days' },
  { days: 90,  label: '90 days (recommended)' },
  { days: 180, label: '180 days' },
];

export const DEFAULT_VALIDITY_DAYS = 90;
export const CONFIRMATION_PHRASE = 'ATTEST';
