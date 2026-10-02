import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../SecurityOSApp';
import { STATUS } from '../../data/controls';
import { toGrade } from '../../data/scoring';
import { Bot, Send, Sparkles, User } from 'lucide-react';

const SUGGESTED = [
  "What's the most important thing to fix?",
  "Am I HIPAA compliant?",
  "How do I set up MFA?",
  "Do I need cyber insurance?",
  "What happens if I get hacked?",
  "Can I share my security status with clients?",
];

function respond(msg, profile, scoring) {
  const m = msg.toLowerCase();
  const score = scoring.totalScore;
  const grade = toGrade(score);
  const issues = scoring.issues;
  const critical = issues.filter(c => c.severity === 'critical' && c.status === STATUS.FAIL);

  if (m.includes('mfa') || m.includes('multi-factor') || m.includes('two-factor') || m.includes('2fa')) {
    const provider = profile.emailProvider || 'your email provider';
    return `MFA is the single most effective security control — it blocks 99% of automated account attacks.

**Setting it up for ${provider.includes('Microsoft') ? 'Microsoft 365' : provider.includes('Google') ? 'Google Workspace' : 'your platform'}:**

${provider.includes('Microsoft') || !provider ? `1. Go to admin.microsoft.com
2. Security → Multi-Factor Authentication
3. Select all users → Enable
4. Set to "Enforced" after 48 hours (gives employees time to set up)
5. Employees download Microsoft Authenticator and scan the QR code` : `1. Go to admin.google.com
2. Security → 2-Step Verification
3. Set enforcement to "On" for all users
4. Allow a grace period of a few days
5. Employees will be prompted to set up on next login`}

**Once enabled, verify it's working:** Sign in to a test account and confirm the second-step prompt appears.

This takes about 30 minutes. After that, your biggest single vulnerability is closed.`;
  }

  if (m.includes('most important') || m.includes('priority') || m.includes('first') || m.includes('start')) {
    if (critical.length > 0) {
      const top = critical[0];
      return `Your #1 priority right now: **${top.name}**

This is marked Critical because: ${top.customer_impact}

**How to fix it:**
${(top.remediation_steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

After that: ${issues.slice(1, 4).map(c => c.short_name).join(', ')}.

Tap "Fix it" next to ${top.short_name} on the home screen for the full step-by-step guide.`;
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
    const hasPHI = profile.sensitiveData?.includes('phi');
    if (hasPHI) {
      return `Since you handle Protected Health Information, HIPAA's Security Rule applies to your business.

**Your current HIPAA-relevant status (score: ${score}/100):**

HIPAA's Security Rule maps directly to SecurityOS controls. The most important ones for you:

- ✅/❌ MFA — required under Access Controls (164.312(d))
- ✅/❌ Device Encryption — required under Encryption (164.312(a)(2)(iv))
- ✅/❌ Audit Logging — required (164.312(b))
- ✅/❌ User Access Review — required (164.308(a)(3))
- ✅/❌ Security Training — required (164.308(a)(5))
- ✅/❌ Incident Response Plan — required (164.308(a)(6))
- ✅/❌ Security Policy — required (164.308(a)(1))

**Important:** You also need a signed Business Associate Agreement (BAA) with any cloud provider that handles PHI — Microsoft 365, Google Workspace, Dropbox, etc. Check that you have this in place.

Fix your open SecurityOS issues and you'll satisfy the core technical safeguards.`;
    }
    return `HIPAA applies to businesses that create, receive, maintain, or transmit Protected Health Information (PHI) — medical records, treatment info, health insurance data.

If you've selected "Health / Medical Records" in your business profile, SecurityOS will automatically track HIPAA Security Rule controls.

Does your business handle patient data or health records? Update your profile in Settings if so.`;
  }

  if (m.includes('insurance') || m.includes('cyber insurance')) {
    return `Cyber insurance is increasingly essential for small businesses.

**What it covers:**
- Ransomware payments and recovery costs
- Data breach notification expenses
- Legal defense and regulatory fines
- Business interruption losses
- Crisis management

**Average cost:** $1,000–$3,000/year for a small business

**Your score matters:** Insurers ask specifically about:
- ✅ MFA (required by most carriers)
- ✅ Backups (required)
- ✅ Endpoint protection (required)
- ✅ Security training
- ✅ Incident response plan

Your current score of **${score}/100** ${score >= 70 ? 'should qualify you for most policies' : 'may result in higher premiums or exclusions — fix the open issues first'}.

**Where to get quotes:** Coalition (coalition.com), Cowbell, At-Bay, or ask your current broker.`;
  }

  if (m.includes('hacked') || m.includes('breach') || m.includes('incident') || m.includes('ransomware')) {
    return `If you think you've been hacked, here's what to do right now:

**First 2 hours:**
1. **Isolate affected systems** — disconnect from the internet and network
2. **Change passwords** — start with email and admin accounts (use a different, clean device)
3. **Call your cyber insurance carrier** — they have 24/7 incident response teams
4. **Preserve evidence** — don't wipe or restart systems yet

**Within 24 hours:**
- Notify your IT provider or MSP
- Contact legal counsel
- Begin documenting the timeline

**Within 72 hours:**
- Determine what data was accessed
- Check notification requirements:
  - HIPAA: notify within 60 days
  - Most US states: 30–72 hours
  - EU/GDPR: 72 hours

**Your incident response plan:** ${
  scoring.allControls.find(c => c.id === 'CTRL-ORG-002')?.status === STATUS.PASS
    ? '✅ You have one — pull it up now.'
    : '⚠️ You don\'t have one yet. Go to the Fix Issues screen and create it before an incident happens.'
  }`;
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

**Your current score of ${score}/100 is ${score >= 80 ? 'strong — share it confidently' : score >= 65 ? 'decent — consider fixing a few issues first' : 'improving — fix the critical issues before sharing broadly'}.

Go to the Passport tab in the bottom navigation to view and share yours.`;
  }

  // Default
  return `Your Security Readiness Score is **${score}/100** — ${grade}.

${issues.length > 0
    ? `You have **${issues.length} issue${issues.length > 1 ? 's' : ''}** to address:\n${
        issues.slice(0, 4).map(c => `- **${c.short_name}:** ${c.customerMessage}`).join('\n')
      }${issues.length > 4 ? `\n...and ${issues.length - 4} more` : ''}\n\nFixing these would bring your score to approximately ${Math.min(100, score + Math.round(issues.length * 3))}/100.`
    : 'All controls are passing — excellent security posture!'
  }

Ask me anything: how to fix a specific issue, what compliance frameworks apply to you, cyber insurance, incident response, or how to share your security status with clients.`;
}

function Msg({ m }) {
  const isUser = m.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${isUser ? 'bg-indigo-600' : 'bg-slate-700'}`}>
        {isUser ? <User size={13} /> : <Bot size={13} className="text-indigo-400" />}
      </div>
      <div className={`max-w-[82%] text-sm leading-relaxed rounded-2xl px-4 py-3 ${
        isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'
      }`}>
        {m.content.split('\n').map((line, i) => {
          const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return <p key={i} className={line === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: bold }} />;
        })}
      </div>
    </div>
  );
}

export default function CopilotView() {
  const { profile, scoring } = useApp();
  const [msgs, setMsgs] = useState([{
    role: 'assistant',
    content: `Hi! I'm your AI Security Copilot. I know your business and your current security score (${scoring.totalScore}/100 — ${toGrade(scoring.totalScore)}).

Ask me anything about your security.`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send(text) {
    const q = text || input.trim();
    if (!q) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 500 + Math.random() * 600));
    setMsgs(prev => [...prev, { role: 'assistant', content: respond(q, profile, scoring) }]);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Bot size={17} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">AI Security Copilot</h1>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Online · Score {scoring.totalScore}/100
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {msgs.map((m, i) => <Msg key={i} m={m} />)}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-700 shrink-0 flex items-center justify-center">
              <Bot size={13} className="text-indigo-400" />
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 150, 300].map(d => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {msgs.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Sparkles size={10} /> Suggested</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.map(q => (
              <button key={q} onClick={() => send(q)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-5 pt-2 border-t border-slate-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about your security…"
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center shrink-0 transition-colors">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
