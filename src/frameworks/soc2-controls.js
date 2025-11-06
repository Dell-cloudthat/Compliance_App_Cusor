// SOC 2 Type II Trust Service Criteria Controls
// Reference: AICPA Trust Services Criteria

export const SOC2_CONTROLS = [
  // CC1 - Control Environment
  { id: "CC1.1", name: "Commitment to Integrity and Ethical Values", category: "Control Environment", priority: "Critical" },
  { id: "CC1.2", name: "Board Oversight", category: "Control Environment", priority: "High" },
  { id: "CC1.3", name: "Management's Philosophy and Operating Style", category: "Control Environment", priority: "High" },
  { id: "CC1.4", name: "Organizational Structure", category: "Organizational", priority: "High" },
  { id: "CC1.5", name: "Assignment of Authority and Responsibility", category: "Organizational", priority: "Critical" },
  
  // CC2 - Communication and Information
  { id: "CC2.1", name: "Internal Communication", category: "Organizational", priority: "High" },
  { id: "CC2.2", name: "External Communication", category: "Organizational", priority: "Medium" },
  { id: "CC2.3", name: "Information Systems", category: "System Integrity", priority: "Critical" },
  
  // CC3 - Risk Assessment
  { id: "CC3.1", name: "Risk Identification", category: "Risk Assessment", priority: "Critical" },
  { id: "CC3.2", name: "Risk Analysis", category: "Risk Assessment", priority: "Critical" },
  { id: "CC3.3", name: "Risk Response", category: "Risk Assessment", priority: "Critical" },
  { id: "CC3.4", name: "Change Management", category: "Configuration Management", priority: "High" },
  
  // CC4 - Monitoring Activities
  { id: "CC4.1", name: "Ongoing Monitoring", category: "Audit", priority: "Critical" },
  { id: "CC4.2", name: "Separate Evaluations", category: "Audit", priority: "High" },
  { id: "CC4.3", name: "Communication of Deficiencies", category: "Audit", priority: "Critical" },
  
  // CC5 - Control Activities
  { id: "CC5.1", name: "Policies and Procedures", category: "Organizational", priority: "Critical" },
  { id: "CC5.2", name: "Control Implementation", category: "System Integrity", priority: "Critical" },
  { id: "CC5.3", name: "Control Selection", category: "System Integrity", priority: "High" },
  { id: "CC5.4", name: "Technology Controls", category: "System Integrity", priority: "Critical" },
  
  // CC6 - Logical and Physical Access Controls
  { id: "CC6.1", name: "Logical Access Security", category: "Access Control", priority: "Critical" },
  { id: "CC6.2", name: "Access Credentials", category: "Access Control", priority: "Critical" },
  { id: "CC6.3", name: "Access Removal", category: "Access Control", priority: "Critical" },
  { id: "CC6.4", name: "Access Restrictions", category: "Access Control", priority: "Critical" },
  { id: "CC6.5", name: "Physical Access Security", category: "Physical", priority: "Critical" },
  { id: "CC6.6", name: "Network Segmentation", category: "Network Security", priority: "Critical" },
  { id: "CC6.7", name: "Data Transmission", category: "Network Security", priority: "Critical" },
  { id: "CC6.8", name: "Boundary Defense", category: "Network Security", priority: "Critical" },
  
  // CC7 - System Operations
  { id: "CC7.1", name: "System Configuration", category: "Configuration Management", priority: "Critical" },
  { id: "CC7.2", name: "Malicious Code Detection", category: "System Protection", priority: "Critical" },
  { id: "CC7.3", name: "Backup and Recovery", category: "Business Continuity", priority: "Critical" },
  { id: "CC7.4", name: "System Monitoring", category: "System Integrity", priority: "Critical" },
  { id: "CC7.5", name: "System Events", category: "Audit", priority: "High" },
  
  // CC8 - Change Management
  { id: "CC8.1", name: "Change Management Process", category: "Configuration Management", priority: "Critical" },
  { id: "CC8.2", name: "Change Authorization", category: "Configuration Management", priority: "Critical" },
  { id: "CC8.3", name: "System Changes", category: "Configuration Management", priority: "Critical" },
  { id: "CC8.4", name: "Change Documentation", category: "Configuration Management", priority: "High" },
  
  // CC9 - Risk Mitigation
  { id: "CC9.1", name: "Risk Mitigation Strategies", category: "Risk Assessment", priority: "Critical" },
  { id: "CC9.2", name: "Threat Intelligence", category: "System Protection", priority: "High" },
  { id: "CC9.3", name: "Threat Monitoring", category: "System Protection", priority: "Critical" }
];

