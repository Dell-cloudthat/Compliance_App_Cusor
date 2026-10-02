// FedRAMP Controls (Based on NIST 800-53 with FedRAMP-specific requirements)
// Reference: https://www.fedramp.gov/

export const FEDRAMP_CONTROLS = [
  // FedRAMP High Baseline Controls (most comprehensive)
  // Access Control (AC) - FedRAMP Enhanced
  { id: "FEDRAMP-AC-1", name: "Access Control Policy and Procedures (FedRAMP)", category: "Access Control", priority: "Critical" },
  { id: "FEDRAMP-AC-2", name: "Account Management (FedRAMP)", category: "Access Control", priority: "Critical" },
  { id: "FEDRAMP-AC-3", name: "Access Enforcement (FedRAMP)", category: "Access Control", priority: "Critical" },
  { id: "FEDRAMP-AC-4", name: "Information Flow Enforcement (FedRAMP)", category: "Access Control", priority: "Critical" },
  { id: "FEDRAMP-AC-5", name: "Separation of Duties (FedRAMP)", category: "Access Control", priority: "Critical" },
  { id: "FEDRAMP-AC-6", name: "Least Privilege (FedRAMP)", category: "Access Control", priority: "Critical" },
  { id: "FEDRAMP-AC-7", name: "Unsuccessful Logon Attempts (FedRAMP)", category: "Access Control", priority: "Critical" },
  { id: "FEDRAMP-AC-17", name: "Remote Access (FedRAMP)", category: "Access Control", priority: "Critical" },
  { id: "FEDRAMP-AC-19", name: "Access Control for Mobile Devices (FedRAMP)", category: "Access Control", priority: "Critical" },
  
  // Audit and Accountability (AU) - FedRAMP Enhanced
  { id: "FEDRAMP-AU-2", name: "Audit Events (FedRAMP)", category: "Audit", priority: "Critical" },
  { id: "FEDRAMP-AU-3", name: "Content of Audit Records (FedRAMP)", category: "Audit", priority: "Critical" },
  { id: "FEDRAMP-AU-4", name: "Audit Storage Capacity (FedRAMP)", category: "Audit", priority: "Critical" },
  { id: "FEDRAMP-AU-5", name: "Response to Audit Processing Failures (FedRAMP)", category: "Audit", priority: "Critical" },
  { id: "FEDRAMP-AU-6", name: "Audit Review, Analysis, and Reporting (FedRAMP)", category: "Audit", priority: "Critical" },
  { id: "FEDRAMP-AU-8", name: "Time Stamps (FedRAMP)", category: "Audit", priority: "Critical" },
  { id: "FEDRAMP-AU-9", name: "Protection of Audit Information (FedRAMP)", category: "Audit", priority: "Critical" },
  { id: "FEDRAMP-AU-11", name: "Audit Record Retention (FedRAMP)", category: "Audit", priority: "Critical" },
  { id: "FEDRAMP-AU-12", name: "Audit Generation (FedRAMP)", category: "Audit", priority: "Critical" },
  
  // Security Assessment and Authorization (CA) - FedRAMP
  { id: "FEDRAMP-CA-2", name: "Security Assessments (FedRAMP)", category: "Security Assessment", priority: "Critical" },
  { id: "FEDRAMP-CA-3", name: "System Interconnections (FedRAMP)", category: "Network Security", priority: "Critical" },
  { id: "FEDRAMP-CA-5", name: "Plan of Action and Milestones (FedRAMP)", category: "Security Assessment", priority: "Critical" },
  { id: "FEDRAMP-CA-6", name: "Security Authorization (FedRAMP)", category: "Security Assessment", priority: "Critical" },
  { id: "FEDRAMP-CA-7", name: "Continuous Monitoring (FedRAMP)", category: "Security Assessment", priority: "Critical" },
  { id: "FEDRAMP-CA-8", name: "Penetration Testing (FedRAMP)", category: "Security Testing", priority: "High" },
  { id: "FEDRAMP-CA-9", name: "Internal System Connections (FedRAMP)", category: "Network Security", priority: "Critical" },
  
  // Configuration Management (CM) - FedRAMP
  { id: "FEDRAMP-CM-2", name: "Baseline Configuration (FedRAMP)", category: "Configuration Management", priority: "Critical" },
  { id: "FEDRAMP-CM-3", name: "Configuration Change Control (FedRAMP)", category: "Configuration Management", priority: "Critical" },
  { id: "FEDRAMP-CM-4", name: "Security Impact Analysis (FedRAMP)", category: "Configuration Management", priority: "Critical" },
  { id: "FEDRAMP-CM-5", name: "Access Restrictions for Change (FedRAMP)", category: "Configuration Management", priority: "Critical" },
  { id: "FEDRAMP-CM-6", name: "Configuration Settings (FedRAMP)", category: "Configuration Management", priority: "Critical" },
  { id: "FEDRAMP-CM-7", name: "Least Functionality (FedRAMP)", category: "Configuration Management", priority: "High" },
  { id: "FEDRAMP-CM-8", name: "Information System Component Inventory (FedRAMP)", category: "Asset Management", priority: "Critical" },
  { id: "FEDRAMP-CM-9", name: "Configuration Management Plan (FedRAMP)", category: "Configuration Management", priority: "High" },
  
  // Contingency Planning (CP) - FedRAMP
  { id: "FEDRAMP-CP-2", name: "Contingency Plan (FedRAMP)", category: "Business Continuity", priority: "Critical" },
  { id: "FEDRAMP-CP-3", name: "Contingency Training (FedRAMP)", category: "Business Continuity", priority: "High" },
  { id: "FEDRAMP-CP-4", name: "Contingency Plan Testing (FedRAMP)", category: "Business Continuity", priority: "Critical" },
  { id: "FEDRAMP-CP-6", name: "Alternate Storage Site (FedRAMP)", category: "Business Continuity", priority: "High" },
  { id: "FEDRAMP-CP-7", name: "Alternate Processing Site (FedRAMP)", category: "Business Continuity", priority: "High" },
  { id: "FEDRAMP-CP-9", name: "Information System Backup (FedRAMP)", category: "Business Continuity", priority: "Critical" },
  { id: "FEDRAMP-CP-10", name: "Information System Recovery and Reconstitution (FedRAMP)", category: "Business Continuity", priority: "Critical" },
  
  // Identification and Authentication (IA) - FedRAMP
  { id: "FEDRAMP-IA-2", name: "Identification and Authentication (FedRAMP)", category: "Identity Management", priority: "Critical" },
  { id: "FEDRAMP-IA-3", name: "Device Identification and Authentication (FedRAMP)", category: "Identity Management", priority: "Critical" },
  { id: "FEDRAMP-IA-4", name: "Identifier Management (FedRAMP)", category: "Identity Management", priority: "Critical" },
  { id: "FEDRAMP-IA-5", name: "Authenticator Management (FedRAMP)", category: "Identity Management", priority: "Critical" },
  { id: "FEDRAMP-IA-8", name: "Identification and Authentication (Non-Organizational Users) (FedRAMP)", category: "Identity Management", priority: "Critical" },
  
  // Incident Response (IR) - FedRAMP
  { id: "FEDRAMP-IR-2", name: "Incident Response Training (FedRAMP)", category: "Incident Response", priority: "High" },
  { id: "FEDRAMP-IR-3", name: "Incident Response Testing (FedRAMP)", category: "Incident Response", priority: "High" },
  { id: "FEDRAMP-IR-4", name: "Incident Handling (FedRAMP)", category: "Incident Response", priority: "Critical" },
  { id: "FEDRAMP-IR-5", name: "Incident Monitoring (FedRAMP)", category: "Incident Response", priority: "Critical" },
  { id: "FEDRAMP-IR-6", name: "Incident Reporting (FedRAMP)", category: "Incident Response", priority: "Critical" },
  { id: "FEDRAMP-IR-8", name: "Incident Response Plan (FedRAMP)", category: "Incident Response", priority: "Critical" },
  
  // Maintenance (MA) - FedRAMP
  { id: "FEDRAMP-MA-2", name: "Controlled Maintenance (FedRAMP)", category: "System Integrity", priority: "High" },
  { id: "FEDRAMP-MA-3", name: "Maintenance Tools (FedRAMP)", category: "System Integrity", priority: "High" },
  { id: "FEDRAMP-MA-4", name: "Nonlocal Maintenance (FedRAMP)", category: "System Integrity", priority: "High" },
  { id: "FEDRAMP-MA-5", name: "Maintenance Personnel (FedRAMP)", category: "System Integrity", priority: "High" },
  
  // Media Protection (MP) - FedRAMP
  { id: "FEDRAMP-MP-2", name: "Media Access (FedRAMP)", category: "Data Protection", priority: "Critical" },
  { id: "FEDRAMP-MP-3", name: "Media Marking (FedRAMP)", category: "Data Protection", priority: "High" },
  { id: "FEDRAMP-MP-4", name: "Media Storage (FedRAMP)", category: "Data Protection", priority: "Critical" },
  { id: "FEDRAMP-MP-5", name: "Media Transport (FedRAMP)", category: "Data Protection", priority: "Critical" },
  { id: "FEDRAMP-MP-6", name: "Media Sanitization (FedRAMP)", category: "Data Protection", priority: "Critical" },
  { id: "FEDRAMP-MP-7", name: "Media Use (FedRAMP)", category: "Data Protection", priority: "High" },
  
  // Physical and Environmental Protection (PE) - FedRAMP
  { id: "FEDRAMP-PE-3", name: "Physical Access Authorization (FedRAMP)", category: "Physical", priority: "Critical" },
  { id: "FEDRAMP-PE-6", name: "Monitoring Physical Access (FedRAMP)", category: "Physical", priority: "Critical" },
  { id: "FEDRAMP-PE-8", name: "Visitor Access Records (FedRAMP)", category: "Physical", priority: "High" },
  { id: "FEDRAMP-PE-12", name: "Emergency Lighting (FedRAMP)", category: "Physical", priority: "Medium" },
  { id: "FEDRAMP-PE-13", name: "Fire Protection (FedRAMP)", category: "Physical", priority: "High" },
  { id: "FEDRAMP-PE-14", name: "Temperature and Humidity Controls (FedRAMP)", category: "Physical", priority: "High" },
  { id: "FEDRAMP-PE-15", name: "Water Damage Protection (FedRAMP)", category: "Physical", priority: "Medium" },
  { id: "FEDRAMP-PE-16", name: "Delivery and Removal (FedRAMP)", category: "Physical", priority: "High" },
  { id: "FEDRAMP-PE-17", name: "Alternate Work Site (FedRAMP)", category: "Physical", priority: "Medium" },
  { id: "FEDRAMP-PE-18", name: "Location of Information System Components (FedRAMP)", category: "Physical", priority: "High" },
  
  // Planning (PL) - FedRAMP
  { id: "FEDRAMP-PL-2", name: "System Security Plan (FedRAMP)", category: "Organizational", priority: "Critical" },
  { id: "FEDRAMP-PL-4", name: "Rules of Behavior (FedRAMP)", category: "Organizational", priority: "High" },
  { id: "FEDRAMP-PL-8", name: "Information Security Architecture (FedRAMP)", category: "Organizational", priority: "Critical" },
  
  // Personnel Security (PS) - FedRAMP
  { id: "FEDRAMP-PS-2", name: "Position Risk Designation (FedRAMP)", category: "People", priority: "High" },
  { id: "FEDRAMP-PS-3", name: "Personnel Screening (FedRAMP)", category: "People", priority: "Critical" },
  { id: "FEDRAMP-PS-4", name: "Personnel Termination (FedRAMP)", category: "People", priority: "Critical" },
  { id: "FEDRAMP-PS-5", name: "Personnel Transfer (FedRAMP)", category: "People", priority: "High" },
  { id: "FEDRAMP-PS-6", name: "Access Agreements (FedRAMP)", category: "People", priority: "Critical" },
  { id: "FEDRAMP-PS-7", name: "Third-Party Personnel Security (FedRAMP)", category: "People", priority: "High" },
  { id: "FEDRAMP-PS-8", name: "Personnel Sanctions (FedRAMP)", category: "People", priority: "Medium" },
  
  // Risk Assessment (RA) - FedRAMP
  { id: "FEDRAMP-RA-1", name: "Risk Assessment Policy and Procedures (FedRAMP)", category: "Risk Assessment", priority: "Critical" },
  { id: "FEDRAMP-RA-2", name: "Security Categorization (FedRAMP)", category: "Risk Assessment", priority: "Critical" },
  { id: "FEDRAMP-RA-3", name: "Risk Assessment (FedRAMP)", category: "Risk Assessment", priority: "Critical" },
  { id: "FEDRAMP-RA-5", name: "Vulnerability Scanning (FedRAMP)", category: "Vulnerability Management", priority: "Critical" },
  { id: "FEDRAMP-RA-6", name: "Technical Surveillance Countermeasures Survey (FedRAMP)", category: "Risk Assessment", priority: "Medium" },
  
  // System and Services Acquisition (SA) - FedRAMP
  { id: "FEDRAMP-SA-2", name: "Allocation of Resources (FedRAMP)", category: "Organizational", priority: "High" },
  { id: "FEDRAMP-SA-3", name: "System Development Life Cycle (FedRAMP)", category: "Organizational", priority: "Critical" },
  { id: "FEDRAMP-SA-4", name: "Acquisition Process (FedRAMP)", category: "Vendor Management", priority: "Critical" },
  { id: "FEDRAMP-SA-5", name: "Information System Documentation (FedRAMP)", category: "Organizational", priority: "High" },
  { id: "FEDRAMP-SA-8", name: "Security Engineering Principles (FedRAMP)", category: "Organizational", priority: "Critical" },
  { id: "FEDRAMP-SA-9", name: "External Information System Services (FedRAMP)", category: "Vendor Management", priority: "Critical" },
  { id: "FEDRAMP-SA-11", name: "Developer Security Testing and Evaluation (FedRAMP)", category: "Security Testing", priority: "High" },
  { id: "FEDRAMP-SA-12", name: "Supply Chain Risk Management (FedRAMP)", category: "Vendor Management", priority: "Critical" },
  { id: "FEDRAMP-SA-15", name: "Development Process, Standards, and Tools (FedRAMP)", category: "Organizational", priority: "High" },
  { id: "FEDRAMP-SA-17", name: "Developer-Provided Training (FedRAMP)", category: "Organizational", priority: "Medium" },
  { id: "FEDRAMP-SA-19", name: "Component Authenticity (FedRAMP)", category: "Vendor Management", priority: "High" },
  { id: "FEDRAMP-SA-21", name: "Developer Screening (FedRAMP)", category: "Vendor Management", priority: "High" },
  { id: "FEDRAMP-SA-22", name: "Unsupported System Components (FedRAMP)", category: "Vendor Management", priority: "High" },
  
  // System and Communications Protection (SC) - FedRAMP
  { id: "FEDRAMP-SC-2", name: "Application Partitioning (FedRAMP)", category: "System Protection", priority: "High" },
  { id: "FEDRAMP-SC-4", name: "Information in Shared Resources (FedRAMP)", category: "System Protection", priority: "High" },
  { id: "FEDRAMP-SC-5", name: "Denial of Service Protection (FedRAMP)", category: "Network Security", priority: "Critical" },
  { id: "FEDRAMP-SC-7", name: "Boundary Protection (FedRAMP)", category: "Network Security", priority: "Critical" },
  { id: "FEDRAMP-SC-8", name: "Transmission Confidentiality and Integrity (FedRAMP)", category: "Network Security", priority: "Critical" },
  { id: "FEDRAMP-SC-10", name: "Network Disconnect (FedRAMP)", category: "Network Security", priority: "High" },
  { id: "FEDRAMP-SC-12", name: "Cryptographic Key Establishment and Management (FedRAMP)", category: "Cryptography", priority: "Critical" },
  { id: "FEDRAMP-SC-13", name: "Cryptographic Protection (FedRAMP)", category: "Cryptography", priority: "Critical" },
  { id: "FEDRAMP-SC-15", name: "Collaborative Computing Devices (FedRAMP)", category: "System Protection", priority: "High" },
  { id: "FEDRAMP-SC-20", name: "Secure Name / Address Resolution Service (Authoritative Source) (FedRAMP)", category: "Network Security", priority: "High" },
  { id: "FEDRAMP-SC-21", name: "Secure Name / Address Resolution Service (Recursive or Caching Resolver) (FedRAMP)", category: "Network Security", priority: "High" },
  { id: "FEDRAMP-SC-22", name: "Architecture and Provisioning for Name / Address Resolution Service (FedRAMP)", category: "Network Security", priority: "High" },
  { id: "FEDRAMP-SC-23", name: "Session Authenticity (FedRAMP)", category: "Network Security", priority: "Critical" },
  { id: "FEDRAMP-SC-28", name: "Protection of Information at Rest (FedRAMP)", category: "Data Protection", priority: "Critical" },
  { id: "FEDRAMP-SC-39", name: "Process Isolation (FedRAMP)", category: "System Protection", priority: "High" },
  
  // System and Information Integrity (SI) - FedRAMP
  { id: "FEDRAMP-SI-2", name: "Flaw Remediation (FedRAMP)", category: "System Integrity", priority: "Critical" },
  { id: "FEDRAMP-SI-3", name: "Malicious Code Protection (FedRAMP)", category: "System Integrity", priority: "Critical" },
  { id: "FEDRAMP-SI-4", name: "System Monitoring (FedRAMP)", category: "System Integrity", priority: "Critical" },
  { id: "FEDRAMP-SI-5", name: "Security Alerts, Advisories, and Directives (FedRAMP)", category: "System Integrity", priority: "Critical" },
  { id: "FEDRAMP-SI-6", name: "Security Function Verification (FedRAMP)", category: "System Integrity", priority: "High" },
  { id: "FEDRAMP-SI-7", name: "Software, Firmware, and Information Integrity (FedRAMP)", category: "System Integrity", priority: "Critical" },
  { id: "FEDRAMP-SI-8", name: "Spam Protection (FedRAMP)", category: "System Protection", priority: "High" },
  { id: "FEDRAMP-SI-10", name: "Information Input Validation (FedRAMP)", category: "System Integrity", priority: "Critical" },
  { id: "FEDRAMP-SI-11", name: "Error Handling (FedRAMP)", category: "System Integrity", priority: "High" },
  { id: "FEDRAMP-SI-12", name: "Information Handling and Retention (FedRAMP)", category: "System Integrity", priority: "Critical" },
  { id: "FEDRAMP-SI-16", name: "Memory Protection (FedRAMP)", category: "System Integrity", priority: "High" }
];

