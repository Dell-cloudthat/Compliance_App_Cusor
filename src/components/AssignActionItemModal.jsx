/**
 * AssignActionItemModal
 *
 * Opened from the Responsibility Matrix (or anywhere a control is in
 * view) to assign remediation work to a team. Creates a ticket
 * (ticket_ref) on submit, optionally emails the assignee so they have a
 * record of the work outside the platform too, and shows the result —
 * including a copyable summary as a fallback when SMTP isn't configured.
 *
 * Self-contained: owns its own form state, calls the API directly. Does
 * not depend on ComplianceContext — pass the control in as a prop.
 */

import { useState } from 'react';
import {
  X, Send, Loader2, CheckCircle2, AlertTriangle, Copy, Check, Ticket,
} from 'lucide-react';
import api from '../services/api';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-slate-400' },
  { value: 'medium', label: 'Medium', color: 'text-blue-400' },
  { value: 'high', label: 'High', color: 'text-amber-500' },
  { value: 'critical', label: 'Critical', color: 'text-red-500' },
];

export default function AssignActionItemModal({ control, teamOptions = [], onClose, onCreated }) {
  const [form, setForm] = useState({
    title: control ? `Remediate ${control.id}: ${control.control_name || ''}` : '',
    description: control?.description || '',
    assigned_team: control?.responsible_party || '',
    assigned_email: '',
    priority: 'medium',
    due_date: '',
    send_email: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        control_id: control?.id || null,
        control_name: control?.control_name || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        assigned_team: form.assigned_team.trim() || null,
        assigned_email: form.assigned_email.trim() || null,
        priority: form.priority,
        due_date: form.due_date || null,
        send_email: form.send_email,
      };
      const created = await api.createActionItem(payload);
      setResult(created);
      onCreated?.(created);
    } catch (err) {
      setError(err.message || 'Failed to create action item.');
    } finally {
      setLoading(false);
    }
  };

  const copySummary = () => {
    if (!result) return;
    const summary = [
      `Ticket: ${result.ticket_ref}`,
      `Title: ${result.title}`,
      control ? `Control: ${control.id} — ${control.control_name}` : null,
      `Priority: ${result.priority.toUpperCase()}`,
      result.due_date ? `Due: ${result.due_date}` : null,
      result.description ? `\n${result.description}` : null,
      `\nAssigned by: ${result.created_by_email}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-[hsl(var(--border))] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              {result ? 'Action Item Created' : 'Assign Action Item'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-500">
                  Ticket {result.ticket_ref} created and assigned{result.assigned_team ? ` to ${result.assigned_team}` : ''}.
                </p>
                {result.assigned_email && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.emailed
                      ? `Notification emailed to ${result.assigned_email}.`
                      : `Email not sent (SMTP not configured) — copy the summary below and send it manually.`}
                  </p>
                )}
              </div>
            </div>

            {!result.emailed && result.assigned_email && (
              <div className="bg-muted/20 border border-[hsl(var(--border))] rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary to send manually
                  </span>
                  <button
                    type="button"
                    onClick={copySummary}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                  {result.ticket_ref} — {result.title}
                  {result.due_date ? `\nDue: ${result.due_date}` : ''}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {control && (
              <div className="text-xs bg-primary/10 border border-primary/20 text-primary rounded-lg px-3 py-2">
                Linked to control <strong>{control.id}</strong> — {control.control_name}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
              <input
                type="text" required value={form.title} onChange={set('title')}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
              <textarea
                rows={3} value={form.description} onChange={set('description')}
                placeholder="What needs to happen, and why"
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Assign to team</label>
                <input
                  type="text" list="action-item-team-options" value={form.assigned_team} onChange={set('assigned_team')}
                  placeholder="e.g. IT Ops"
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <datalist id="action-item-team-options">
                  {teamOptions.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Priority</label>
                <select
                  value={form.priority} onChange={set('priority')}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Assignee email</label>
                <input
                  type="email" value={form.assigned_email} onChange={set('assigned_email')}
                  placeholder="team@company.com"
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Due date</label>
                <input
                  type="date" value={form.due_date} onChange={set('due_date')}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox" checked={form.send_email} onChange={set('send_email')}
                className="rounded border-[hsl(var(--border))]"
              />
              Email this team for tracking outside the platform
            </label>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button" onClick={onClose}
                className="flex-1 py-2.5 border border-[hsl(var(--border))] rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Create Action Item
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
