// NIST 800-171 Rev 2 Controls
// Reference: https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final

export const NIST_800_171_CONTROLS = [
  // 3.1 - Access Control
  { id: "3.1.1", name: "Limit information system access to authorized users", category: "Access Control", priority: "Critical" },
  { id: "3.1.2", name: "Limit information system access to authorized processes", category: "Access Control", priority: "Critical" },
  { id: "3.1.3", name: "Control the flow of CUI in accordance with approved authorizations", category: "Access Control", priority: "Critical" },
  { id: "3.1.4", name: "Separate the duties of individuals to reduce the risk of malevolent activity", category: "Access Control", priority: "Critical" },
  { id: "3.1.5", name: "Employ least privilege principle", category: "Access Control", priority: "Critical" },
  { id: "3.1.6", name: "Use non-privileged accounts or roles when accessing nonsecurity functions", category: "Access Control", priority: "High" },
  { id: "3.1.7", name: "Prevent non-privileged users from executing privileged functions", category: "Access Control", priority: "Critical" },
  { id: "3.1.8", name: "Limit unsuccessful logon attempts", category: "Access Control", priority: "Critical" },
  { id: "3.1.9", name: "Provide privacy and security notices", category: "Access Control", priority: "Medium" },
  { id: "3.1.10", name: "Use session locks with pattern-hiding displays", category: "Access Control", priority: "High" },
  { id: "3.1.11", name: "Terminate user sessions automatically", category: "Access Control", priority: "High" },
  { id: "3.1.12", name: "Monitor and control remote access sessions", category: "Access Control", priority: "Critical" },
  { id: "3.1.13", name: "Employ cryptographic mechanisms to protect remote access sessions", category: "Access Control", priority: "Critical" },
  { id: "3.1.14", name: "Route remote access through managed access control points", category: "Access Control", priority: "Critical" },
  { id: "3.1.15", name: "Authorize remote execution of privileged commands", category: "Access Control", priority: "Critical" },
  { id: "3.1.16", name: "Authorize remote access to privileged commands", category: "Access Control", priority: "Critical" },
  { id: "3.1.17", name: "Protect wireless access using authentication and encryption", category: "Access Control", priority: "Critical" },
  { id: "3.1.18", name: "Control connection of mobile devices", category: "Access Control", priority: "High" },
  { id: "3.1.19", name: "Encrypt CUI on mobile devices", category: "Access Control", priority: "Critical" },
  { id: "3.1.20", name: "Verify and control connections to external systems", category: "Access Control", priority: "Critical" },
  { id: "3.1.21", name: "Limit use of portable storage devices", category: "Access Control", priority: "High" },
  { id: "3.1.22", name: "Control CUI posted or processed on publicly accessible systems", category: "Access Control", priority: "Critical" },
  
  // 3.2 - Awareness and Training
  { id: "3.2.1", name: "Ensure that managers are aware of security risks", category: "Security Awareness", priority: "High" },
  { id: "3.2.2", name: "Ensure that organizational personnel are adequately trained", category: "Security Awareness", priority: "High" },
  { id: "3.2.3", name: "Provide security awareness training on indicators of malicious activity", category: "Security Awareness", priority: "High" },
  
  // 3.3 - Audit and Accountability
  { id: "3.3.1", name: "Create and retain audit records", category: "Audit", priority: "Critical" },
  { id: "3.3.2", name: "Ensure that the actions of individual system users can be uniquely traced", category: "Audit", priority: "Critical" },
  { id: "3.3.3", name: "Review and update logged events", category: "Audit", priority: "Critical" },
  { id: "3.3.4", name: "Alert in the event of an audit logging process failure", category: "Audit", priority: "Critical" },
  { id: "3.3.5", name: "Correlate audit record review, analysis, and reporting processes", category: "Audit", priority: "Critical" },
  { id: "3.3.6", name: "Provide audit record reduction and report generation capability", category: "Audit", priority: "High" },
  { id: "3.3.7", name: "Provide a system capability that compares and synchronizes internal system clocks", category: "Audit", priority: "High" },
  { id: "3.3.8", name: "Protect audit information and audit tools from unauthorized access", category: "Audit", priority: "Critical" },
  { id: "3.3.9", name: "Limit management of audit functionality to a subset of privileged users", category: "Audit", priority: "High" },
  
  // 3.4 - Configuration Management
  { id: "3.4.1", name: "Establish and maintain baseline configurations", category: "Configuration Management", priority: "Critical" },
  { id: "3.4.2", name: "Establish and enforce security configuration settings", category: "Configuration Management", priority: "Critical" },
  { id: "3.4.3", name: "Track, review, approve or disapprove, and log changes", category: "Configuration Management", priority: "Critical" },
  { id: "3.4.4", name: "Analyze the security impact of changes", category: "Configuration Management", priority: "Critical" },
  { id: "3.4.5", name: "Define, document, approve, and enforce physical and logical access restrictions", category: "Configuration Management", priority: "Critical" },
  { id: "3.4.6", name: "Employ least functionality principle", category: "Configuration Management", priority: "High" },
  { id: "3.4.7", name: "Restrict, disable, or prevent the use of nonessential programs, functions, ports, protocols, and services", category: "Configuration Management", priority: "Critical" },
  { id: "3.4.8", name: "Apply deny-by-exception (blacklisting) policy", category: "Configuration Management", priority: "High" },
  { id: "3.4.9", name: "Control and monitor user-installed software", category: "Configuration Management", priority: "High" },
  
  // 3.5 - Identification and Authentication
  { id: "3.5.1", name: "Identify system users and processes acting on behalf of users", category: "Identity Management", priority: "Critical" },
  { id: "3.5.2", name: "Authenticate identities before allowing access", category: "Identity Management", priority: "Critical" },
  { id: "3.5.3", name: "Use multifactor authentication for local and network access", category: "Identity Management", priority: "Critical" },
  { id: "3.5.4", name: "Employ replay-resistant authentication mechanisms", category: "Identity Management", priority: "High" },
  { id: "3.5.5", name: "Prevent reuse of identifiers", category: "Identity Management", priority: "High" },
  { id: "3.5.6", name: "Disable identifiers after a defined period of inactivity", category: "Identity Management", priority: "High" },
  { id: "3.5.7", name: "Enforce a minimum password complexity", category: "Identity Management", priority: "Critical" },
  { id: "3.5.8", name: "Prohibit password reuse", category: "Identity Management", priority: "Critical" },
  { id: "3.5.9", name: "Allow temporary password use for system logons", category: "Identity Management", priority: "High" },
  { id: "3.5.10", name: "Store and transmit only cryptographically protected passwords", category: "Identity Management", priority: "Critical" },
  { id: "3.5.11", name: "Obscure feedback of authentication information", category: "Identity Management", priority: "Medium" },
  
  // 3.6 - Incident Response
  { id: "3.6.1", name: "Establish an operational incident-handling capability", category: "Incident Response", priority: "Critical" },
  { id: "3.6.2", name: "Track, document, and report incidents", category: "Incident Response", priority: "Critical" },
  { id: "3.6.3", name: "Test the incident response capability", category: "Incident Response", priority: "High" },
  
  // 3.7 - Maintenance
  { id: "3.7.1", name: "Perform maintenance on organizational systems", category: "System Integrity", priority: "High" },
  { id: "3.7.2", name: "Provide maintenance personnel with tools", category: "System Integrity", priority: "High" },
  { id: "3.7.3", name: "Ensure equipment removed for off-site maintenance is sanitized", category: "System Integrity", priority: "Critical" },
  { id: "3.7.4", name: "Check media containing diagnostic and test programs for malicious code", category: "System Integrity", priority: "High" },
  { id: "3.7.5", name: "Require multifactor authentication to establish nonlocal maintenance sessions", category: "System Integrity", priority: "Critical" },
  
  // 3.8 - Media Protection
  { id: "3.8.1", name: "Protect paper and digital media", category: "Data Protection", priority: "Critical" },
  { id: "3.8.2", name: "Limit access to CUI on portable storage devices", category: "Data Protection", priority: "Critical" },
  { id: "3.8.3", name: "Sanitize or destroy media containing CUI", category: "Data Protection", priority: "Critical" },
  { id: "3.8.4", name: "Mark media with necessary CUI markings", category: "Data Protection", priority: "High" },
  { id: "3.8.5", name: "Control access to media containing CUI", category: "Data Protection", priority: "Critical" },
  { id: "3.8.6", name: "Implement cryptographic mechanisms to protect CUI", category: "Data Protection", priority: "Critical" },
  { id: "3.8.7", name: "Control the use of removable media", category: "Data Protection", priority: "High" },
  { id: "3.8.8", name: "Encrypt CUI on portable storage devices", category: "Data Protection", priority: "Critical" },
  { id: "3.8.9", name: "Protect the confidentiality of backup CUI at storage locations", category: "Data Protection", priority: "Critical" },
  
  // 3.9 - Personnel Security
  { id: "3.9.1", name: "Screen individuals prior to authorizing access", category: "People", priority: "High" },
  { id: "3.9.2", name: "Ensure that organizational personnel are adequately trained", category: "People", priority: "High" },
  { id: "3.9.3", name: "Terminate access when employment ends", category: "People", priority: "Critical" },
  
  // 3.10 - Physical Protection
  { id: "3.10.1", name: "Limit physical access to organizational systems and equipment", category: "Physical", priority: "Critical" },
  { id: "3.10.2", name: "Protect and monitor the physical facility", category: "Physical", priority: "Critical" },
  { id: "3.10.3", name: "Escort visitors and monitor visitor activity", category: "Physical", priority: "High" },
  { id: "3.10.4", name: "Maintain audit logs of physical access", category: "Physical", priority: "High" },
  { id: "3.10.5", name: "Control and manage physical access devices", category: "Physical", priority: "High" },
  { id: "3.10.6", name: "Enforce safeguarding measures for CUI at alternate work sites", category: "Physical", priority: "High" },
  
  // 3.11 - Risk Assessment
  { id: "3.11.1", name: "Periodically assess the risk to organizational operations", category: "Risk Assessment", priority: "Critical" },
  { id: "3.11.2", name: "Scan for vulnerabilities in organizational systems", category: "Risk Assessment", priority: "Critical" },
  { id: "3.11.3", name: "Remediate vulnerabilities in accordance with risk assessments", category: "Risk Assessment", priority: "Critical" },
  
  // 3.12 - Security Assessment
  { id: "3.12.1", name: "Periodically assess the security controls", category: "Security Assessment", priority: "Critical" },
  { id: "3.12.2", name: "Develop and implement plans of action", category: "Security Assessment", priority: "Critical" },
  { id: "3.12.3", name: "Monitor security controls on an ongoing basis", category: "Security Assessment", priority: "Critical" },
  { id: "3.12.4", name: "Develop, document, and update system security plans", category: "Security Assessment", priority: "Critical" },
  
  // 3.13 - System and Communications Protection
  { id: "3.13.1", name: "Monitor, control, and protect organizational communications", category: "Network Security", priority: "Critical" },
  { id: "3.13.2", name: "Employ architectural designs and software development practices", category: "System Protection", priority: "High" },
  { id: "3.13.3", name: "Separate user functionality from system management functionality", category: "System Protection", priority: "Critical" },
  { id: "3.13.4", name: "Prevent unauthorized and unintended information transfer", category: "Network Security", priority: "Critical" },
  { id: "3.13.5", name: "Implement subnetworks for publicly accessible system components", category: "Network Security", priority: "Critical" },
  { id: "3.13.6", name: "Deny network communications traffic by default", category: "Network Security", priority: "Critical" },
  { id: "3.13.7", name: "Prevent remote devices from simultaneously establishing connections", category: "Network Security", priority: "High" },
  { id: "3.13.8", name: "Implement cryptographic mechanisms to protect CUI", category: "Network Security", priority: "Critical" },
  { id: "3.13.9", name: "Terminate network connections associated with communication sessions", category: "Network Security", priority: "High" },
  { id: "3.13.10", name: "Establish and manage cryptographic keys", category: "Cryptography", priority: "Critical" },
  { id: "3.13.11", name: "Employ FIPS-validated cryptography", category: "Cryptography", priority: "Critical" },
  { id: "3.13.12", name: "Prohibit the use of FIPS-validated cryptography", category: "Cryptography", priority: "Critical" },
  { id: "3.13.13", name: "Protect the authenticity of communications sessions", category: "Network Security", priority: "Critical" },
  { id: "3.13.14", name: "Protect the confidentiality of CUI at rest", category: "Data Protection", priority: "Critical" },
  { id: "3.13.15", name: "Protect the confidentiality of CUI in transit", category: "Network Security", priority: "Critical" },
  { id: "3.13.16", name: "Protect the integrity of CUI in transit", category: "Network Security", priority: "Critical" },
  
  // 3.14 - System and Information Integrity
  { id: "3.14.1", name: "Identify, report, and correct information and information system flaws", category: "System Integrity", priority: "Critical" },
  { id: "3.14.2", name: "Provide protection from malicious code at appropriate locations", category: "System Integrity", priority: "Critical" },
  { id: "3.14.3", name: "Monitor organizational systems", category: "System Integrity", priority: "Critical" },
  { id: "3.14.4", name: "Update malicious code protection mechanisms", category: "System Integrity", priority: "Critical" },
  { id: "3.14.5", name: "Perform periodic scans of the information system", category: "System Integrity", priority: "Critical" },
  { id: "3.14.6", name: "Monitor organizational systems", category: "System Integrity", priority: "Critical" },
  { id: "3.14.7", name: "Identify unauthorized use of organizational systems", category: "System Integrity", priority: "Critical" },
  
  // 3.15 - Supply Chain Risk Management
  { id: "3.15.1", name: "Develop and implement a supply chain risk management strategy", category: "Vendor Management", priority: "Critical" },
  { id: "3.15.2", name: "Establish and maintain supply chain relationships", category: "Vendor Management", priority: "Critical" },
  { id: "3.15.3", name: "Identify and assess supply chain risks", category: "Vendor Management", priority: "Critical" },
  { id: "3.15.4", name: "Protect against supply chain risks", category: "Vendor Management", priority: "Critical" }
];

