/**
 * ViolationSourcesView — 30-Day Violation Evidence Trail
 *
 * Shows the actual users, devices, and IPs behind each compliance gap,
 * pulled from connected security tools via the MCP integration layer.
 *
 * Data model:
 *   Hot tier (0-30 days)   — stored in SQLite, free, shown here
 *   Glacier tier (30+ days) — archived to AWS S3/Glacier, billed per GB
 *
 * Actions:
 *   • "Sync from integrations" — pulls fresh violations from all connected tools
 *   • "Archive to Glacier"     — push record(s) to long-term storage
 *   • "Purge expired"          — hard-delete records past their 30-day window
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Users, Monitor, Globe, RefreshCw, Archive,
  Trash2, Shield, Clock, ChevronDown, ChevronUp, Download,
  Mail, Server, Database, Filter, Search, Zap, Info,
  CheckCircle2, AlertCircle, Loader2, ExternalLink, BarChart3,
  Lock, Calendar, TrendingDown
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ENTITY_ICON = { user: Mail, device: Monitor, ip: Globe, service_account: Server };
const ENTITY_COLOR = {
  user:            'text-blue-500 bg-blue-500/10 border-blue-500/20',
  device:          'text-orange-500 bg-orange-500/10 border-orange-500/20',
  ip:              'text-purple-500 bg-purple-500/10 border-purple-500/20',
  service_account: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
};

const VENDOR_COLOR = {
  okta:        'bg-blue-500/10 text-blue-500 border-blue-500/20',
  crowdstrike: 'bg-red-500/10 text-red-500 border-red-500/20',
  sentinelone: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  aws:         'bg-orange-500/10 text-orange-500 border-orange-500/20',
  azure_ad:    'bg-blue-600/10 text-blue-600 border-blue-600/20',
  manual:      'bg-muted text-muted-foreground border-muted',
};

const VIOLATION_LABEL = {
  inactive_mfa:              'Inactive MFA',
  stale_access:              'Stale Access (90d+)',
  no_mfa_enrolled:           'No MFA Enrolled',
  unpatched_device:          'Unpatched Device',
  agent_missing:             'EDR Agent Missing',
  critical_vulnerability:    'Critical Vulnerability',
  public_resource:           'Public Cloud Resource',
  overpermissive_iam:        'Overpermissive IAM',
  privileged_user_no_review: 'Privileged — No Review',
};

function urgencyColor(daysRemaining) {
  if (daysRemaining === null) return 'text-muted-foreground';
  if (daysRemaining <= 3)  return 'text-red-500';
  if (daysRemaining <= 7)  return 'text-orange-500';
  if (daysRemaining <= 14) return 'text-yellow-500';
  return 'text-muted-foreground';
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ summary }) {
  const cards = [
    { label: 'Active records',    value: summary.total_active,    icon: AlertTriangle, color: 'text-orange-500' },
    { label: 'Expiring in 7 days',value: summary.expiring_7_days, icon: Clock,         color: 'text-red-500' },
    { label: 'Archived (Glacier)',value: summary.total_archived,  icon: Archive,       color: 'text-blue-500' },
    { label: 'Controls affected', value: (summary.by_control || []).length, icon: Shield, color: 'text-purple-500' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-card border border-[hsl(var(--border))] rounded-xl p-4">
          <c.icon className={`w-4 h-4 ${c.color} mb-2`} />
          <div className={`text-2xl font-black ${c.color}`}>{c.value ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Violation row ────────────────────────────────────────────────────────────

function ViolationRow({ v, onArchive, onDelete, archiving }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ENTITY_ICON[v.entity_type] || Users;
  const identity = v.email || v.hostname || v.display_name || v.source_id || '—';

  return (
    <>
      <tr
        className={`border-b border-[hsl(var(--border))] hover:bg-muted/20 cursor-pointer ${v.storage_tier === 'glacier' ? 'opacity-60' : ''}`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Entity */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${ENTITY_COLOR[v.entity_type] || 'bg-muted/30 text-muted-foreground border-muted'}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate max-w-[160px]">{identity}</div>
              <div className="text-xs text-muted-foreground capitalize">{v.entity_type}</div>
            </div>
          </div>
        </td>
        {/* Violation */}
        <td className="py-3 px-4">
          <span className="text-xs font-medium text-foreground">
            {VIOLATION_LABEL[v.violation_type] || v.violation_type}
          </span>
        </td>
        {/* Control */}
        <td className="py-3 px-4">
          <span className="text-xs font-mono bg-muted/30 px-2 py-0.5 rounded">{v.control_id}</span>
        </td>
        {/* Source */}
        <td className="py-3 px-4">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${VENDOR_COLOR[v.source_vendor] || VENDOR_COLOR.manual}`}>
            {v.source_vendor}
          </span>
        </td>
        {/* First / last seen */}
        <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
          <div>{v.first_seen ? new Date(v.first_seen).toLocaleDateString() : '—'}</div>
          <div className="text-[10px]">last: {v.last_seen ? new Date(v.last_seen).toLocaleDateString() : '—'}</div>
        </td>
        {/* Retention */}
        <td className="py-3 px-4">
          {v.storage_tier === 'glacier' ? (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <Archive className="w-3 h-3" /> Glacier
            </span>
          ) : (
            <span className={`text-xs font-semibold ${urgencyColor(v.days_remaining)}`}>
              {v.days_remaining !== null ? `${v.days_remaining}d left` : '—'}
            </span>
          )}
        </td>
        {/* Actions */}
        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            {v.storage_tier === 'hot' && (
              <button
                onClick={() => onArchive(v.id)}
                disabled={archiving === v.id}
                title="Archive to Glacier"
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-blue-500"
              >
                {archiving === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded raw context */}
      {expanded && (
        <tr className="border-b border-[hsl(var(--border))] bg-muted/10">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Entity details</div>
                <div className="space-y-1 text-xs">
                  {v.email    && <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground font-mono">{v.email}</span></div>}
                  {v.hostname && <div><span className="text-muted-foreground">Hostname:</span> <span className="text-foreground font-mono">{v.hostname}</span></div>}
                  {v.display_name && <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground">{v.display_name}</span></div>}
                  {v.source_id    && <div><span className="text-muted-foreground">Vendor ID:</span> <span className="text-foreground font-mono">{v.source_id}</span></div>}
                  {v.glacier_key  && <div><span className="text-muted-foreground">Glacier key:</span> <span className="text-foreground font-mono text-[10px]">{v.glacier_key}</span></div>}
                </div>
              </div>
              {v.raw_context && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Raw context (from {v.source_vendor})</div>
                  <pre className="text-[10px] text-foreground bg-muted/30 border border-[hsl(var(--border))] rounded p-2 overflow-x-auto max-h-24">
                    {typeof v.raw_context === 'string' ? v.raw_context : JSON.stringify(v.raw_context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ViolationSourcesView() {
  const [violations, setViolations]   = useState([]);
  const [summary, setSummary]         = useState({});
  const [loading, setLoading]         = useState(true);
  const [syncing, setSyncing]         = useState(false);
  const [archiving, setArchiving]     = useState(null);
  const [notice, setNotice]           = useState('');
  const [filterControl, setFilterControl]   = useState('');
  const [filterVendor, setFilterVendor]     = useState('');
  const [filterType, setFilterType]         = useState('');
  const [showArchived, setShowArchived]     = useState(false);
  const [search, setSearch]                 = useState('');
  const [showRetentionInfo, setShowRetentionInfo] = useState(false);

  const toast = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '500',
        include_archived: showArchived ? 'true' : 'false',
        ...(filterControl ? { control_id: filterControl } : {}),
        ...(filterVendor  ? { source_vendor: filterVendor } : {}),
        ...(filterType    ? { entity_type: filterType } : {}),
      });
      const [vResp, sResp] = await Promise.all([
        fetch(`${API_BASE_URL}/api/violations?${params}`, { headers: api.getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/violations/summary`,  { headers: api.getAuthHeaders() }),
      ]);
      if (vResp.ok) setViolations((await vResp.json()).violations || []);
      if (sResp.ok) setSummary(await sResp.json());
    } catch { /* silently ignore network errors */ }
    setLoading(false);
  }, [filterControl, filterVendor, filterType, showArchived]);

  useEffect(() => { load(); }, [load]);

  const syncFromIntegrations = async () => {
    setSyncing(true);
    try {
      // Call the Okta violation scan endpoint (others added as MCP servers are built)
      const resp = await fetch(`${API_BASE_URL}/api/violations/sync/okta`, {
        method: 'POST',
        headers: api.getAuthHeaders(),
      });
      if (resp.ok) {
        const data = await resp.json();
        toast(`✓ Synced from Okta: ${data.ingested ?? 0} violation sources found`);
        await load();
      } else {
        toast('✗ Sync failed — check that Okta is connected in Integrations');
      }
    } catch (e) {
      toast(`✗ ${e.message}`);
    }
    setSyncing(false);
  };

  const archiveOne = async (id) => {
    setArchiving(id);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/violations/archive/${id}`, {
        method: 'POST',
        headers: api.getAuthHeaders(),
      });
      if (resp.ok) {
        const data = await resp.json();
        toast(`✓ Archived to Glacier (key: ${data.glacier_key?.slice(0, 30)}…)`);
        await load();
      } else {
        const err = await resp.json().catch(() => ({}));
        toast(`✗ Archive failed: ${err.detail || 'unknown error'}`);
      }
    } catch (e) {
      toast(`✗ ${e.message}`);
    }
    setArchiving(null);
  };

  const purgeExpired = async () => {
    if (!confirm('Hard-delete all expired (>30 day) hot-tier records that have not been archived?')) return;
    const resp = await fetch(`${API_BASE_URL}/api/violations/purge`, {
      method: 'POST',
      headers: api.getAuthHeaders(),
    });
    if (resp.ok) {
      const data = await resp.json();
      toast(`✓ Purged ${data.purged} expired records`);
      await load();
    }
  };

  // Client-side search filter
  const displayed = violations.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.email || '').toLowerCase().includes(q)
      || (v.hostname || '').toLowerCase().includes(q)
      || (v.display_name || '').toLowerCase().includes(q)
      || (v.control_id || '').toLowerCase().includes(q)
      || (v.violation_type || '').toLowerCase().includes(q);
  });

  const vendors   = [...new Set(violations.map(v => v.source_vendor))].sort();
  const controls  = [...new Set(violations.map(v => v.control_id))].sort();
  const etypes    = [...new Set(violations.map(v => v.entity_type))].sort();

  return (
    <div className="space-y-5 pb-10">
      {/* Toast */}
      {notice && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${notice.startsWith('✓') ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-red-500/10 border-red-500/30 text-red-600'}`}>
          {notice}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            Violation Evidence Trail
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Specific users and devices behind each compliance gap — pulled live from connected security tools.
            Records are kept for 30 days in the hot tier. Archive to AWS Glacier for longer retention.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={syncFromIntegrations}
            disabled={syncing}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Syncing…' : 'Sync integrations'}
          </button>
          <button
            onClick={purgeExpired}
            className="flex items-center gap-1.5 px-4 py-2 border border-[hsl(var(--border))] bg-card rounded-xl text-sm text-foreground hover:bg-muted"
          >
            <Trash2 className="w-4 h-4 text-red-500" /> Purge expired
          </button>
          <button
            onClick={() => setShowRetentionInfo(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 border border-[hsl(var(--border))] bg-card rounded-xl text-sm text-foreground hover:bg-muted"
          >
            <Info className="w-4 h-4" /> Retention
          </button>
        </div>
      </div>

      {/* Retention policy info */}
      {showRetentionInfo && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
          <h3 className="font-bold text-foreground flex items-center gap-2"><Lock className="w-4 h-4 text-blue-500" /> Retention Policy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Database className="w-4 h-4 text-green-500" /><span className="font-semibold text-foreground">Hot Tier (0–30 days)</span></div>
              <p className="text-muted-foreground text-xs">Stored in SQLite. Included in your base plan. Fully searchable, filterable, and exportable. Records auto-expire after 30 days unless archived.</p>
              <div className="mt-2 text-xs font-semibold text-green-500">$0 / month (included)</div>
            </div>
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Archive className="w-4 h-4 text-blue-500" /><span className="font-semibold text-foreground">Glacier Tier (30+ days)</span></div>
              <p className="text-muted-foreground text-xs">Compressed and stored in AWS S3/Glacier. Retrieval takes 1-5 minutes (Instant) or 3-5 hours (Flexible). Required for regulatory holds (HIPAA 6yr, SOC2 1yr, etc.).</p>
              <div className="mt-2 text-xs font-semibold text-blue-500">≈$0.004/GB/month · retrieval fees apply</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Regulatory guidance:</strong> HIPAA requires 6-year retention of PHI-related audit records.
            SOC 2 auditors typically request 12 months of evidence. FedRAMP requires evidence retention for the duration of the ATO.
          </p>
        </div>
      )}

      {/* Summary cards */}
      {!loading && <SummaryCards summary={summary} />}

      {/* Top violating controls bar */}
      {!loading && (summary.by_control || []).length > 0 && (
        <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top controls with violations</div>
          <div className="space-y-2">
            {(summary.by_control || []).slice(0, 6).map(c => {
              const max = summary.by_control?.[0]?.count || 1;
              return (
                <div key={c.control_id} className="flex items-center gap-3 cursor-pointer" onClick={() => setFilterControl(filterControl === c.control_id ? '' : c.control_id)}>
                  <span className={`text-xs font-mono w-20 shrink-0 ${filterControl === c.control_id ? 'text-primary font-bold' : 'text-foreground'}`}>{c.control_id}</span>
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-orange-500 w-6 text-right shrink-0">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search email, hostname, control…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-[hsl(var(--border))] rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
          className="px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="">All vendors</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none">
          <option value="">All types</option>
          {etypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="w-4 h-4 accent-primary" />
          Include Glacier
        </label>
        {(filterControl || filterVendor || filterType) && (
          <button onClick={() => { setFilterControl(''); setFilterVendor(''); setFilterType(''); }}
            className="text-xs text-primary hover:underline">Clear filters</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] bg-muted/20">
          <span className="text-sm font-semibold text-foreground">
            {displayed.length} violation source{displayed.length !== 1 ? 's' : ''}
            {violations.length !== displayed.length && ` (filtered from ${violations.length})`}
          </span>
          <span className="text-xs text-muted-foreground">Click a row to expand raw context</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading violation sources…
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No violation sources found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {violations.length === 0
                ? 'Connect a security tool in Integrations and click "Sync integrations" to pull real violation data.'
                : 'No records match your current filters.'}
            </p>
            {violations.length === 0 && (
              <a href="#" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'integrations' })); }}
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Zap className="w-4 h-4" /> Go to Integrations
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/10">
                <tr>
                  {['Entity', 'Violation', 'Control', 'Source', 'Detected', 'Retention', ''].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(v => (
                  <ViolationRow key={v.id} v={v} onArchive={archiveOne} archiving={archiving} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
