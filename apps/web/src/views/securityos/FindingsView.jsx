/**
 * FindingsView — Engineering To-Do List (Priority 1)
 *
 * Pulls live findings from the backend API and shows everything an engineer
 * needs to act: affected resources, due dates, remediation steps, framework
 * mappings, estimated effort, and a clear definition of done.
 *
 * Falls back to a connect prompt when the backend is offline.
 */
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../SecurityOSApp';
import { getFindings, transitionFinding } from '../../data/api';
import {
  AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp,
  User, Monitor, Settings2, Cloud, Wifi, RefreshCw,
  Calendar, BookOpen, ShieldCheck, Zap, Link, ArrowRight,
} from 'lucide-react';

const SEV = {
  critical: { dot: '🔴', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  high:     { dot: '🟠', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  medium:   { dot: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  low:      { dot: '⚪', color: 'text-slate-400',  bg: 'bg-slate-800',     border: 'border-slate-700'     },
  info:     { dot: '🔵', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
};

const STATE_LABEL = {
  open:                 { label: 'Open',            cls: 'bg-red-500/10 text-red-400'       },
  assigned:             { label: 'Assigned',         cls: 'bg-blue-500/10 text-blue-400'     },
  in_progress:          { label: 'In Progress',      cls: 'bg-yellow-500/10 text-yellow-400' },
  submitted_for_review: { label: 'In Review',        cls: 'bg-indigo-500/10 text-indigo-400' },
  closed:               { label: 'Closed',           cls: 'bg-green-500/10 text-green-400'   },
  risk_accepted:        { label: 'Risk Accepted',    cls: 'bg-slate-700 text-slate-400'      },
  reopened:             { label: 'Reopened',         cls: 'bg-orange-500/10 text-orange-400' },
};

const RESOURCE_ICON = {
  user:          User,
  device:        Monitor,
  setting:       Settings2,
  cloud_resource:Cloud,
  default:       Wifi,
};

const FW_SHORT = {
  nist_csf_2:      'NIST CSF',
  hipaa:           'HIPAA',
  pci_dss:         'PCI DSS',
  ftc_safeguards:  'FTC',
  cyber_insurance: 'Insurance',
  cis_v8:          'CIS v8',
};

function effortLabel(mins) {
  if (!mins) return null;
  if (mins < 60) return `${mins} min`;
  return `${Math.round(mins / 60 * 10) / 10} hr`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

// ── Affected Resource pill ────────────────────────────────────────────────────
function ResourcePill({ resource }) {
  const Icon = RESOURCE_ICON[resource.resource_type] || RESOURCE_ICON.default;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700/50 text-xs">
      <Icon size={11} className="text-slate-500 shrink-0" />
      <span className="text-slate-300 font-medium truncate max-w-[160px]">{resource.identifier}</span>
      {resource.details && (
        <span className="text-slate-600 truncate">· {resource.details}</span>
      )}
    </div>
  );
}

// ── Framework mapping badges ──────────────────────────────────────────────────
function FwBadge({ label }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold border border-indigo-500/20">
      {label}
    </span>
  );
}

// ── Individual finding card ───────────────────────────────────────────────────
function FindingCard({ finding, token, orgId, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const sev     = SEV[finding.severity] || SEV.low;
  const stateUi = STATE_LABEL[finding.state] || { label: finding.state, cls: 'bg-slate-700 text-slate-400' };
  const days    = daysUntil(finding.due_date);
  const isOverdue = finding.is_overdue;
  const effort  = effortLabel(finding.catalog_estimated_minutes);

  const frameworks = Object.entries(finding.catalog_framework_mappings || {})
    .filter(([, codes]) => codes?.length > 0)
    .map(([fw]) => FW_SHORT[fw] || fw)
    .slice(0, 4);

  async function markInProgress() {
    if (!token) return;
    setTransitioning(true);
    try {
      const action = finding.state === 'open' ? 'assign' : 'start';
      await transitionFinding(orgId, finding.finding_id, token, action,
        finding.state === 'open'
          ? { assigned_to_user_id: 'demo-user-001', note: 'Self-assigned via mobile app' }
          : { note: 'Started remediation' }
      );
      onRefresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <div className={`mx-4 mb-3 rounded-2xl border ${sev.border} ${sev.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3.5"
      >
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5 leading-none">{sev.dot}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stateUi.cls}`}>
                {stateUi.label}
              </span>
              {isOverdue && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                  <AlertTriangle size={9} /> OVERDUE
                </span>
              )}
              {!isOverdue && days !== null && days <= 7 && (
                <span className="text-[10px] text-yellow-400 flex items-center gap-1">
                  <Calendar size={9} /> Due in {days}d
                </span>
              )}
            </div>
            <p className="text-white text-sm font-semibold leading-snug">{finding.title}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {effort && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock size={9} /> {effort}
                </span>
              )}
              {finding.due_date && (
                <span className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                  <Calendar size={9} /> {finding.due_date}
                </span>
              )}
              {frameworks.slice(0, 2).map(fw => <FwBadge key={fw} label={fw} />)}
            </div>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-slate-500 shrink-0 mt-1" />
            : <ChevronDown size={16} className="text-slate-500 shrink-0 mt-1" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/40 pt-3">

          {/* Description */}
          <p className="text-sm text-slate-300 leading-relaxed">{finding.description}</p>

          {/* Business impact */}
          {finding.business_impact && (
            <div className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">
                Why It Matters
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{finding.business_impact}</p>
            </div>
          )}

          {/* Affected resources */}
          {finding.affected_resources?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">
                Affected ({finding.affected_resources.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {finding.affected_resources.map((r, i) => (
                  <ResourcePill key={i} resource={r} />
                ))}
              </div>
            </div>
          )}

          {/* Remediation steps */}
          {finding.catalog_remediation_steps?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
                <BookOpen size={10} /> Remediation Steps
              </p>
              <ol className="space-y-2">
                {finding.catalog_remediation_steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-slate-300">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Framework mappings */}
          {frameworks.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">
                Framework Requirements
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(finding.catalog_framework_mappings || {})
                  .filter(([, codes]) => codes?.length > 0)
                  .map(([fw, codes]) => (
                    <span key={fw} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300">
                      <Link size={9} />
                      {FW_SHORT[fw] || fw}: {codes.join(', ')}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Definition of done */}
          {finding.definition_of_done && (
            <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-3">
              <p className="text-[10px] text-green-500 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
                <CheckCircle2 size={10} /> Definition of Done
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{finding.definition_of_done}</p>
            </div>
          )}

          {/* Verification evidence */}
          {finding.verification_evidence && (
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
                <ShieldCheck size={10} /> Proof Required
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{finding.verification_evidence}</p>
            </div>
          )}

          {/* Action button */}
          {finding.state === 'open' && (
            <button
              onClick={markInProgress}
              disabled={transitioning}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {transitioning ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              Assign to Me
            </button>
          )}
          {finding.state === 'assigned' && (
            <button
              onClick={markInProgress}
              disabled={transitioning}
              className="w-full py-2.5 rounded-xl bg-yellow-500/20 text-yellow-300 text-sm font-semibold border border-yellow-500/30 flex items-center justify-center gap-2 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
            >
              {transitioning ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Start Remediation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function FindingsView() {
  const { apiSession } = useApp();
  const [findings, setFindings] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('all');   // all | overdue | critical | high

  const load = useCallback(async () => {
    if (!apiSession?.token) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filter === 'overdue')   params.overdue = true;
      if (filter === 'critical')  params.severity = 'critical';
      if (filter === 'high')      params.severity = 'high';
      const data = await getFindings(apiSession.orgId, apiSession.token, params);
      setFindings(data.findings || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiSession, filter]);

  useEffect(() => { load(); }, [load]);

  const overdue   = (findings || []).filter(f => f.is_overdue).length;
  const critical  = (findings || []).filter(f => f.severity === 'critical').length;
  const open      = (findings || []).filter(f => f.state !== 'closed').length;

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!apiSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          <AlertTriangle size={28} className="text-slate-500" />
        </div>
        <p className="text-white font-bold text-lg mb-2">Backend Not Connected</p>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Start the API server to see live findings with remediation steps, affected resources, and due dates.
        </p>
        <code className="text-xs text-indigo-300 bg-slate-800 px-3 py-2 rounded-lg text-left block max-w-full overflow-x-auto">
          ENV=dev AUTH_DEV_PRIVATE_KEY_PATH=dev_key.pem{'\n'}
          uvicorn backend.securityos_main:app --port 8001 --reload
        </code>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-5 pt-10 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
            {apiSession.orgName}
          </p>
          <button onClick={load} className="text-slate-500 hover:text-slate-300 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <h1 className="text-2xl font-bold text-white">Findings</h1>
        <p className="text-slate-400 text-sm mt-1">Engineering to-do list with full remediation context</p>

        {/* Summary pills */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {overdue > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold border border-red-500/20">
              <AlertTriangle size={10} /> {overdue} overdue
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
            {open} open
          </span>
          {critical > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs">
              {critical} critical
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'all',      label: 'All'      },
          { id: 'overdue',  label: '⏰ Overdue' },
          { id: 'critical', label: '🔴 Critical' },
          { id: 'high',     label: '🟠 High'   },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 pb-6">
        {error && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
        {loading && !findings && (
          <div className="flex justify-center py-12">
            <RefreshCw size={20} className="text-slate-600 animate-spin" />
          </div>
        )}
        {findings && findings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-white font-bold text-lg mb-2">No findings match this filter</p>
            <p className="text-slate-400 text-sm">Try switching to "All" to see everything.</p>
          </div>
        )}
        {findings && findings.map(f => (
          <FindingCard
            key={f.finding_id}
            finding={f}
            token={apiSession.token}
            orgId={apiSession.orgId}
            onRefresh={load}
          />
        ))}
      </div>
    </div>
  );
}
