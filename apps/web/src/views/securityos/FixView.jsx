import { useApp } from '../../SecurityOSApp';
import { getControlById, STATUS, SEVERITY_COLOR } from '../../data/controls';
import { ArrowLeft, CheckCheck, RotateCcw, Clock, ShieldAlert } from 'lucide-react';

const SEVERITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

export default function FixView({ controlId, onBack }) {
  const { statuses, updateStatus } = useApp();
  const control = getControlById(controlId);

  if (!control) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <p className="text-slate-400">Control not found.</p>
        <button onClick={onBack} className="mt-4 text-indigo-400 text-sm">← Back</button>
      </div>
    );
  }

  const entry = statuses[controlId] ?? {};
  const currentStatus = entry.status ?? STATUS.UNKNOWN;
  const sevColors = SEVERITY_COLOR[control.severity] || SEVERITY_COLOR.medium;
  const isPassing = currentStatus === STATUS.PASS;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{control.category}</p>
          <h1 className="text-white font-bold text-base truncate">{control.name}</h1>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${sevColors.bg} ${sevColors.text}`}>
          {SEVERITY_LABEL[control.severity]}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Current status */}
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          isPassing
            ? 'bg-green-500/10 border-green-500/30'
            : currentStatus === STATUS.FAIL
            ? `${sevColors.bg} ${sevColors.border}`
            : 'bg-slate-800 border-slate-700'
        }`}>
          <ShieldAlert size={18} className={
            isPassing ? 'text-green-400' :
            currentStatus === STATUS.FAIL ? sevColors.text :
            'text-slate-400'
          } />
          <div>
            <p className={`text-sm font-semibold ${
              isPassing ? 'text-green-400' :
              currentStatus === STATUS.FAIL ? sevColors.text :
              'text-slate-300'
            }`}>
              {isPassing ? 'Currently passing' :
               currentStatus === STATUS.FAIL ? 'Currently failing' :
               currentStatus === STATUS.IN_PROGRESS ? 'Fix in progress' :
               'Status not verified'}
            </p>
            {entry.notes && <p className="text-xs text-slate-400 mt-0.5">{entry.notes}</p>}
          </div>
        </div>

        {/* Why it matters */}
        <div>
          <h2 className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Why it matters</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{control.customer_impact}</p>
        </div>

        {/* How to fix */}
        {!isPassing && (
          <div>
            <h2 className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">How to fix it</h2>
            <ol className="space-y-3">
              {(control.remediation_steps || []).map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Details for passing controls */}
        {isPassing && (
          <div>
            <h2 className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">What this covers</h2>
            <p className="text-slate-300 text-sm leading-relaxed">{control.description}</p>
          </div>
        )}

        {/* Evidence & time */}
        <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <Clock size={11} /> ~{control.estimated_minutes} min to fix
          </span>
          <span className="text-slate-700">·</span>
          <span>{control.id}</span>
        </div>

        {/* Framework tags */}
        {control.framework_mappings && (
          <div>
            <p className="text-xs text-slate-600 mb-2">Framework mappings</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(control.framework_mappings).map(fw => (
                <span key={fw} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                  {fw.replace(/_/g, ' ').toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-6 pt-3 border-t border-slate-800 space-y-2">
        {!isPassing && (
          <button
            onClick={() => { updateStatus(controlId, STATUS.PASS); onBack(); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
          >
            <CheckCheck size={17} /> Mark as Fixed
          </button>
        )}
        {currentStatus !== STATUS.IN_PROGRESS && !isPassing && (
          <button
            onClick={() => { updateStatus(controlId, STATUS.IN_PROGRESS); onBack(); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-slate-700 text-yellow-400 text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <RotateCcw size={15} /> Working on it
          </button>
        )}
        {isPassing && (
          <button
            onClick={() => { updateStatus(controlId, STATUS.FAIL); onBack(); }}
            className="w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Mark as Issue
          </button>
        )}
        <button
          onClick={onBack}
          className="w-full py-3 text-slate-500 text-sm hover:text-slate-400 transition-colors"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
