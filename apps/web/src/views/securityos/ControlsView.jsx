import { useState, useEffect } from 'react';
import { useApp } from '../../SecurityOSApp';
import { CONTROLS_CATALOG, CATEGORIES, STATUS, SEVERITY } from '../../data/controls';
import {
  CheckCircle2, XCircle, Clock, ChevronRight, ChevronDown,
  ChevronUp, Search, Filter, UserCheck, Laptop, Database,
  Cloud, Shield, AlertTriangle, CheckCheck, RotateCcw,
} from 'lucide-react';

const CATEGORY_ICONS = {
  identity: UserCheck,
  devices: Laptop,
  data: Database,
  network: Cloud,
  organization: Shield,
};

const STATUS_CONFIG = {
  [STATUS.PASS]: {
    label: 'Passing',
    icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    dot: 'bg-green-500',
  },
  [STATUS.FAIL]: {
    label: 'Failing',
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
  },
  [STATUS.UNKNOWN]: {
    label: 'Unknown',
    icon: Clock,
    color: 'text-slate-400',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    dot: 'bg-slate-500',
  },
  [STATUS.IN_PROGRESS]: {
    label: 'In Progress',
    icon: RotateCcw,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-500',
  },
};

const SEVERITY_BADGE = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-slate-700 text-slate-400',
};

function ControlCard({ control, statusEntry, onUpdateStatus, isExpanded, onToggle }) {
  const status = statusEntry?.status ?? STATUS.UNKNOWN;
  const sc = STATUS_CONFIG[status];
  const Icon = sc.icon;
  const CatIcon = CATEGORY_ICONS[control.category] || Shield;

  return (
    <div className={`rounded-xl border transition-all ${sc.bg} ${sc.border}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white text-sm font-semibold">{control.shortTitle}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SEVERITY_BADGE[control.severity]}`}>
              {control.severity}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icon size={12} className={sc.color} />
            <span className={`text-xs ${sc.color}`}>{sc.label}</span>
            {statusEntry?.notes && (
              <span className="text-xs text-slate-500 truncate">· {statusEntry.notes}</span>
            )}
          </div>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-slate-500 shrink-0" /> : <ChevronRight size={16} className="text-slate-500 shrink-0" />}
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          <p className="text-slate-300 text-sm leading-relaxed">{control.description}</p>

          <div className="bg-slate-900/60 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Why it matters
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{control.whyItMatters}</p>
          </div>

          {control.howToFix && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                How to fix it
              </p>
              <ol className="space-y-2">
                {control.howToFix.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-300">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-500">
              ~{control.estimatedMinutes} min to fix · Control ID: {control.id}
            </span>
          </div>

          {/* Status update buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {status !== STATUS.PASS && (
              <button
                onClick={() => onUpdateStatus(control.id, STATUS.PASS)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
              >
                <CheckCheck size={15} /> Mark as Fixed
              </button>
            )}
            {status !== STATUS.IN_PROGRESS && status !== STATUS.PASS && (
              <button
                onClick={() => onUpdateStatus(control.id, STATUS.IN_PROGRESS)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-yellow-600/20 border border-yellow-600/40 text-yellow-400 text-sm font-medium hover:bg-yellow-600/30 transition-colors"
              >
                <RotateCcw size={15} /> In Progress
              </button>
            )}
            {status === STATUS.PASS && (
              <button
                onClick={() => onUpdateStatus(control.id, STATUS.FAIL)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors col-span-2"
              >
                <XCircle size={15} /> Mark as Issue
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CategorySection({ catMeta, controls, controlStatuses, onUpdateStatus, expandedId, onToggle }) {
  const Icon = CATEGORY_ICONS[catMeta.id] || Shield;
  const catControls = controls.filter((c) => c.category === catMeta.id);
  if (catControls.length === 0) return null;

  const passing = catControls.filter((c) => (controlStatuses[c.id]?.status ?? STATUS.UNKNOWN) === STATUS.PASS).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
          <Icon size={14} className="text-indigo-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">{catMeta.label}</h3>
        <span className="text-xs text-slate-500 ml-auto">
          {passing}/{catControls.length} passing
        </span>
      </div>
      <div className="space-y-2">
        {catControls.map((control) => (
          <ControlCard
            key={control.id}
            control={control}
            statusEntry={controlStatuses[control.id]}
            onUpdateStatus={onUpdateStatus}
            isExpanded={expandedId === control.id}
            onToggle={() => onToggle(control.id)}
          />
        ))}
      </div>
    </div>
  );
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'issues', label: 'Issues' },
  { id: 'passing', label: 'Passing' },
  { id: 'critical', label: 'Critical' },
];

export default function ControlsView() {
  const { controlStatuses, updateControlStatus, selectedControlId, setSelectedControlId } = useApp();
  const [filter, setFilter] = useState('issues');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(selectedControlId);

  useEffect(() => {
    if (selectedControlId) {
      setExpandedId(selectedControlId);
      setFilter('all');
      setTimeout(() => {
        const el = document.getElementById(`control-${selectedControlId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      setSelectedControlId(null);
    }
  }, [selectedControlId, setSelectedControlId]);

  function handleToggle(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function filteredControls() {
    let list = CONTROLS_CATALOG;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.shortTitle.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    if (filter === 'issues') {
      list = list.filter((c) => {
        const s = controlStatuses[c.id]?.status ?? STATUS.UNKNOWN;
        return s === STATUS.FAIL || s === STATUS.UNKNOWN;
      });
    } else if (filter === 'passing') {
      list = list.filter((c) => (controlStatuses[c.id]?.status ?? STATUS.UNKNOWN) === STATUS.PASS);
    } else if (filter === 'critical') {
      list = list.filter((c) => c.severity === SEVERITY.CRITICAL);
    }

    return list;
  }

  const visibleControls = filteredControls();

  const issueCount = CONTROLS_CATALOG.filter((c) => {
    const s = controlStatuses[c.id]?.status ?? STATUS.UNKNOWN;
    return s === STATUS.FAIL || s === STATUS.UNKNOWN;
  }).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Security Controls</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {issueCount > 0
            ? `${issueCount} control${issueCount !== 1 ? 's' : ''} need attention`
            : 'All controls passing — great work!'}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search controls…"
          className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
            {f.id === 'issues' && issueCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs px-1 rounded-full">{issueCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Controls by category */}
      {visibleControls.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
          <p className="text-white font-semibold">No issues found</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter === 'issues' ? 'All controls are passing!' : 'No controls match your filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(CATEGORIES).map((catMeta) => {
            const catControls = visibleControls.filter((c) => c.category === catMeta.id);
            if (catControls.length === 0) return null;
            return (
              <div key={catMeta.id} id={`cat-${catMeta.id}`}>
                <CategorySection
                  catMeta={catMeta}
                  controls={catControls}
                  controlStatuses={controlStatuses}
                  onUpdateStatus={updateControlStatus}
                  expandedId={expandedId}
                  onToggle={handleToggle}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
