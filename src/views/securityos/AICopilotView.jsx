import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../SecurityOSApp';
import { STATUS } from '../../data/controls';
import { scoreToGrade } from '../../data/scoring';
import { Bot, Send, User, Sparkles, ChevronRight } from 'lucide-react';

function buildSystemContext(profile, scoring) {
  const failing = scoring.allControls.filter((c) => c.status === STATUS.FAIL);
  const unknown = scoring.allControls.filter((c) => c.status === STATUS.UNKNOWN);
  const issues = [...failing, ...unknown];

  const issueList = issues.slice(0, 8).map((c) => `- ${c.shortTitle} (${c.status}, ${c.severity})`).join('\n');

  return `You are the SecurityOS AI Copilot — a friendly, expert security advisor for small businesses. You speak in plain language, not compliance jargon.

Business Profile:
- Name: ${profile.businessName || 'Unknown'}
- Industry: ${profile.industry || 'Unknown'}
- Employees: ${profile.employeeCount || 'Unknown'}
- Email: ${profile.emailProvider || 'Unknown'}
- Cloud: ${(profile.cloudProviders || []).join(', ') || 'Unknown'}
- Sensitive Data: ${(profile.sensitiveData || []).join(', ') || 'None specified'}

Security Readiness Score: ${scoring.totalScore}/100 (${scoreToGrade(scoring.totalScore)})

Category Scores:
${Object.values(scoring.categories).map((c) => `- ${c.label}: ${c.score}/${c.maxScore}`).join('\n')}

Open Issues (${issues.length} total):
${issueList || 'None'}

Your job: Give clear, actionable advice. Keep answers concise but complete. Reference specific controls when relevant. Never overwhelm with jargon. Always end with a concrete next step.`;
}

const SUGGESTED_QUESTIONS = [
  'Am I compliant with HIPAA?',
  'What\'s the most important thing to fix first?',
  'How do I set up MFA for my team?',
  'Can I share proof of my security with clients?',
  'What happens if I get hacked?',
  'Do I need cyber insurance?',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
        isUser ? 'bg-indigo-600' : 'bg-slate-700'
      }`}>
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-indigo-400" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-slate-800 text-slate-200 rounded-tl-sm'
      }`}>
        {msg.content.split('\n').map((line, i) => (
          <p key={i} className={line === '' ? 'h-2' : ''}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function generateLocalResponse(userMessage, profile, scoring) {
  const msg = userMessage.toLowerCase();
  const score = scoring.totalScore;
  const grade = scoreToGrade(score);
  const failing = scoring.allControls.filter((c) => c.status === STATUS.FAIL);
  const unknown = scoring.allControls.filter((c) => c.status === STATUS.UNKNOWN);
  const issues = [...failing, ...unknown];
  const critical = issues.filter((c) => c.severity === 'critical');

  if (msg.includes('mfa') || msg.includes('multi-factor') || msg.includes('two-factor')) {
    const provider = profile.emailProvider || 'your email provider';
    return `Great question about MFA! Here's how to set it up for ${provider}:

**If you use Microsoft 365:**
1. Go to admin.microsoft.com
2. Navigate to Security → Multi-Factor Authentication
3. Select all users and click "Enable"
4. Set it to "Enforced" after 2-3 days to give everyone time to enroll
5. Users will be prompted to set up the Microsoft Authenticator app

**If you use Google Workspace:**
1. Go to admin.google.com
2. Security → 2-Step Verification
3. Set "Enforcement" to "On" for all users
4. Give users a grace period of a few days

**Why this matters:** MFA blocks 99.9% of automated account attacks. Even if someone steals a password, they still can't log in.

**Next step:** Set aside 30 minutes this week to enable MFA in your admin console.`;
  }

  if (msg.includes('most important') || msg.includes('first') || msg.includes('priority') || msg.includes('fix first')) {
    if (critical.length > 0) {
      const top = critical[0];
      return `Based on your current security profile, your #1 priority is: **${top.title}**

This is marked as CRITICAL because:
${top.whyItMatters}

**How to fix it:**
${top.howToFix?.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'See the Fix Issues tab for detailed steps.'}

After that, focus on: ${critical.slice(1, 3).map((c) => c.shortTitle).join(', ')}.

**Next step:** Go to "Fix Issues" → ${top.shortTitle} and follow the step-by-step guide.`;
    }
    if (issues.length > 0) {
      return `Your security is in ${grade} shape (${score}/100). Your highest priority right now is:

${issues.slice(0, 3).map((c, i) => `${i + 1}. **${c.shortTitle}** — ${c.status === STATUS.UNKNOWN ? 'Status unknown, needs verification' : c.notes || 'Needs attention'}`).join('\n')}

**Next step:** Open the "Fix Issues" tab and start with item #1.`;
    }
    return `Great news — your security score is ${score}/100 (${grade}) with no critical issues. Keep maintaining what you have and consider connecting integrations to automate verification. Your next step is scheduling an annual security review.`;
  }

  if (msg.includes('hipaa') || msg.includes('health')) {
    const hasPHI = profile.sensitiveData?.includes('phi');
    if (hasPHI) {
      return `Since you handle Protected Health Information (PHI), HIPAA applies to your business.

**Your current HIPAA-relevant status:**
- Security Score: ${score}/100

**Key HIPAA Security Rule controls SecurityOS monitors:**
- ✅ Access controls (who can see patient data)
- ✅ Audit logging (tracking who accessed what)
- ✅ Encryption (data at rest and in transit)
- ✅ Employee training
- ✅ Incident response

**What you still need:**
${issues.filter((c) => c.frameworks?.hipaa).map((c) => `- ${c.shortTitle}`).join('\n') || '- You\'re doing well on HIPAA controls!'}

**Important note:** SecurityOS helps you implement HIPAA Security Rule technical safeguards, but you also need a signed Business Associate Agreement (BAA) with any cloud providers who handle PHI.

**Next step:** Ensure Microsoft 365 or Google Workspace has a BAA in place.`;
    } else {
      return `HIPAA applies if you create, receive, maintain, or transmit Protected Health Information (PHI) — basically medical records or health data.

If your business doesn't handle health information, HIPAA doesn't directly apply. However, if you work with healthcare providers as a vendor, you may be a Business Associate and still have HIPAA obligations.

Would you like to update your business profile to reflect whether you handle health data? That way SecurityOS can give you the right guidance.`;
    }
  }

  if (msg.includes('insurance') || msg.includes('cyber insurance')) {
    return `Cyber insurance is becoming essential for small businesses. Here's what to know:

**Why you need it:**
- Average cost of a small business breach: $200,000+
- Ransomware attacks often demand $50,000–$500,000
- Your general liability policy almost certainly doesn't cover cyber events

**What cyber insurance typically covers:**
- Ransomware payments and recovery
- Data breach notification costs
- Legal defense and regulatory fines
- Business interruption losses
- PR/crisis management

**Your current security posture (${score}/100) matters:**
Most insurers ask about MFA, backups, endpoint protection, and patch management — all controls SecurityOS monitors. A higher score often means lower premiums.

**What insurers specifically ask about:**
${['MFA', 'Backups', 'Endpoint Protection', 'Security Training', 'Incident Response'].map((item) => `- ${item}`).join('\n')}

**Next step:** Get quotes from Coalition, Cowbell, or your current insurance broker. Fixing your SecurityOS issues first will help you qualify for better rates.`;
  }

  if (msg.includes('compliance') || msg.includes('compliant')) {
    return `Here's your current compliance status:

**Security Readiness Score: ${score}/100 — ${grade}**

Your score maps to major frameworks like this:
- **NIST CSF 2.0:** ${score >= 75 ? 'Substantially implemented' : score >= 50 ? 'Partially implemented' : 'In early stages'}
- **CIS Controls:** ${Math.round(score * 0.9)}/100 estimated
- **Cyber Insurance baseline:** ${score >= 70 ? '✅ Likely qualifying' : '⚠️ May have gaps'}

${profile.sensitiveData?.includes('phi') ? '- **HIPAA Security Rule:** Needs review of specific PHI safeguards\n' : ''}${profile.sensitiveData?.includes('payment') ? '- **PCI DSS:** Payment card handling requires additional controls\n' : ''}

**The most important thing to understand:**
Compliance is not a binary yes/no. What matters is demonstrating reasonable security practices. Your ${score}/100 score is ${score >= 75 ? 'solid evidence of reasonable care' : 'a starting point — let\'s improve it'}.

**Next step:** ${issues.length > 0 ? `Fix the ${issues.length} open issue${issues.length !== 1 ? 's' : ''} in the "Fix Issues" tab` : 'Generate your Trust Passport to share your security status'}.`;
  }

  if (msg.includes('hack') || msg.includes('breach') || msg.includes('incident')) {
    return `Here's what to do if you think you've been hacked:

**Immediate steps (first 2 hours):**
1. **Isolate affected systems** — disconnect from the internet
2. **Change passwords** — start with email and admin accounts (from a different device)
3. **Enable MFA** — if you haven't already
4. **Preserve evidence** — don't wipe systems before documenting

**Notify within 24 hours:**
- Your IT provider or MSP
- Your cyber insurance carrier (call immediately — they have response teams)
- Legal counsel

**Within 72 hours:**
- Determine what data was accessed
- Check if notification requirements apply (HIPAA: 60 days, most states: 30–72 hours)

**Your incident response plan:**
${scoring.allControls.find((c) => c.id === 'CTRL-ORG-002')?.status === STATUS.PASS
  ? '✅ You have an incident response plan — pull it up now.'
  : '⚠️ You don\'t have a documented incident response plan. Create one in the Fix Issues tab before an incident happens.'}

**Next step:** If this is happening right now, call your cyber insurance carrier immediately. If you're preparing, build your incident response plan now.`;
  }

  if (msg.includes('password') || msg.includes('passphrase')) {
    return `Great password practices make a huge difference. Here's what works:

**The rules that actually matter:**
1. **Long over complex** — a 16-character passphrase beats "P@ssw0rd!" every time
2. **Unique per account** — reused passwords are the #1 cause of credential attacks
3. **Use a password manager** — this solves the memory problem entirely

**Password managers for small businesses:**
- **1Password Teams** — $4/user/month, excellent for sharing
- **Bitwarden** — open source, very affordable
- **Keeper** — good enterprise features

**What to do with your team:**
1. Choose a business password manager and purchase licenses
2. Require all employees to install it
3. Require unique passwords for all business accounts
4. Disable old "change every 90 days" policies — they cause weaker passwords

**In your email admin console:**
- Block common passwords (Microsoft 365 and Google Workspace do this automatically)
- Enable a minimum length of 12 characters

**Next step:** Start a 1Password or Bitwarden trial and set it up for yourself first.`;
  }

  if (msg.includes('share') || msg.includes('client') || msg.includes('vendor') || msg.includes('passport')) {
    return `Your Trust Passport is SecurityOS's way to prove your security to clients, vendors, and partners.

**What it shows:**
- Your Security Readiness Score (${score}/100)
- Which controls you have in place
- When it was last verified
- Your business name and profile

**When to share it:**
- When a client asks "do you take security seriously?"
- When completing a vendor security questionnaire
- When applying for cyber insurance
- When a partner enterprise runs a vendor risk assessment
- On your website to build trust with prospects

**How to generate it:**
Click "Trust Passport" in the navigation. You can download it as a PDF or share a link.

**At a ${score}/100 score:**
${score >= 80 ? 'Your score is strong — this is a real competitive advantage. Share it confidently.' : score >= 60 ? 'Your score shows genuine effort. Consider fixing a few issues first to strengthen it further.' : 'Focus on resolving open issues before sharing broadly. A higher score is more compelling.'}

**Next step:** Navigate to "Trust Passport" to preview and download your certificate.`;
  }

  // Default response
  return `Your SecurityOS Security Readiness Score is currently **${score}/100** — **${grade}**.

${issues.length > 0
    ? `You have **${issues.length} open issue${issues.length !== 1 ? 's' : ''}** to address:
${issues.slice(0, 5).map((c) => `- ${c.shortTitle} (${c.severity})`).join('\n')}
${issues.length > 5 ? `...and ${issues.length - 5} more` : ''}

Fixing these would bring your score to approximately ${Math.min(100, score + Math.round((issues.length / 25) * 40))}/100.`
    : 'All your controls are passing. Excellent security posture!'}

Feel free to ask me anything — about your specific issues, how to fix something, compliance questions, or what to do in a security incident. I'm here to help.

**Next step:** ${issues.length > 0 ? 'Open "Fix Issues" and start with the highest-severity item.' : 'Check out your Trust Passport — you\'ve earned it.'}`;
}

export default function AICopilotView() {
  const { profile, scoring } = useApp();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your SecurityOS AI Copilot. I know your business profile and security status inside and out.

Your current Security Readiness Score is **${scoring.totalScore}/100** — ${scoreToGrade(scoring.totalScore)}.

Ask me anything: what to fix first, how to handle a specific threat, compliance questions, or how to share proof of your security with clients.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text) {
    const userMsg = text || input.trim();
    if (!userMsg) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

    const reply = generateLocalResponse(userMsg, profile, scoring);
    setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Bot size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">AI Security Copilot</h1>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Online
            </p>
          </div>
          <div className="ml-auto">
            <span className="text-xs bg-indigo-600/20 text-indigo-400 px-2 py-1 rounded-full font-medium">
              Score: {scoring.totalScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <Bot size={15} className="text-indigo-400" />
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <Sparkles size={11} /> Suggested questions
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 border-t border-slate-800 pt-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your security…"
            rows={1}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">
          Responses are context-aware and based on your security profile.
        </p>
      </div>
    </div>
  );
}
