import { useState, useEffect } from 'react';
import { useApp } from '../../SecurityOSApp';
import { STATUS, CONTROLS_CATALOG } from '../../data/controls';
import { buildDemoStatuses } from '../../data/scoring';
import { getIntegrations, connectM365 } from '../../data/api';
import { ShieldCheck, RefreshCw, Trash2, ChevronRight, Wifi, WifiOff, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const INDUSTRIES = [
  'Medical / Dental Practice', 'Mental Health / Therapy', 'Legal Services',
  'Accounting / CPA', 'Financial Advisory', 'Insurance Agency', 'Real Estate',
  'Consulting', 'Marketing / Creative Agency', 'IT / MSP', 'E-commerce',
  'Construction / Contracting', 'Other Professional Services',
];

const SENSITIVE_DATA = [
  { id: 'phi',      label: 'Health / Medical Records',  flag: 'HIPAA'   },
  { id: 'pii',      label: 'Customer Personal Info',    flag: null       },
  { id: 'payment',  label: 'Payment Card Data',         flag: 'PCI DSS' },
  { id: 'financial',label: 'Financial Records',         flag: null       },
  { id: 'legal',    label: 'Legal Documents',           flag: null       },
  { id: 'federal',  label: 'Federal / Gov Data',        flag: 'CMMC'    },
];

const EMAIL_PROVIDERS = ['Microsoft 365', 'Google Workspace', 'Other', 'On-premise'];

function Row({ label, children }) {
  return (
    <div className="border-b border-slate-800 px-5 py-4 last:border-0">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      {children}
    </div>
  );
}

function M365Panel({ apiSession }) {
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [connecting, setConnecting]   = useState(false);
  const [tenantId, setTenantId]       = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [message, setMessage]         = useState(null);

  useEffect(() => {
    if (!apiSession?.token) return;
    getIntegrations(apiSession.orgId, apiSession.token)
      .then(d => {
        const m365 = d.integrations?.find(i => i.provider === 'microsoft_365');
        setIntegration(m365 || null);
      })
      .catch(() => {});
  }, [apiSession]);

  async function handleConnect() {
    if (!tenantId.trim()) return;
    setConnecting(true);
    setMessage(null);
    try {
      const data = await connectM365(apiSession.orgId, apiSession.token, tenantId.trim(), '');
      if (data.consent_url) {
        setMessage({ type: 'info', text: 'A consent URL has been generated. In a real deployment, your M365 admin would visit this URL to grant permissions. For this demo the connection is treated as authorized.' });
        // Simulate completing the flow with an authorization_code
        await connectM365(apiSession.orgId, apiSession.token, tenantId.trim(), '');
      }
      setMessage({ type: 'success', text: 'Microsoft 365 connected! Evidence collection has started.' });
      setShowForm(false);
      // Re-fetch integration status
      const d2 = await getIntegrations(apiSession.orgId, apiSession.token);
      const m365 = d2.integrations?.find(i => i.provider === 'microsoft_365');
      setIntegration(m365 || null);
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setConnecting(false);
    }
  }

  if (!apiSession) return null;

  const status = integration?.status;
  const consentExpired = integration?.consent_expired;

  return (
    <div className="border-b border-slate-800">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">📧</span>
          <div>
            <p className="text-sm text-slate-300 font-medium">Microsoft 365</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {!status || status === 'not_connected'
                ? 'Not connected — auto-verify MFA, devices, access'
                : status === 'active' && !consentExpired
                ? 'Connected · collecting evidence'
                : status === 'pending_consent'
                ? 'Awaiting admin consent'
                : consentExpired
                ? 'Consent expired — re-authorize'
                : status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(!status || status === 'not_connected') && (
            <button
              onClick={() => setShowForm(f => !f)}
              className="text-xs px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
            >
              Connect
            </button>
          )}
          {status === 'active' && !consentExpired && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 size={12} /> Active
            </span>
          )}
          {status === 'pending_consent' && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <Clock size={12} /> Pending
            </span>
          )}
          {consentExpired && (
            <button
              onClick={() => setShowForm(f => !f)}
              className="text-xs px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold"
            >
              Re-auth
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="px-5 pb-4 space-y-3">
          <input
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            placeholder="Azure tenant ID or domain (e.g. contoso.com)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {message && (
            <div className={`p-3 rounded-xl text-xs ${
              message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              message.type === 'error'   ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {message.text}
            </div>
          )}
          <div className="text-[10px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-400">Permissions requested (read-only):</p>
            {['User.Read.All — check MFA enrollment', 'Policy.Read.All — verify Conditional Access', 'DeviceManagementManagedDevices.Read.All — check device compliance'].map(p => (
              <p key={p} className="flex items-center gap-1"><span className="text-indigo-400">·</span> {p}</p>
            ))}
          </div>
          <button
            onClick={handleConnect}
            disabled={!tenantId.trim() || connecting}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40 transition-colors"
          >
            {connecting ? 'Connecting…' : 'Connect Microsoft 365'}
          </button>
        </div>
      )}

      {integration?.controls_verified?.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] text-slate-500 mb-1">Auto-verified controls:</p>
          <div className="flex flex-wrap gap-1.5">
            {integration.controls_verified.map(c => (
              <span key={c} className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] border border-green-500/20">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsView() {
  const { profile, setProfile, statuses, updateStatus, scoring, apiSession } = useApp();
  const [saved, setSaved] = useState(false);

  function upd(key, val) { setProfile(p => ({ ...p, [key]: val })); }

  function save() { setSaved(true); setTimeout(() => setSaved(false), 1800); }

  function resetDemo() {
    if (!window.confirm('Reset all control statuses to demo data?')) return;
    const d = buildDemoStatuses();
    Object.entries(d).forEach(([id, entry]) => updateStatus(id, entry.status, entry.notes, entry.evidence_source));
  }

  function markAll() {
    if (!window.confirm('Mark all 25 controls as passing?')) return;
    CONTROLS_CATALOG.forEach(c => updateStatus(c.id, STATUS.PASS, null, 'manual'));
  }

  function clearAll() {
    if (!window.confirm('Clear all data and restart? This cannot be undone.')) return;
    localStorage.removeItem('securityos_v2');
    window.location.reload();
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-slate-800">
        <h1 className="text-white font-bold text-xl">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Score summary */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-2xl font-bold text-white">{scoring.totalScore}</p>
              <p className="text-xs text-slate-500 mt-0.5">Score</p>
            </div>
            <div className="bg-green-500/10 rounded-xl p-3">
              <p className="text-2xl font-bold text-green-400">{scoring.summary.passing}</p>
              <p className="text-xs text-slate-500 mt-0.5">Passing</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-400">{scoring.summary.failing + scoring.summary.unknown}</p>
              <p className="text-xs text-slate-500 mt-0.5">Issues</p>
            </div>
          </div>
        </div>

        {/* Business profile */}
        <div className="mt-4">
          <p className="px-5 text-xs text-slate-500 uppercase tracking-wider mb-2">Business Profile</p>
          <div className="bg-slate-900 border-y border-slate-800">
            <Row label="Business Name">
              <input
                value={profile.businessName}
                onChange={e => upd('businessName', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </Row>

            <Row label="Owner / Attester Name">
              <input
                value={profile.ownerName ?? ''}
                onChange={e => upd('ownerName', e.target.value)}
                placeholder="e.g. Jane Smith"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </Row>

            <Row label="Owner / Attester Email">
              <input
                type="email"
                value={profile.ownerEmail ?? ''}
                onChange={e => upd('ownerEmail', e.target.value)}
                placeholder="e.g. jane@yourcompany.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-600 mt-1">Used to identify you on attestations you create.</p>
            </Row>

            <Row label="Industry">
              <select
                value={profile.industry}
                onChange={e => upd('industry', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select industry…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Row>

            <Row label="Email Provider">
              <div className="grid grid-cols-2 gap-2">
                {EMAIL_PROVIDERS.map(p => (
                  <button key={p} onClick={() => upd('emailProvider', p)}
                    className={`py-2 text-xs rounded-lg border transition-colors ${
                      profile.emailProvider === p
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </Row>

            <Row label="Sensitive Data">
              <div className="space-y-1.5">
                {SENSITIVE_DATA.map(({ id, label, flag }) => {
                  const sel = profile.sensitiveData?.includes(id);
                  return (
                    <button key={id}
                      onClick={() => upd('sensitiveData', sel
                        ? (profile.sensitiveData || []).filter(x => x !== id)
                        : [...(profile.sensitiveData || []), id])}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors ${
                        sel ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}>
                      <span>{label}</span>
                      {flag && <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">{flag}</span>}
                    </button>
                  );
                })}
              </div>
            </Row>

            <div className="px-5 py-4">
              <button onClick={save}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                  saved ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}>
                {saved ? '✓ Saved' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-5 mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Integrations</p>
            {apiSession ? (
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <Wifi size={10} /> API Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <WifiOff size={10} /> Start API server to connect
              </span>
            )}
          </div>
          <div className="bg-slate-900 border-y border-slate-800">
            <M365Panel apiSession={apiSession} />
            {[
              { name: 'Google Workspace', icon: '🔵' },
              { name: 'AWS', icon: '☁️' },
            ].map(({ name, icon }) => (
              <div key={name} className="flex items-center justify-between px-5 py-4 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm text-slate-300">{name}</span>
                </div>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Coming soon</span>
              </div>
            ))}
            <div className="px-5 py-3">
              <p className="text-xs text-slate-500">
                Integrations automatically verify controls — raising evidence confidence and accuracy of your score.
              </p>
            </div>
          </div>
        </div>

        {/* Data management */}
        <div className="mt-6">
          <p className="px-5 text-xs text-slate-500 uppercase tracking-wider mb-2">Data</p>
          <div className="bg-slate-900 border-y border-slate-800">
            {[
              { label: 'Reset to demo data', icon: RefreshCw, action: resetDemo, danger: false },
              { label: 'Mark all controls as passing', icon: ShieldCheck, action: markAll, danger: false },
              { label: 'Clear all data & restart', icon: Trash2, action: clearAll, danger: true },
            ].map(({ label, icon: Icon, action, danger }) => (
              <button key={label} onClick={action}
                className={`w-full flex items-center justify-between px-5 py-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors ${
                  danger ? 'text-red-400' : 'text-slate-300'
                }`}>
                <span className="flex items-center gap-3 text-sm">
                  <Icon size={15} /> {label}
                </span>
                <ChevronRight size={14} className="text-slate-600" />
              </button>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="px-5 py-6">
          <p className="text-xs text-slate-600">SecurityOS v0.3.0 · 31 controls · NIST CSF 2.0 + AI RMF</p>
          <p className="text-xs text-slate-700 mt-1">Confidence-weighted scoring: automated (100%) · integrated (90%) · attested (70%) · manual (50%) · unknown (0%)</p>
        </div>
      </div>
    </div>
  );
}
