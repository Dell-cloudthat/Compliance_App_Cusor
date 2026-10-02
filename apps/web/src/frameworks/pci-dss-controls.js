// PCI DSS v4.0 Controls
// Reference: https://www.pcisecuritystandards.org/

export const PCI_DSS_CONTROLS = [
  // Requirement 1: Install and Maintain Network Security Controls
  { id: "PCI-1.1", name: "Network Security Controls", category: "Network Security", priority: "Critical" },
  { id: "PCI-1.2", name: "Network Segmentation", category: "Network Security", priority: "Critical" },
  { id: "PCI-1.3", name: "Firewall Configuration", category: "Network Security", priority: "Critical" },
  { id: "PCI-1.4", name: "Personal Firewall Software", category: "Endpoint Security", priority: "High" },
  
  // Requirement 2: Apply Secure Configurations to All System Components
  { id: "PCI-2.1", name: "Vendor Default Settings", category: "Configuration Management", priority: "Critical" },
  { id: "PCI-2.2", name: "System Configuration Standards", category: "Configuration Management", priority: "Critical" },
  { id: "PCI-2.3", name: "Encryption for Non-Console Administrative Access", category: "System Protection", priority: "Critical" },
  
  // Requirement 3: Protect Stored Account Data
  { id: "PCI-3.1", name: "Data Retention and Disposal", category: "Data Protection", priority: "Critical" },
  { id: "PCI-3.2", name: "Sensitive Authentication Data", category: "Data Protection", priority: "Critical" },
  { id: "PCI-3.3", name: "PAN Display and Masking", category: "Data Protection", priority: "High" },
  { id: "PCI-3.4", name: "PAN Storage", category: "Data Protection", priority: "Critical" },
  { id: "PCI-3.5", name: "Primary Account Number (PAN) Encryption", category: "Data Protection", priority: "Critical" },
  { id: "PCI-3.6", name: "Key Management", category: "Cryptography", priority: "Critical" },
  
  // Requirement 4: Protect Cardholder Data with Strong Cryptography During Transmission
  { id: "PCI-4.1", name: "Cryptographic Transmission", category: "Network Security", priority: "Critical" },
  { id: "PCI-4.2", name: "TLS/SSL Implementation", category: "Network Security", priority: "Critical" },
  
  // Requirement 5: Protect All Systems and Networks from Malicious Software
  { id: "PCI-5.1", name: "Anti-Malware Solutions", category: "System Protection", priority: "Critical" },
  { id: "PCI-5.2", name: "Malware Protection Configuration", category: "System Protection", priority: "Critical" },
  { id: "PCI-5.3", name: "Malware Updates", category: "System Protection", priority: "Critical" },
  
  // Requirement 6: Develop and Maintain Secure Systems and Software
  { id: "PCI-6.1", name: "Security Vulnerability Management", category: "Vulnerability Management", priority: "Critical" },
  { id: "PCI-6.2", name: "Vendor-Supplied Security Patches", category: "Vulnerability Management", priority: "Critical" },
  { id: "PCI-6.3", name: "Secure Development Lifecycle", category: "Application Security", priority: "Critical" },
  { id: "PCI-6.4", name: "Change Control Process", category: "Configuration Management", priority: "High" },
  { id: "PCI-6.5", name: "Common Software Vulnerabilities", category: "Application Security", priority: "Critical" },
  
  // Requirement 7: Restrict Access to System Components and Cardholder Data
  { id: "PCI-7.1", name: "Access Control", category: "Access Control", priority: "Critical" },
  { id: "PCI-7.2", name: "Default Deny All", category: "Access Control", priority: "Critical" },
  { id: "PCI-7.3", name: "Access to System Components", category: "Access Control", priority: "Critical" },
  
  // Requirement 8: Identify Users and Authenticate Access to System Components
  { id: "PCI-8.1", name: "User Identification", category: "Identity Management", priority: "Critical" },
  { id: "PCI-8.2", name: "User Authentication", category: "Identity Management", priority: "Critical" },
  { id: "PCI-8.3", name: "Multi-Factor Authentication", category: "Identity Management", priority: "Critical" },
  { id: "PCI-8.4", name: "Account Management", category: "Identity Management", priority: "Critical" },
  { id: "PCI-8.5", name: "Password/PIN Management", category: "Identity Management", priority: "Critical" },
  { id: "PCI-8.6", name: "Authentication Credentials", category: "Identity Management", priority: "Critical" },
  
  // Requirement 9: Restrict Physical Access to Cardholder Data
  { id: "PCI-9.1", name: "Physical Access Controls", category: "Physical", priority: "Critical" },
  { id: "PCI-9.2", name: "Facility Entry Controls", category: "Physical", priority: "Critical" },
  { id: "PCI-9.3", name: "Media Handling", category: "Physical", priority: "Critical" },
  { id: "PCI-9.4", name: "Device Disposal", category: "Physical", priority: "High" },
  
  // Requirement 10: Log and Monitor All Access to System Components and Cardholder Data
  { id: "PCI-10.1", name: "Audit Logging", category: "Audit", priority: "Critical" },
  { id: "PCI-10.2", name: "Log Event Details", category: "Audit", priority: "Critical" },
  { id: "PCI-10.3", name: "Log Protection", category: "Audit", priority: "Critical" },
  { id: "PCI-10.4", name: "Time Synchronization", category: "Audit", priority: "High" },
  { id: "PCI-10.5", name: "Secure Audit Logs", category: "Audit", priority: "Critical" },
  { id: "PCI-10.6", name: "Review Logs", category: "Audit", priority: "Critical" },
  { id: "PCI-10.7", name: "Log Retention", category: "Audit", priority: "High" },
  { id: "PCI-10.8", name: "Log Monitoring", category: "Audit", priority: "Critical" },
  
  // Requirement 11: Test Security of Systems and Networks Regularly
  { id: "PCI-11.1", name: "Network Vulnerability Scanning", category: "Vulnerability Management", priority: "Critical" },
  { id: "PCI-11.2", name: "External Vulnerability Scanning", category: "Vulnerability Management", priority: "Critical" },
  { id: "PCI-11.3", name: "Internal Vulnerability Scanning", category: "Vulnerability Management", priority: "Critical" },
  { id: "PCI-11.4", name: "Penetration Testing", category: "Security Testing", priority: "High" },
  { id: "PCI-11.5", name: "Network Intrusion Detection", category: "Network Security", priority: "Critical" },
  { id: "PCI-11.6", name: "File Integrity Monitoring", category: "System Integrity", priority: "Critical" },
  
  // Requirement 12: Support Information Security with Organizational Policies and Programs
  { id: "PCI-12.1", name: "Information Security Policy", category: "Organizational", priority: "Critical" },
  { id: "PCI-12.2", name: "Annual Security Risk Assessment", category: "Risk Assessment", priority: "Critical" },
  { id: "PCI-12.3", name: "Security Awareness Program", category: "Security Awareness", priority: "High" },
  { id: "PCI-12.4", name: "Security Responsibilities", category: "Organizational", priority: "Critical" },
  { id: "PCI-12.5", name: "Service Provider Management", category: "Vendor Management", priority: "Critical" },
  { id: "PCI-12.6", name: "Incident Response Plan", category: "Incident Response", priority: "Critical" },
  { id: "PCI-12.7", name: "Business Continuity Plan", category: "Business Continuity", priority: "High" },
  { id: "PCI-12.8", name: "Service Provider Agreements", category: "Vendor Management", priority: "High" }
];

