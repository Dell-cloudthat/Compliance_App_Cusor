// HIPAA Security Rule Controls
// Reference: 45 CFR Parts 160, 162, and 164

export const HIPAA_CONTROLS = [
  // Administrative Safeguards
  { id: "HIPAA-164.308(a)(1)", name: "Security Management Process", category: "Administrative", priority: "Critical" },
  { id: "HIPAA-164.308(a)(2)", name: "Assigned Security Responsibility", category: "Administrative", priority: "Critical" },
  { id: "HIPAA-164.308(a)(3)", name: "Workforce Security", category: "Administrative", priority: "Critical" },
  { id: "HIPAA-164.308(a)(4)", name: "Information Access Management", category: "Access Control", priority: "Critical" },
  { id: "HIPAA-164.308(a)(5)", name: "Security Awareness and Training", category: "Security Awareness", priority: "High" },
  { id: "HIPAA-164.308(a)(6)", name: "Security Incident Procedures", category: "Incident Response", priority: "Critical" },
  { id: "HIPAA-164.308(a)(7)", name: "Contingency Plan", category: "Business Continuity", priority: "Critical" },
  { id: "HIPAA-164.308(a)(8)", name: "Evaluation", category: "Audit", priority: "High" },
  { id: "HIPAA-164.308(b)(1)", name: "Business Associate Contracts", category: "Vendor Management", priority: "Critical" },
  
  // Physical Safeguards
  { id: "HIPAA-164.310(a)(1)", name: "Facility Access Controls", category: "Physical", priority: "High" },
  { id: "HIPAA-164.310(a)(2)", name: "Workstation Use", category: "Physical", priority: "High" },
  { id: "HIPAA-164.310(a)(2)", name: "Workstation Security", category: "Physical", priority: "High" },
  { id: "HIPAA-164.310(b)", name: "Media Controls", category: "Data Protection", priority: "Critical" },
  { id: "HIPAA-164.310(c)", name: "Device and Media Controls", category: "Physical", priority: "High" },
  
  // Technical Safeguards
  { id: "HIPAA-164.312(a)(1)", name: "Access Control", category: "Access Control", priority: "Critical" },
  { id: "HIPAA-164.312(b)", name: "Audit Controls", category: "Audit", priority: "Critical" },
  { id: "HIPAA-164.312(c)(1)", name: "Integrity Controls", category: "System Integrity", priority: "Critical" },
  { id: "HIPAA-164.312(d)", name: "Person or Entity Authentication", category: "Identity Management", priority: "Critical" },
  { id: "HIPAA-164.312(e)(1)", name: "Transmission Security", category: "Network Security", priority: "Critical" },
  
  // Privacy Rule
  { id: "HIPAA-164.502", name: "Uses and Disclosures of PHI", category: "Privacy", priority: "Critical" },
  { id: "HIPAA-164.508", name: "Uses and Disclosures for Which Authorization is Required", category: "Privacy", priority: "Critical" },
  { id: "HIPAA-164.512", name: "Uses and Disclosures for Which Authorization is Not Required", category: "Privacy", priority: "High" },
  { id: "HIPAA-164.514", name: "Minimum Necessary Requirement", category: "Privacy", priority: "Critical" },
  { id: "HIPAA-164.520", name: "Notice of Privacy Practices", category: "Privacy", priority: "High" },
  { id: "HIPAA-164.522", name: "Right to Request Restrictions", category: "Privacy", priority: "Medium" },
  { id: "HIPAA-164.524", name: "Access to PHI", category: "Privacy", priority: "Critical" },
  { id: "HIPAA-164.526", name: "Amendment of PHI", category: "Privacy", priority: "Medium" },
  { id: "HIPAA-164.528", name: "Accounting of Disclosures", category: "Privacy", priority: "High" },
  { id: "HIPAA-164.530", name: "Administrative Requirements", category: "Administrative", priority: "High" }
];

