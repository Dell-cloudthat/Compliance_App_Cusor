/**
 * AI Controls Assistant — floating chat panel.
 *
 * Sends the user's question plus a compact snapshot of their live controls
 * to /api/assistant/chat. Answers are grounded in real control status, so
 * the assistant can say "AC-002 is already Implemented but AC-003 is Partial".
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare, X, Send, Sparkles, Loader2, Bot, User, ExternalLink,
} from 'lucide-react';
import { useCompliance } from '../context/ComplianceContext';
import api from '../services/api';

const SUGGESTED = [
  'What are my most critical gaps right now?',
  'Which controls cover remote employee access?',
  'What do I need for SOC 2 evidence collection?',
  'Which AI security controls should I implement first?',
];

function renderMarkdownLite(text) {
  // bold + line breaks only — keep it dependency-free
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

export default function AssistantPanel() {
  const ctx = useCompliance();
  const controls = ctx?.controls || [];
  const handleNavigateControl = ctx?.handleNavigateControl;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open && llmEnabled === null) {
      api.assistantStatus()
        .then(s => setLlmEnabled(!!s.llm_enabled))
        .catch(() => setLlmEnabled(false));
    }
  }, [open, llmEnabled]);

  const gapSummary = useMemo(() => {
    const isGap = c => ['Not Implemented', 'Non-Compliant', 'Partial'].includes(c.status);
    const gaps = controls.filter(isGap);
    return {
      total_controls: controls.length,
      open_gaps: gaps.length,
      critical: gaps.filter(c => c.priority === 'HIGH' && c.status !== 'Partial').length,
      partial: controls.filter(c => c.status === 'Partial').length,
      implemented: controls.filter(c => ['Implemented', 'Compliant'].includes(c.status)).length,
    };
  }, [controls]);

  const compactControls = useMemo(
    () => controls.map(c => ({
      id: c.id,
      control_name: c.control_name || '',
      description: (c.description || '').slice(0, 240),
      category: c.category || '',
      priority: c.priority || '',
      status: c.status || '',
      frameworks: (c.frameworks || []).slice(0, 4),
      responsible_party: c.responsible_party || null,
    })),
    [controls]
  );

  const send = useCallback(async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setSending(true);
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const resp = await api.assistantChat({
        message,
        history,
        controls: compactControls,
        gap_summary: gapSummary,
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: resp.answer,
        matched: resp.matched_controls || [],
        mode: resp.mode,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry — I couldn't reach the assistant service. ${e?.message || ''}`,
        matched: [],
      }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, compactControls, gapSummary]);

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
          title="AI Controls Assistant"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">Ask AI</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-4rem)] bg-card border border-[hsl(var(--border))] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-muted/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">Controls Assistant</div>
              <div className="text-[11px] text-muted-foreground">
                {llmEnabled === null ? 'Checking…' :
                 llmEnabled ? 'AI mode · grounded in your live controls' :
                 'Retrieval mode · set GROQ_API_KEY for full AI'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Ask about your controls, gaps, or what to remediate next.
                  Answers are grounded in your {controls.length} live controls.
                </div>
                <div className="space-y-1.5">
                  {SUGGESTED.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-muted/20 text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 text-foreground border border-[hsl(var(--border))]'
                }`}>
                  {renderMarkdownLite(m.content)}
                  {m.matched?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[hsl(var(--border))] flex flex-wrap gap-1">
                      {m.matched.slice(0, 6).map(mc => (
                        <button
                          key={mc.id}
                          type="button"
                          onClick={() => handleNavigateControl && handleNavigateControl(mc.id, 'controls')}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors hover:border-primary/50 ${
                            ['Not Implemented', 'Non-Compliant'].includes(mc.status)
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : mc.status === 'Partial'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          }`}
                          title={`${mc.control_name} — ${mc.status}`}
                        >
                          {mc.id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-xl px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[hsl(var(--border))]">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Ask about controls, gaps, frameworks…"
                className="flex-1 resize-none px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={sending || !input.trim()}
                className="p-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
