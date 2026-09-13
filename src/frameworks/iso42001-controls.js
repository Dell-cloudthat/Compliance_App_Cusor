// ISO/IEC 42001:2023 -- Artificial Intelligence Management System (AIMS)
// Structural scaffold: control IDs, the 9 Annex A objectives (A.2-A.10), and
// short titles are factual/structural elements of the published standard --
// the same short-label convention used industry-wide (e.g. referencing 'SOC 2
// CC6.1' by name). The full normative requirement text is a licensed,
// commercial ISO document (purchase at https://www.iso.org/standard/42001)
// and is NOT reproduced here -- descriptions below are written fresh,
// summarizing each control's scope from its published title and public
// secondary guidance, not copied from any single source.
//
// Clauses 4-10 (the mandatory management-system requirements: context,
// leadership, planning, support, operation, performance evaluation,
// improvement) follow the same Harmonized Structure as ISO 27001, which this
// platform already supports -- clients pursuing both can reuse governance
// evidence across the two.

export const ISO42001_OBJECTIVES = [
  { id: 'A.2', name: 'Policies related to AI' },
  { id: 'A.3', name: 'Internal organization' },
  { id: 'A.4', name: 'Resources for AI systems' },
  { id: 'A.5', name: 'Assessing impacts of AI systems' },
  { id: 'A.6', name: 'AI system life cycle' },
  { id: 'A.7', name: 'Data for AI systems' },
  { id: 'A.8', name: 'Information for interested parties of AI systems' },
  { id: 'A.9', name: 'Use of AI systems' },
  { id: 'A.10', name: 'Third-party and customer relationships' },
];

export const ISO42001_CONTROLS = [
  { id: 'A.2.2', objective: 'A.2', name: 'AI policy', priority: 'Critical', description: 'Establish and maintain a management-approved policy defining the organization\'s approach to developing and using AI responsibly, serving as the foundation the rest of the AI management system is built on.' },
  { id: 'A.2.3', objective: 'A.2', name: 'Alignment with other organizational policies', priority: 'Critical', description: 'Identify where the AI policy intersects with existing policies (security, privacy, risk, HR, procurement, ethics) and reconcile any conflicts so AI governance doesn\'t operate in isolation from the rest of the organization.' },
  { id: 'A.2.4', objective: 'A.2', name: 'Review of the AI policy', priority: 'Critical', description: 'Review the AI policy on a defined cadence and after material changes (new regulation, new use cases, incident lessons) to keep it current and properly endorsed by leadership.' },
  { id: 'A.3.2', objective: 'A.3', name: 'AI roles and responsibilities', priority: 'High', description: 'Define and assign accountability for AI-related activities across the lifecycle -- risk management, impact assessment, development, oversight, data quality, security, and supplier management -- so no responsibility falls through the cracks.' },
  { id: 'A.3.3', objective: 'A.3', name: 'Reporting of concerns', priority: 'High', description: 'Provide a protected channel for staff, contractors, and external parties to raise concerns about how AI systems are developed or used, with defined investigation and escalation steps.' },
  { id: 'A.4.2', objective: 'A.4', name: 'Resource documentation', priority: 'High', description: 'Maintain an inventory of the resources each AI system depends on at every lifecycle stage, giving the visibility needed to run risk assessments, impact assessments, and incident response.' },
  { id: 'A.4.3', objective: 'A.4', name: 'Data resources', priority: 'High', description: 'Record what data each AI system uses: provenance, currency, category (training/validation/test/production), labeling approach, intended purpose, quality, retention, and known bias concerns.' },
  { id: 'A.4.4', objective: 'A.4', name: 'Tooling resources', priority: 'High', description: 'Document the algorithms, models, frameworks, libraries, and evaluation tooling an AI system depends on, so results can be reproduced and supply-chain risk can be assessed.' },
  { id: 'A.4.5', objective: 'A.4', name: 'System and computing resources', priority: 'High', description: 'Document the compute, storage, network, and hosting environment an AI system runs on, including capacity constraints and the environmental footprint of the underlying hardware.' },
  { id: 'A.4.6', objective: 'A.4', name: 'Human resources', priority: 'High', description: 'Document the people and competencies involved across an AI system\'s life -- not just developers, but operators, domain experts, testers, and those handling oversight, change management, or decommissioning.' },
  { id: 'A.5.2', objective: 'A.5', name: 'AI system impact assessment process', priority: 'Critical', description: 'Stand up a repeatable process for assessing how an AI system could affect people and society: what triggers an assessment, what it covers, who performs it, and how results feed back into design and deployment decisions.' },
  { id: 'A.5.3', objective: 'A.5', name: 'Documentation of AI system impact assessments', priority: 'Critical', description: 'Keep written records of every impact assessment -- intended use, foreseeable misuse, predictable failure modes and mitigations, affected groups, human-oversight arrangements -- retained for audit and incident review.' },
  { id: 'A.5.4', objective: 'A.5', name: 'Assessing AI system impact on individuals or groups', priority: 'Critical', description: 'Specifically evaluate effects on people (fairness, privacy, safety, accessibility, financial consequences), with particular attention to children, the elderly, workers, and other groups needing extra protection.' },
  { id: 'A.5.5', objective: 'A.5', name: 'Assessing societal impacts of AI systems', priority: 'Critical', description: 'Extend impact assessment beyond direct users to environmental footprint, economic effects, impact on democratic processes, public health and safety, and the potential for misuse or reinforcing historical bias.' },
  { id: 'A.6.1.2', objective: 'A.6', name: 'Objectives for responsible development of AI system', priority: 'High', description: 'Set explicit, measurable responsible-development objectives -- fairness, transparency, robustness, privacy, safety -- and build them into development practice as design inputs, not aspirations.' },
  { id: 'A.6.1.3', objective: 'A.6', name: 'Processes for responsible AI system design and development', priority: 'High', description: 'Document the organization\'s actual steps for building AI systems responsibly: lifecycle stages, testing requirements, human oversight, training-data rules, release criteria, and change control.' },
  { id: 'A.6.2.2', objective: 'A.6', name: 'AI system requirements and specification', priority: 'High', description: 'Capture functional and non-functional requirements -- including risk and responsible-AI requirements -- before building, and keep them under change control as the system evolves.' },
  { id: 'A.6.2.3', objective: 'A.6', name: 'Documentation of AI system design and development', priority: 'High', description: 'Maintain a traceable record of design decisions (approach, algorithms, data assumptions, components, security considerations, human interaction) tied back to requirements.' },
  { id: 'A.6.2.4', objective: 'A.6', name: 'AI system verification and validation', priority: 'High', description: 'Define how the system will be verified (built right) and validated (built to do the right thing): testing methodology, test data selection, and acceptable error-rate thresholds for the use case.' },
  { id: 'A.6.2.5', objective: 'A.6', name: 'AI system deployment', priority: 'High', description: 'Maintain a deployment plan with release criteria, approvals, and rollback, satisfied before release -- especially when production differs from the development environment.' },
  { id: 'A.6.2.6', objective: 'A.6', name: 'AI system operation and monitoring', priority: 'High', description: 'Define day-to-day operation: performance monitoring (including drift and AI-specific threats like data poisoning), repairs, updates, and user support, each with clear ownership.' },
  { id: 'A.6.2.7', objective: 'A.6', name: 'AI system technical documentation', priority: 'High', description: 'Determine what technical documentation each audience (users, partners, auditors, regulators) needs and deliver it in a usable format, covering purpose, usage, limitations, and monitoring functions.' },
  { id: 'A.6.2.8', objective: 'A.6', name: 'AI system recording of event logs', priority: 'High', description: 'Decide what gets logged and at which lifecycle stages so behavior can be evidenced, issues traced, and performance drift outside intended operating conditions detected.' },
  { id: 'A.7.2', objective: 'A.7', name: 'Data for development and enhancement of AI system', priority: 'High', description: 'Operate data-management processes addressing privacy and security, representativeness against the operational domain, explainability and provenance, and accuracy and integrity of the underlying data.' },
  { id: 'A.7.3', objective: 'A.7', name: 'Acquisition of data', priority: 'High', description: 'Document where each dataset comes from and how it was selected -- internal, purchased, shared, open, or synthetic -- including known biases, data rights, and prior uses.' },
  { id: 'A.7.4', objective: 'A.7', name: 'Quality of data for AI systems', priority: 'High', description: 'Set explicit data-quality criteria (accuracy, completeness, currency, representativeness) and verify training and production data actually meet them, adjusting for fairness and bias impact.' },
  { id: 'A.7.5', objective: 'A.7', name: 'Data provenance', priority: 'High', description: 'Track a dataset\'s history -- creation, updates, transformations, validation, transfers -- across both the data\'s lifecycle and the AI system\'s lifecycle, so lineage is always recoverable.' },
  { id: 'A.7.6', objective: 'A.7', name: 'Data preparation', priority: 'High', description: 'Decide which data-preparation techniques (cleaning, labeling, augmentation, normalization) are acceptable, document the methods used per dataset, and record the rationale.' },
  { id: 'A.8.2', objective: 'A.8', name: 'System documentation and information for users', priority: 'High', description: 'Give users plain-language information needed to operate the AI system safely: capabilities, limits, expected inputs/outputs, known failure modes, and human-oversight options.' },
  { id: 'A.8.3', objective: 'A.8', name: 'External reporting', priority: 'High', description: 'Provide a way for anyone affected by the AI system to report problems or unintended consequences, with defined triage, investigation, and resolution steps.' },
  { id: 'A.8.4', objective: 'A.8', name: 'Communication of incidents', priority: 'High', description: 'Plan in advance how users and affected parties will be informed when an AI-related incident occurs -- what, who, how fast, through what channel -- aligned to regulatory notification obligations.' },
  { id: 'A.8.5', objective: 'A.8', name: 'Information for interested parties', priority: 'High', description: 'Determine what AI-system information beyond incidents needs proactive sharing with regulators, partners, customers, or the public, and document how and when.' },
  { id: 'A.9.2', objective: 'A.9', name: 'Processes for responsible use of AI systems', priority: 'High', description: 'Document how the AI system should be used responsibly in practice: human-oversight expectations, acceptable-use rules, escalation paths, operator training, and pause/stop conditions.' },
  { id: 'A.9.3', objective: 'A.9', name: 'Objectives for responsible use of AI system', priority: 'High', description: 'Define the responsible-use objectives the system is operated against -- fairness thresholds, human-in-the-loop requirements, safety tolerances -- as a clear reference for operational decisions.' },
  { id: 'A.9.4', objective: 'A.9', name: 'Intended use of the AI system', priority: 'High', description: 'Prevent scope creep: ensure the system is operated only for its designed purpose, with controls preventing repurposing or extension without re-assessment.' },
  { id: 'A.10.2', objective: 'A.10', name: 'Allocation of responsibilities', priority: 'High', description: 'Make explicit who is responsible for what across the AI supply chain -- the organization, suppliers, partners, and customers -- so no accountability gaps exist when something goes wrong.' },
  { id: 'A.10.3', objective: 'A.10', name: 'Suppliers', priority: 'High', description: 'Vet and manage suppliers of AI services, data, models, and tooling against the organization\'s own responsible-AI expectations through due diligence, contracts, and ongoing oversight.' },
  { id: 'A.10.4', objective: 'A.10', name: 'Customers', priority: 'High', description: 'Factor customer obligations -- contracts, regulatory promises, duty of care -- into the responsible-AI approach before finalizing decisions about development, provision, or use.' },
];
