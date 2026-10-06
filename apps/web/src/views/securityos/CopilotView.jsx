/**
 * CopilotView — Security Copilot (Fix-Oriented)
 *
 * The Copilot operates against the organization's open fixes, evidence,
 * controls, and remediation roadmap. It behaves like a security engineer's
 * assistant, not a generic cybersecurity chatbot.
 *
 * Customer context is always injected so the Copilot knows exactly:
 *   - Current Security Readiness
 *   - Open critical/high/medium fixes
 *   - Primary framework
 *   - Connected integrations
 */
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../SecurityOSApp';
import { toGrade } from '../../data/scoring';
import { respond, recommendRoadmap, buildContext } from '../../data/copilot';
import {
  Bot, Send, Sparkles, User, ChevronDown, ChevronUp,
  Shield, AlertTriangle, Target, Zap,
} from 'lucide-react';

function Msg({ m }) {
  const isUser = m.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
        isUser ? 'bg-indigo-600' : 'bg-slate-700'
      }`}>
        {isUser ? <User size={13} /> : <Bot size={13} className="text-indigo-400" />}
      </div>
      <div className={`max-w-[84%] text-sm leading-relaxed rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-slate-800 text-slate-200 rounded-tl-sm'
      }`}>
        {m.content.split('\n').map((line, i) => {
          const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return <p key={i} className={line === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: bold }} />;
        })}
      </div>
    </div>
  );
}

function ContextPanel({ scoring, profile }) {
  const [open, setOpen] = useState(false);
  const { issues } = scoring;
  const crit = issues.filter(c => c.severity === 'critical').length;
  const high = issues.filter(c => c.severity === 'high').length;
  const med  = issues.filter(c => c.severity === 'medium').length;

  return (
    <div className="mx-4 mb-2 rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-indigo-600/20 flex items-center justify-center">
            <Shield size={11} className="text-indigo-400" />
          </div>
          <p className="text-xs font-semibold text-white">
            {profile.businessName || 'Customer'} · {scoring.totalScore}/100
          </p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            crit > 0 ? 'bg-red-500/15 text-red-400' :
            high > 0 ? 'bg-orange-500/15 text-orange-400' :
            'bg-green-500/15 text-green-400'
          }`}>
            {issues.length} open
          </span>
        </div>
        {open
          ? <ChevronUp size={13} className="text-slate-500" />
          : <ChevronDown size={13} className="text-slate-500" />
        }
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-slate-700/50">
          <div className="grid grid-cols-4 gap-1.5 mt-2.5">
            {[
              { label: 'Score',    value: `${scoring.totalScore}`,  color: 'text-white' },
              { label: 'Critical', value: crit, color: crit > 0 ? 'text-red-400' : 'text-green-400' },
              { label: 'High',     value: high, color: high > 0 ? 'text-orange-400' : 'text-green-400' },
              { label: 'Medium',   value: med,  color: med  > 0 ? 'text-yellow-400' : 'text-slate-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900/60 rounded-lg p-2 text-center">
                <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-[9px] text-slate-600">{label}</p>
              </div>
            ))}
          </div>
          {issues.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[10px] text-slate-500 mb-1.5 font-medium">Top open fixes</p>
              <div className="space-y-1">
                {issues.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <AlertTriangle size={9} className={
                      c.severity === 'critical' ? 'text-red-400' :
                      c.severity === 'high'     ? 'text-orange-400' : 'text-yellow-400'
                    } />
                    <span className="text-slate-400 truncate">{c.short_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CopilotView() {
  const { profile, scoring, copilotInitialPrompt, clearCopilotPrompt, setView } = useApp();
  const { issues } = scoring;
  const grade = toGrade(scoring.totalScore);

  // Dynamic suggested questions based on actual open issues
  const SUGGESTED = [
    issues.length > 0
      ? `What should we work on first?`
      : `How do we maintain our current security posture?`,
    issues.filter(c => c.severity === 'critical').length > 0
      ? `Walk me through fixing the critical issues`
      : `What's the highest-impact fix available?`,
    `Build me a fix roadmap for this week`,
    `Explain the framework requirements for our open issues`,
    `What would bring our score above 90?`,
    `Are there any compliance gaps I should know about?`,
    issues.find(c => c.category === 'identity')
      ? `How do I fix the identity issues?`
      : `What integrations would improve our evidence confidence?`,
  ];

  const [msgs, setMsgs] = useState([{
    role: 'assistant',
    content: `I'm your AI Security Copilot — I know ${profile.businessName || 'your organization'}'s current environment.\n\n**Current status:** ${scoring.totalScore}/100 — ${grade}${issues.length > 0 ? `\n**Open fixes:** ${issues.length} (${issues.filter(c => c.severity === 'critical').length} critical, ${issues.filter(c => c.severity === 'high').length} high)` : '\n**Status:** All controls passing!'}\n\nAsk me about specific fixes, how to build a remediation plan, framework requirements, or anything about your security environment.`,
  }]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const initialFired = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    if (copilotInitialPrompt && !initialFired.current) {
      initialFired.current = true;
      clearCopilotPrompt();
      send(copilotInitialPrompt);
    }
  }, [copilotInitialPrompt]); // eslint-disable-line

  async function send(text) {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 450 + Math.random() * 500));

    // Route roadmap requests to the roadmap recommender
    const lower = q.toLowerCase();
    let answer;
    if (
      lower.includes('roadmap') ||
      lower.includes('work on this week') ||
      lower.includes('prioritize') ||
      lower.includes('what should we') ||
      lower.includes('fix first')
    ) {
      answer = recommendRoadmap(profile, scoring);
    } else {
      answer = respond(q, profile, scoring);
    }

    setMsgs(prev => [...prev, { role: 'assistant', content: answer }]);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
            <Bot size={17} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-sm">Security Copilot</h1>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Online · {scoring.totalScore}/100 · {issues.length} open fix{issues.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <button
            onClick={() => setView('roadmap')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-400 text-xs font-medium hover:bg-indigo-600/25 transition-colors"
          >
            <Target size={11} /> Roadmap
          </button>
        </div>
      </div>

      {/* Customer context panel */}
      <div className="pt-2">
        <ContextPanel scoring={scoring} profile={profile} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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

      {/* Suggested questions */}
      {msgs.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-slate-500 mb-2 flex items-center gap-1 uppercase tracking-wider">
            <Sparkles size={9} /> Suggested for your environment
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors text-left"
              >
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
            placeholder="Ask about your security environment…"
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center shrink-0 transition-colors"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
