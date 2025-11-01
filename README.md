# Compliance Automation Platform

A comprehensive React-based compliance management application with multi-framework support, automated control mapping, and enterprise features.

## Features

- **Multi-Framework Support**: NIST 800-53, NIST 800-171, ISO 27001, SOC 2, CIS Controls
- **Automated Control Mapping**: Import data from security tools and automatically map to compliance controls
- **TCO Calculator**: Calculate total cost of ownership and ROI for compliance initiatives
- **Automation Planning**: AI-powered 90-day implementation roadmap
- **RBAC**: Role-based access control with granular permissions
- **Vendor Management**: Track third-party compliance and inherited controls
- **Data Import**: Connect to various security tools (Okta, CrowdStrike, AWS, etc.)
- **Project Timeline**: Visual roadmap with milestones and progress tracking

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)

## Project Structure

```
├── src/
│   ├── ComplianceMVP.jsx  # Main compliance component
│   ├── App.jsx            # Root component
│   ├── main.jsx          # Entry point
│   └── index.css         # Tailwind imports
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

