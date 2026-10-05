/**
 * SecurityOS AI Copilot — shared response engine
 * Used by both CopilotView (full chat) and FixView (inline assist).
 */
import { STATUS } from './controls';
import { toGrade } from './scoring';

// ── Suggested questions per control category ───────────────────────────────
export const SUGGESTED_BY_CATEGORY = {
  identity: [
    'How do I enable MFA for all users?',
    'Which users still need to set up MFA?',
    'What if someone loses their second factor?',
  ],
  devices: [
    'How do I turn on disk encryption?',
    'How do I push automatic updates to all devices?',
    'Which endpoint protection tool do you recommend?',
  ],
  data: [
    'How do I test if my backups actually work?',
    'What should I encrypt and how?',
    'What data should never leave my control?',
  ],
  network: [
    'How do I lock down my firewall?',
    'How do I separate guest Wi-Fi from business Wi-Fi?',
    'What network logs should I be reviewing?',
  ],
  organization: [
    'What should my security policy cover?',
    'What goes in an incident response plan?',
    'How do I do security training without boring everyone?',
  ],
  ai_rmf: [
    'What AI tools should be in my inventory?',
    'What data must never go into AI tools like ChatGPT?',
    'How do I write an AI acceptable use policy?',
  ],
};

// ── Control-specific inline response (used in FixView) ────────────────────
export function respondForControl(msg, control, profile) {
  const m = msg.toLowerCase();
  const steps = (control?.remediation_steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  const mins = control?.estimated_minutes ?? 30;
  const provider = profile?.emailProvider || 'your platform';
  const bizName  = profile?.businessName  || 'your organization';

  // ── AI RMF controls ──────────────────────────────────────────────────────
  if (control?.category === 'ai_rmf') {
    if (control.id === 'CTRL-AI-001' || m.includes('inventory') || m.includes('list')) {
      return `**Building your AI Tool Inventory** for ${bizName}:

Start by asking your team one question: *"What AI tools do you use to get your work done?"*

Common answers you'll get:
- ChatGPT / Claude / Gemini for writing and summarization
- Copilot inside Microsoft 365 or Google Workspace
- AI features in accounting tools (QuickBooks AI, Xero, etc.)
- AI scheduling or CRM tools (Calendly AI, HubSpot AI, etc.)
- Image generation (DALL-E, Midjourney)

**Create a simple spreadsheet with:**
Tool Name | Purpose | Who Uses It | Data Entered | Enterprise Plan? | BAA Needed?

This is the foundation. Everything else in AI RMF builds on knowing what you have.

${steps}

Estimated time: ~${mins} minutes`;
    }

    if (control.id === 'CTRL-AI-002' || m.includes('policy') || m.includes('acceptable use')) {
      return `**Writing an AI Acceptable Use Policy** for ${bizName}:

Your policy needs to answer three questions:
1. **What's allowed?** — Which AI tools are approved and for what purposes?
2. **What's prohibited?** — What data must never go into AI tools?
3. **Who's accountable?** — Who decides when new AI tools can be used?

**Prohibited data (always include these):**
- Patient records / PHI (violates HIPAA)
- Client financial data (violates GLBA/FTC Safeguards)
- Social Security or government ID numbers
- Unpublished contracts or legal documents
- Passwords or API keys

**Sample policy statement:**
*"Employees may use approved AI tools for drafting, summarizing, and brainstorming. No client personal data, patient information, or confidential business data may be entered into any AI tool not covered by a Business Associate Agreement or Data Processing Agreement."*

${steps}

Estimated time: ~${mins} minutes`;
    }

    if (control.id === 'CTRL-AI-003' || m.includes('data') || m.includes('privacy') || m.includes('sensitive')) {
      return `**Protecting Sensitive Data from AI Tools:**

The core risk: public AI tools like the free tier of ChatGPT may use your inputs to improve their models — meaning client data you paste in could become training data.

**Right now, check:**
- Do you have Microsoft 365 Copilot? → Microsoft's enterprise agreement includes data protection
- Do you have Google Workspace Business/Enterprise? → Google's AI features include data protection
- Are employees using personal ChatGPT accounts for work? → This is a gap

**Enterprise options with data protection:**
- ChatGPT Team or Enterprise ($25–$30/user/month)
- Microsoft Copilot for M365 (data stays in your tenant)
- Google Gemini for Workspace (covered by your enterprise agreement)
- Claude for Enterprise (Anthropic)

${steps}

Estimated time: ~${mins} minutes`;
    }

    if (control.id === 'CTRL-AI-004' || m.includes('output') || m.includes('review') || m.includes('validation')) {
      return `**Setting up AI Output Review for ${bizName}:**

The rule is simple: **AI creates the first draft, humans make the final call.**

**High-stakes situations requiring human review:**
- Medical or legal advice going to clients
- Financial calculations or projections
- Regulatory submissions or compliance filings
- Any AI-generated communication under your professional license

**Practical implementation:**
1. Add "AI-assisted, reviewed by [Name]" to your workflow for AI-generated client documents
2. Build a checklist: Does it contain any errors? Hallucinated facts? Biased conclusions?
3. Have the reviewer initial off on high-stakes AI outputs

**For smaller tasks** (internal emails, summaries, brainstorming), a quick read-through is sufficient.

${steps}

Estimated time: ~${mins} minutes`;
    }

    if (control.id === 'CTRL-AI-005' || m.includes('vendor') || m.includes('assess')) {
      return `**Assessing AI Vendors for ${bizName}:**

For each AI tool in your inventory, find the answers to:

1. **Does the vendor train on my data?**
   - ChatGPT free: Yes, by default (opt out in settings)
   - ChatGPT Plus/Team/Enterprise: No
   - Microsoft Copilot for M365: No (covered by your enterprise agreement)
   - Google Workspace AI: No (enterprise agreement protects you)

2. **Where is my data stored and processed?**

3. **What happens if the vendor has a breach?**

4. **Do they have SOC 2 Type II or ISO 27001?**
   - OpenAI (ChatGPT): SOC 2 Type II ✅
   - Microsoft: SOC 2, ISO 27001 ✅
   - Google: SOC 2, ISO 27001 ✅

${steps}

Estimated time: ~${mins} minutes`;
    }

    if (control.id === 'CTRL-AI-006' || m.includes('incident') || m.includes('response') || m.includes('plan')) {
      return `**AI Incident Response Plan for ${bizName}:**

AI incidents are new — most businesses don't have a plan. Here's what yours should cover:

**Type 1: AI Data Exposure**
*An AI tool exposed or used client data improperly*
→ Treat like a data breach: notify affected clients, review your obligations, report if required

**Type 2: Harmful or Wrong AI Output**
*AI gave incorrect medical, legal, or financial advice that caused harm*
→ Retract the output, notify affected parties, review your review process

**Type 3: AI Vendor Breach**
*Your AI tool vendor was hacked*
→ Assess what data you sent them, follow vendor guidance, notify clients if their data was at risk

**Type 4: AI Service Failure**
*Critical AI tool goes down*
→ Fall back to manual processes, communicate timeline to staff

Add this as a 1-page addendum to your existing Incident Response Plan.

${steps}

Estimated time: ~${mins} minutes`;
    }

    // Generic AI RMF fallback
    return `**${control.name}** — NIST AI RMF 1.0

${control.description}

**Why this matters for ${bizName}:**
${control.customer_impact}

**Step-by-step fix:**
${steps}

**Estimated time:** ~${mins} minutes

The NIST AI Risk Management Framework (AI RMF 1.0) covers four functions: GOVERN, MAP, MEASURE, and MANAGE. This control falls under: ${Object.keys(control.framework_mappings?.nist_ai_rmf ? { nist_ai_rmf: control.framework_mappings.nist_ai_rmf } : {}).join(', ') || 'AI RMF'}.`;
  }

  // ── Identity controls ────────────────────────────────────────────────────
  if (control?.category === 'identity') {
    const isMicrosoft = provider.toLowerCase().includes('microsoft') || provider.toLowerCase().includes('365');
    const isGoogle    = provider.toLowerCase().includes('google');

    if (m.includes('mfa') || m.includes('enable') || m.includes('how') || m.includes('set up')) {
      return `**Enabling MFA for ${provider}:**

${isMicrosoft ? `**Microsoft 365 steps:**
1. Sign in to admin.microsoft.com
2. Go to Security → Multi-Factor Authentication
3. Select all users → click "Enable"
4. After 48 hours, set to "Enforced" (gives employees time to prep)
5. Employees download Microsoft Authenticator and scan the QR code on next login

💡 Tip: Microsoft Authenticator app is the best option — works offline and is more secure than SMS.` :
isGoogle ? `**Google Workspace steps:**
1. Sign in to admin.google.com
2. Security → 2-Step Verification → Get Started
3. Set enforcement to "On" for all users
4. Set grace period to 7 days (employees will be prompted on next login)
5. Employees choose: Google Authenticator, Google Prompts, or hardware key

💡 Tip: Enforce hardware security keys (YubiKey) for admin accounts.` :
`**General MFA setup:**
${steps}`}

**After enabling:** Sign in to a test account and confirm the second step appears.
**Estimated time:** ~${mins} minutes

Once done, tap "Mark as Fixed" below.`;
    }

    if (m.includes('which') || m.includes('who') || m.includes('check') || m.includes('user')) {
      return `**Finding users without MFA on ${provider}:**

${isMicrosoft ? `1. Go to admin.microsoft.com
2. Users → Active Users
3. Click "Multi-factor authentication" at the top
4. Filter by "Disabled" — these users need MFA set up
5. Bulk-enable them and send a notification email to complete setup` :
isGoogle ? `1. Go to admin.google.com
2. Reports → User Reports → Security
3. Look for the "2-Step Verification Enrolled" column
4. Filter to see who has NOT enrolled
5. Send those users a reminder with setup instructions` :
`Check your admin portal for a user security or MFA report. Most platforms show enrollment status per user.`}

**Best practice:** Export this list monthly until 100% enrollment is reached.`;
    }

    // Generic identity fallback
    return `**${control.name}** for ${bizName}:

${control.customer_impact}

**How to fix it:**
${steps}

Estimated time: ~${mins} minutes`;
  }

  // ── Generic fallback (any category) ─────────────────────────────────────
  const categoryLabel = {
    identity: 'Identity & Access', devices: 'Device Security',
    data: 'Data Protection', network: 'Cloud & Network', organization: 'Organization',
    ai_rmf: 'AI Risk Management',
  }[control?.category] || 'Security';

  return `**How to fix: ${control?.name}** (${categoryLabel})

${control?.customer_impact}

**Step-by-step:**
${steps}

**Estimated time:** ~${mins} minutes

${control?.evidence_requirements?.length > 0
  ? `**What to document:** ${control.evidence_requirements.map(e => e.description).join('; ')}`
  : ''}

Once complete, tap "Mark as Fixed" to update your score.`;
}

// ── General Copilot response (used in CopilotView) ─────────────────────────
export function respond(msg, profile, scoring) {
  const m = msg.toLowerCase();
  const score = scoring.totalScore;
  const grade = toGrade(score);
  const issues = scoring.issues || [];
  const critical = issues.filter(c => c.severity === 'critical' && c.status === STATUS.FAIL);
  const provider = profile?.emailProvider || 'your platform';
  const hasPHI = profile?.sensitiveData?.includes('phi');

  // AI RMF questions
  if (m.includes('ai rmf') || m.includes('ai risk') || m.includes('nist ai') || m.includes('artificial intelligence risk')) {
    const aiIssues = issues.filter(c => c.category === 'ai_rmf');
    return `**NIST AI Risk Management Framework (AI RMF 1.0)** — what you need to know:

The AI RMF was published by NIST in January 2023 and is rapidly becoming the standard for AI governance. It defines four core functions:

- **GOVERN** — policies, roles, and accountability for AI use
- **MAP** — understanding context, risks, and impacts of AI systems
- **MEASURE** — evaluating and testing AI systems for risk
- **MANAGE** — treating, monitoring, and responding to AI risks

**What this means for your business:**
If your team uses AI tools — ChatGPT, Microsoft Copilot, Google Gemini, or AI features in any software — you're already in scope.

${aiIssues.length > 0
  ? `**Your current AI RMF gaps (${aiIssues.length}):**\n${aiIssues.map(c => `- **${c.short_name}**: ${c.customerMessage}`).join('\n')}\n\nSelect "AI RMF" in the framework filter on the home screen to see only these controls.`
  : `You're looking good on AI RMF controls! Keep reviewing your AI tool inventory as you adopt new tools.`
}

Use the framework selector on the Home screen to filter to AI RMF controls only.`;
  }

  if (m.includes('ai tool') || m.includes('chatgpt') || m.includes('copilot') || (m.includes('ai') && m.includes('data'))) {
    return `**Using AI Tools Safely:**

The biggest risk for small businesses using AI tools is **data exposure** — employees pasting sensitive client information into public AI tools.

**The simple rule:**
- ✅ OK to enter: Public information, your own writing, internal processes without client data
- ❌ Never enter: Client names + financial details, medical records (PHI), SSNs, passwords, unpublished contracts

**Enterprise-grade AI tools (data stays private):**
- Microsoft 365 Copilot — protected by your M365 agreement
- Google Workspace AI features — protected by your Workspace agreement
- ChatGPT Team/Enterprise — data not used for training
- Claude for Business — Anthropic's enterprise tier

**If your team uses personal ChatGPT accounts for work:** This is your most urgent AI risk. Either upgrade to a business plan or create a policy prohibiting it for client-related work.

Go to Home → select "AI RMF" framework to see your full AI governance checklist.`;
  }

  if (m.includes('mfa') || m.includes('multi-factor') || m.includes('two-factor') || m.includes('2fa')) {
    const isMicrosoft = provider.toLowerCase().includes('microsoft') || provider.toLowerCase().includes('365');
    const isGoogle = provider.toLowerCase().includes('google');
    return `MFA blocks 99% of automated account attacks — it's the single highest-impact control you can implement.

**Setting it up for ${isMicrosoft ? 'Microsoft 365' : isGoogle ? 'Google Workspace' : provider}:**

${isMicrosoft ? `1. Go to admin.microsoft.com
2. Security → Multi-Factor Authentication
3. Select all users → Enable
4. Set to "Enforced" after 48 hours (gives employees time to set up)
5. Employees download Microsoft Authenticator and scan the QR code` : isGoogle ? `1. Go to admin.google.com
2. Security → 2-Step Verification
3. Set enforcement to "On" for all users
4. Set a grace period of a few days
5. Employees will be prompted to set up on next login` : `1. Go to your admin dashboard
2. Find Security or Authentication settings
3. Enable MFA / 2-Step Verification for all users
4. Give employees 48 hours before enforcing`}

**Verify it worked:** Sign in to a test account and confirm the second-step prompt appears.

This takes about 30 minutes. After that, your biggest single vulnerability is closed.`;
  }

  if (m.includes('most important') || m.includes('priority') || m.includes('first') || m.includes('start')) {
    if (critical.length > 0) {
      const top = critical[0];
      return `Your #1 priority right now: **${top.name}**

This is Critical because: ${top.customer_impact}

**How to fix it:**
${(top.remediation_steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

After that: ${issues.slice(1, 4).map(c => c.short_name).join(', ')}.

Tap "Fix it" next to ${top.short_name} on the home screen for the full guide.`;
    }
    if (issues.length > 0) {
      return `Your top priorities right now:

${issues.slice(0, 4).map((c, i) => `**${i + 1}. ${c.short_name}**\n${c.customerMessage}`).join('\n\n')}

Start with #1 and work your way down. Each fix takes under an hour.`;
    }
    return `Great news — no critical issues found. Your score is ${score}/100 (${grade}).

To maintain this, schedule a quarterly review of user access and a monthly backup restore test.`;
  }

  if (m.includes('hipaa')) {
    if (hasPHI) {
      return `Since you handle Protected Health Information, HIPAA's Security Rule applies to your business.

**Your current HIPAA-relevant status (score: ${score}/100):**

HIPAA's Security Rule maps directly to SecurityOS controls:
- MFA — required under Access Controls (164.312(d))
- Device Encryption — required (164.312(a)(2)(iv))
- Audit Logging — required (164.312(b))
- User Access Review — required (164.308(a)(3))
- Security Training — required (164.308(a)(5))
- Incident Response Plan — required (164.308(a)(6))
- Security Policy — required (164.308(a)(1))
- AI Data Privacy — required for any AI tools handling PHI (164.308(b) BAA)

**Important:** You need a signed Business Associate Agreement (BAA) with any cloud provider that handles PHI — Microsoft 365, Google Workspace, Dropbox, AND any AI tools you use with PHI.

Select "HIPAA" in the framework filter on the Home screen to see only your HIPAA controls.`;
    }
    return `HIPAA applies to businesses that create, receive, maintain, or transmit Protected Health Information (PHI).

If you handle patient data, update your profile in Settings → your HIPAA controls will be highlighted automatically.

Use the framework selector on the Home screen to filter to HIPAA controls.`;
  }

  if (m.includes('insurance') || m.includes('cyber insurance')) {
    return `Cyber insurance is increasingly essential for small businesses.

**What it covers:**
- Ransomware payments and recovery
- Data breach notification expenses
- Legal defense and regulatory fines
- Business interruption losses

**Average cost:** $1,000–$3,000/year for a small business

**What insurers require:**
- ✅ MFA (required by most carriers)
- ✅ Backups (required)
- ✅ Endpoint protection (required)
- ✅ Security training
- ✅ Incident response plan
- 🆕 AI use policy (emerging requirement, 2024–2025)

Your current score of **${score}/100** ${score >= 70 ? 'should qualify you for most policies' : 'may result in higher premiums — fix the open issues first'}.

**Where to get quotes:** Coalition (coalition.com), Cowbell, At-Bay, or ask your current broker.`;
  }

  if (m.includes('hacked') || m.includes('breach') || m.includes('incident') || m.includes('ransomware')) {
    return `If you think you've been hacked, here's what to do right now:

**First 2 hours:**
1. **Isolate affected systems** — disconnect from the internet
2. **Change passwords** — start with email and admin accounts (from a clean device)
3. **Call your cyber insurance carrier** — 24/7 incident response
4. **Preserve evidence** — don't wipe or restart systems yet

**Within 24 hours:**
- Notify your IT provider or MSP
- Contact legal counsel
- Begin documenting the timeline

**Within 72 hours:**
- Determine what data was accessed
- Check notification requirements: HIPAA (60 days), most US states (30–72 hours)

**Note:** If an AI tool was involved in the incident, follow your AI Incident Response plan. If you don't have one yet, that's CTRL-AI-006 on your home screen.`;
  }

  if (m.includes('share') || m.includes('client') || m.includes('passport') || m.includes('prove') || m.includes('proof')) {
    return `Your Trust Passport lets you share proof of your security with clients, vendors, and insurance carriers.

It shows:
- Your Security Readiness Score (${score}/100)
- Which controls you have in place
- Last verified date

**When to share it:**
- Client asks "do you take security seriously?"
- Vendor security questionnaire
- Cyber insurance application
- Enterprise client onboarding

Your current score of **${score}/100** is ${score >= 80 ? 'strong — share it confidently' : score >= 65 ? 'decent — consider fixing a few issues first' : 'improving — fix the critical issues before sharing broadly'}.

Go to the Passport tab to view and share yours.`;
  }

  return `Your Security Readiness Score is **${score}/100** — ${grade}.

${issues.length > 0
  ? `You have **${issues.length} issue${issues.length > 1 ? 's' : ''}** to address:\n${
      issues.slice(0, 4).map(c => `- **${c.short_name}:** ${c.customerMessage}`).join('\n')
    }${issues.length > 4 ? `\n...and ${issues.length - 4} more` : ''}\n\nFixing these would bring your score to approximately ${Math.min(100, score + Math.round(issues.length * 3))}/100.`
  : 'All controls are passing — excellent security posture!'
}

Ask me anything: how to fix a specific issue, NIST AI RMF, compliance frameworks, cyber insurance, incident response, or how to share your security status with clients.`;
}
