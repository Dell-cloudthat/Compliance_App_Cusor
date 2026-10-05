import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../SecurityOSApp';
import { toGrade } from '../../data/scoring';
import { respond } from '../../data/copilot';
import { Bot, Send, Sparkles, User } from 'lucide-react';

const SUGGESTED = [
  "What's the most important thing to fix?",
  "Tell me about NIST AI RMF",
  "Am I HIPAA compliant?",
  "How do I set up MFA?",
  "Do I need cyber insurance?",
  "What happens if I get hacked?",
  "Are my AI tools safe to use?",
  "Can I share my security status with clients?",
];

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
  const { profile, scoring, copilotInitialPrompt, clearCopilotPrompt } = useApp();
  const [msgs, setMsgs] = useState([{
    role: 'assistant',
    content: `Hi! I'm your AI Security Copilot. I know your business and your current security score (${scoring.totalScore}/100 — ${toGrade(scoring.totalScore)}).

Ask me about fixing specific issues, NIST AI RMF, HIPAA compliance, cyber insurance, or anything else security-related.`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const initialFired = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Auto-fire initial prompt when navigating here from FixView
  useEffect(() => {
    if (copilotInitialPrompt && !initialFired.current) {
      initialFired.current = true;
      clearCopilotPrompt();
      send(copilotInitialPrompt);
    }
  }, [copilotInitialPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text) {
    const q = (text || input).trim();
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
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Online · Score {scoring.totalScore}/100 · AI RMF ready
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
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <Sparkles size={10} /> Suggested
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
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
            placeholder="Ask about your security…"
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
