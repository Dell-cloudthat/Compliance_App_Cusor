/**
 * ActionItemsView — all action items assigned from the Responsibility
 * Matrix (or elsewhere), with status management and a full audit trail
 * showing who changed what and when.
 *
 * Self-contained: fetches its own data, owns its own state, no
 * useCompliance() dependency (see docs/STATE_ARCHITECTURE.md).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Ticket, Filter, Loader2, RefreshCw, Mail, Clock, AlertTriangle,
  CheckCircle2, Circle, PlayCircle, XCircle, ChevronDown, ChevronRight,
  History, Send,
} from 'lucide-react';
import api from '../services/api';

const STATUS_META = {
  open:        { label: 'Open',        icon: Circle,       color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  in_progress: { label: 'In Progress', icon: PlayCircle,    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  done:        { label: 'Done',        icon: CheckCircle2,  color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  cancelled:   { label: 'Cancelled',   icon: XCircle,       color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const PRIORITY_META = {
  low:      'bg-slate-500/10 text-slate-400 border-slate-500/20',
  medium:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high:     'bg-amber-500/10 text-amber-500 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function ActionItemRow({ item, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const StatusIcon = STATUS_META[item.status]?.icon || Circle;

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    try {
      setDetail(await api.getActionItem(item.id));
    } catch (e) {
      console.error('Failed to load action item detail:', e);
    } finally {
      setLoadingDetail(false);
    }
  }, [item.id]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) loadDetail();
  };

  const changeStatus = async (e) => {
    e.stopPropagation();
    const nextStatus = {
      open: 'in_progress', in_progress: 'done', done: 'open', cancelled: 'open',
    }[item.status];
    setBusy(true);
    try {
      const updated = await api.updateActionItem(item.id, { status: nextStatus });
      onUpdated(updated);
      if (expanded) await loadDetail();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await api.resendActionItemEmail(item.id);
      alert(res.emailed ? 'Email resent.' : 'SMTP not configured — nothing was sent.');
      await loadDetail();
    } catch (err) {
      alert(err.message || 'Failed to resend email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left cursor-pointer"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        <span className="text-xs font-mono text-muted-foreground shrink-0 w-24">{item.ticket_ref}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
          <div className="text-xs text-muted-foreground">
            {item.control_id ? `${item.control_id} · ` : ''}
            {item.assigned_team || 'Unassigned'}
            {item.due_date ? ` · Due ${item.due_date}` : ''}
          </div>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${PRIORITY_META[item.priority]}`}>
          {item.priority}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={changeStatus}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border shrink-0 transition-colors hover:opacity-80 disabled:opacity-50 ${STATUS_META[item.status]?.color}`}
          title="Click to advance status"
        >
          <StatusIcon className="w-3 h-3" />
          {STATUS_META[item.status]?.label}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[hsl(var(--border))] bg-muted/10 px-4 py-4 space-y-4">
          {loadingDetail ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : detail ? (
            <>
              {detail.description && (
                <p className="text-sm text-muted-foreground">{detail.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {detail.assigned_email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {detail.assigned_email}
                    {detail.email_sent ? (
                      <span className="text-emerald-500">· sent {detail.email_sent_at ? new Date(detail.email_sent_at).toLocaleString() : ''}</span>
                    ) : (
                      <span className="text-amber-500">· not sent</span>
                    )}
                  </span>
                )}
                {detail.assigned_email && (
                  <button
                    type="button"
                    onClick={resend}
                    disabled={busy}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Send className="w-3 h-3" /> Resend
                  </button>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  <History className="w-3.5 h-3.5" />
                  Activity — who changed what, and when
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(detail.audit_log || []).map((a) => (
                    <div key={a.id} className="flex items-start gap-2 text-xs bg-card border border-[hsl(var(--border))] rounded-lg px-3 py-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-foreground">
                          <span className="font-medium">{a.user_email}</span>{' '}
                          {a.action === 'created' && 'created this action item'}
                          {a.action === 'status_changed' && <>changed status <span className="font-mono">{a.old_value} → {a.new_value}</span></>}
                          {a.action === 'assigned' && <>updated {a.field_changed} <span className="font-mono">{a.old_value || '—'} → {a.new_value}</span></>}
                          {a.action === 'updated' && <>updated {a.field_changed}</>}
                          {a.action === 'email_sent' && 'sent an email notification'}
                          {a.action === 'email_failed' && 'attempted to send an email (not delivered)'}
                        </div>
                        {a.notes && <div className="text-muted-foreground mt-0.5">{a.notes}</div>}
                        <div className="text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function ActionItemsView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await api.listActionItems(statusFilter === 'ALL' ? {} : { status: statusFilter }));
    } catch (e) {
      setError(e.message || 'Failed to load action items.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpdated = (updated) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
  };

  const counts = items.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Action Items</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Remediation work assigned to teams from the Responsibility Matrix — each has a ticket
            reference, an optional email trail outside the platform, and a full audit history.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2">
        {['ALL', 'open', 'in_progress', 'done', 'cancelled'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-muted/20 border-[hsl(var(--border))] text-muted-foreground hover:border-primary/30'
            }`}
          >
            {s === 'ALL' ? 'All' : STATUS_META[s]?.label}
            {s !== 'ALL' && counts[s] ? <span className="opacity-70">({counts[s]})</span> : null}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ActionItemRow key={item.id} item={item} onUpdated={handleUpdated} />
          ))}
          {items.length === 0 && !loading && (
            <div className="text-center py-16 bg-card border border-dashed border-[hsl(var(--border))] rounded-xl">
              <Ticket className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground mb-1">No action items yet</h3>
              <p className="text-xs text-muted-foreground">
                Assign one from a control in the Responsibility Matrix to get started.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
