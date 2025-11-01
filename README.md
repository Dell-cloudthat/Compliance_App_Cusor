# Compliance Automation Platform

A comprehensive compliance management system with multi-framework control mapping, AI-powered recommendations, and audit-ready documentation.

## Features

### 🎯 Core Functionality
- **Multi-Framework Support**: NIST 800-53, NIST 800-171, ISO 27001, SOC 2, CIS Controls
- **Control Mapping**: Auto-assignment and manual control management
- **Responsibility Matrix**: Audit-ready documentation showing control ownership and data attribution
- **AI-Powered Recommendations**: Smart gap analysis with vendor suggestions

### 📊 Dashboard & Analytics
- **Real-time Compliance Scores**: Track compliance across all frameworks
- **Gap Analysis**: Identify critical and high-priority gaps
- **TCO Calculator**: Estimate total cost of ownership for compliance initiatives
- **Project Timeline**: Visual roadmap with cost graphs and vendor recommendations

### 🔐 Enterprise Features
- **Multi-Entity Management**: Support for parent/subsidiary organizations
- **Role-Based Access Control (RBAC)**: Granular permissions management
- **Vendor Risk Management**: Track third-party compliance and inherited controls
- **API Integrations**: Connect with security tools (EDR, SIEM, Identity, etc.)

### 🎨 Modern UI
- **shadcn/ui Components**: Beautiful, accessible component library
- **Dark Theme**: VS Code-inspired dark theme with excellent readability
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dropdown Navigation**: Organized menu system for easy navigation

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **Lucide React** - Icon library
- **Radix UI** - Accessible component primitives

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Running the Application

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:5173`

## Project Structure

```
Compliance_App_Cusor/
├── src/
│   ├── components/
│   │   └── ui/          # shadcn/ui components
│   ├── lib/
│   │   └── utils.js     # Utility functions
│   ├── App.jsx          # Root component
│   ├── ComplianceMVP.jsx  # Main application component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── package.json         # Dependencies
└── vite.config.js       # Vite configuration
```

## Key Features Explained

### Responsibility Matrix
Generates audit-ready documentation showing:
- Control ownership (Primary and Secondary)
- Data source attribution (API integrations)
- Evidence attribution (where evidence comes from)
- MDR/SOC provider coverage
- Perfect for MSSP/MDR providers managing multiple customers

### AI Recommendations
Intelligently suggests:
- Critical gaps requiring immediate attention
- Vendor solutions for compliance gaps
- Cost optimization opportunities
- Automation potential

### Vendor Management
- Track vendor risk tiers
- Map inherited controls
- Calculate ROI for vendor solutions
- Sort by priority and price

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.
# Compliance_App_Cusor
# Compliance_App_Cusor
