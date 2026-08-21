/**
 * AdminView — platform-operator dashboard.
 *
 * Self-contained: fetches its own data, owns its own state. Not part of
 * the shared ComplianceContext, since nothing here is customer-tenant data
 * — it's operator-only visibility into the early-access waitlist and the
 * AI assistant's question log (see docs/STATE_ARCHITECTURE.md).
 *
 * Access is enforced server-side (PLATFORM_ADMIN_EMAILS) — this view is
 * only ever mounted when currentUser.isPlatformAdmin is true, but every
 * API call it makes is independently gated by require_platform_admin.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Mail, TrendingUp, Send, XCircle, Loader2, RefreshCw,
  MessageSquare, AlertTriangle, CheckCircle2, Copy, Check, BarChart3,
} from 'lucide-react';
import api from '../services/api';

const STATUS_BADGE = {
  pending:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
  invited:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  converted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  declined:  'bg-red-500/10 text-red-400 border-red-500/20',
};

function StatCard({ label, value, icon: Icon, color = 'text-foreground' }) {
  return (
    <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1.5 rounded-md hover:bg-muted transition-colors"
      title="Copy invite link"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function WaitlistTab() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [lastInviteLink, setLastInviteLink] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, statsRes] = await Promise.all([
        api.waitlistList(filter === 'ALL' ? undefined : filter),
        api.waitlistStats(),
      ]);
      setRows(list);
      setStats(statsRes);
    } catch (e) {
      setError(e.message || 'Failed to load waitlist.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (id) => {
    setBusyId(id);
    try {
      const res = await api.waitlistInvite(id);
      setLastInviteLink({ id, link: res.invite_link, emailed: res.emailed });
      await load();
    } catch (e) {
      alert(e.message || 'Failed to send invite.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (id) => {
    if (!confirm('Decline this signup?')) return;
    setBusyId(id);
    try {
      await api.waitlistDecline(id);
      await load();
    } catch (e) {
      alert(e.message || 'Failed to decline.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <StatCard label="Total signups" value={stats?.total ?? '—'} icon={Users} />
          <StatCard label="Pending" value={stats?.by_status?.pending ?? 0} icon={Mail} color="text-slate-400" />
          <StatCard label="Invited" value={stats?.by_status?.invited ?? 0} icon={Send} color="text-blue-400" />
          <StatCard label="Converted" value={stats?.by_status?.converted ?? 0} icon={CheckCircle2} color="text-emerald-500" />
        </div>
        <button
          type="button"
          onClick={load}
          className="ml-4 p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2">
        {['ALL', 'pending', 'invited', 'converted', 'declined'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              filter === s
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-muted/20 border-[hsl(var(--border))] text-muted-foreground hover:border-primary/30'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {lastInviteLink && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-blue-400 font-medium">
              {lastInviteLink.emailed ? 'Invite emailed automatically.' : 'Invite link ready — copy and send it manually (SMTP not configured).'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{lastInviteLink.link}</p>
          </div>
          <CopyButton text={lastInviteLink.link} />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="bg-card border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-muted/20 text-left">
              <th className="py-3 px-4 font-semibold text-foreground">Name / Email</th>
              <th className="py-3 px-4 font-semibold text-foreground">Company</th>
              <th className="py-3 px-4 font-semibold text-foreground">Frameworks</th>
              <th className="py-3 px-4 font-semibold text-foreground">Status</th>
              <th className="py-3 px-4 font-semibold text-foreground">Requested</th>
              <th className="py-3 px-4 font-semibold text-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              let frameworks = [];
              try { frameworks = JSON.parse(r.frameworks_interested || '[]'); } catch { /* noop */ }
              return (
                <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-muted/10">
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                    {r.use_case && <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate" title={r.use_case}>{r.use_case}</div>}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {r.company || '—'}
                    {r.role_title && <div className="text-xs">{r.role_title}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {frameworks.slice(0, 3).map((fw) => (
                        <span key={fw} className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">{fw}</span>
                      ))}
                      {frameworks.length > 3 && <span className="text-[10px] text-muted-foreground">+{frameworks.length - 3}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[r.status] || STATUS_BADGE.pending}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => handleInvite(r.id)}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {busyId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Invite
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => handleDecline(r.id)}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-muted/40 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {r.status === 'invited' && (
                      <button
                        type="button"
                        onClick={() => handleInvite(r.id)}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted/40 text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Resend
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No signups {filter !== 'ALL' ? `with status "${filter}"` : 'yet'}.
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantAnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.assistantAnalytics());
    } catch (e) {
      setError(e.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (error) {
    return <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>;
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total questions" value={data.total_questions} icon={MessageSquare} />
        <StatCard label="LLM-answered" value={data.mode_split?.llm ?? 0} color="text-emerald-500" icon={CheckCircle2} />
        <StatCard label="Retrieval-only" value={data.mode_split?.retrieval ?? 0} color="text-blue-400" icon={BarChart3} />
        <StatCard label="No-match rate" value={`${Math.round((data.no_match_rate || 0) * 100)}%`} color={data.no_match_rate > 0.2 ? 'text-red-400' : 'text-foreground'} icon={AlertTriangle} />
      </div>

      <div className="bg-card border border-amber-500/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Unanswered questions — highest-signal FAQ gaps
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          These got zero control matches. Use them to add domain synonyms, expand control
          descriptions, or improve MCP tool coverage.
        </p>
        {data.no_match_questions?.length ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {data.no_match_questions.map((q, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-muted/20 rounded-lg px-3 py-2 text-sm">
                <span className="text-foreground">{q.question}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(q.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No unanswered questions yet — nice.</p>
        )}
      </div>

      <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Most frequent questions</h3>
        <div className="space-y-2">
          {data.most_frequent_questions?.map((q, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground truncate">{q.q}</span>
              <span className="text-xs font-semibold text-primary shrink-0">×{q.n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent activity</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {data.recent_questions?.map((q, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm border-b border-[hsl(var(--border))] pb-2 last:border-0">
              <span className="text-foreground truncate flex-1">{q.question}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${q.match_count > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {q.match_count} match{q.match_count === 1 ? '' : 'es'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminView() {
  const [tab, setTab] = useState('waitlist');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-[hsl(var(--border))]">
        {[
          { key: 'waitlist', label: 'Early-Access Waitlist', icon: Users },
          { key: 'assistant', label: 'Assistant FAQ Analytics', icon: MessageSquare },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'waitlist' ? <WaitlistTab /> : <AssistantAnalyticsTab />}
    </div>
  );
}
