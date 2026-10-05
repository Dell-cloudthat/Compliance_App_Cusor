import { useState } from 'react';
import { useApp } from '../../SecurityOSApp';
import { STATUS, CONTROLS_CATALOG } from '../../data/controls';
import { generateDemoStatuses } from '../../data/scoring';
import {
  Building2, Shield, RefreshCw, ChevronRight, Check,
  Trash2, Download, ExternalLink,
} from 'lucide-react';

const INDUSTRIES = [
  'Medical / Dental Practice', 'Mental Health / Therapy', 'Legal Services / Law Firm',
  'Accounting / CPA', 'Financial Advisory', 'Insurance Agency', 'Real Estate',
  'Consulting', 'Marketing / Creative Agency', 'IT / MSP', 'E-commerce',
  'Construction / Contracting', 'Other Professional Services',
];

const EMPLOYEE_RANGES = ['Just me', '2–5', '6–10', '11–25', '26–50', '50+'];

const SENSITIVE_DATA_OPTIONS = [
  { id: 'phi', label: 'Health / Medical Records (PHI)', flag: 'HIPAA' },
  { id: 'pii', label: 'Customer Personal Info (PII)' },
  { id: 'payment', label: 'Payment Card Data', flag: 'PCI DSS' },
  { id: 'financial', label: 'Financial Records' },
  { id: 'legal', label: 'Confidential Legal Documents' },
  { id: 'federal', label: 'Federal / Government Data', flag: 'CMMC' },
  { id: 'children', label: "Children's Data", flag: 'COPPA' },
];

const CLOUD_PROVIDERS = [
  'Microsoft 365 / Azure', 'Google Workspace', 'AWS',
  'Dropbox', 'Salesforce', 'QuickBooks Online', 'Other / None',
];

const EMAIL_PROVIDERS = [
  'Microsoft 365 (Outlook)', 'Google Workspace (Gmail)',
  'Other hosted email', 'On-premise mail server',
];

function Section({ title, children }) {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function SettingsView() {
  const { profile, setProfile, controlStatuses, updateControlStatus, scoring } = useApp();
  const [saved, setSaved] = useState(false);

  function updateProfile(key, value) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetToDemo() {
    if (window.confirm('This will reset all control statuses to the demo state. Continue?')) {
      const demo = generateDemoStatuses();
      Object.entries(demo).forEach(([id, entry]) => {
        updateControlStatus(id, entry.status, entry.notes);
      });
    }
  }

  function markAllPassing() {
    if (window.confirm('Mark all 25 controls as passing?')) {
      CONTROLS_CATALOG.forEach((c) => updateControlStatus(c.id, STATUS.PASS));
    }
  }

  function clearAllData() {
    if (window.confirm('This will clear ALL SecurityOS data and reset the app. This cannot be undone. Continue?')) {
      localStorage.removeItem('securityos_v1');
      window.location.reload();
    }
  }

  const passCount = scoring.summary.passing;
  const failCount = scoring.summary.failing + scoring.summary.unknown;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your business profile and preferences.</p>
      </div>

      {/* Business Profile */}
      <Section title="Business Profile">
        <Field label="Business Name">
          <input
            type="text"
            value={profile.businessName}
            onChange={(e) => updateProfile('businessName', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </Field>

        <Field label="Industry">
          <select
            value={profile.industry}
            onChange={(e) => updateProfile('industry', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>

        <Field label="Number of Employees">
          <div className="grid grid-cols-3 gap-2">
            {EMPLOYEE_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => updateProfile('employeeCount', r)}
                className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  profile.employeeCount === r
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Email Provider">
          <div className="space-y-1.5">
            {EMAIL_PROVIDERS.map((p) => (
              <button
                key={p}
                onClick={() => updateProfile('emailProvider', p)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                  profile.emailProvider === p
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {profile.emailProvider === p && <Check size={12} className="inline mr-2 text-indigo-400" />}
                {p}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cloud Platforms">
          <div className="flex flex-wrap gap-2">
            {CLOUD_PROVIDERS.map((cp) => {
              const sel = profile.cloudProviders?.includes(cp);
              return (
                <button
                  key={cp}
                  onClick={() =>
                    updateProfile(
                      'cloudProviders',
                      sel
                        ? (profile.cloudProviders || []).filter((x) => x !== cp)
                        : [...(profile.cloudProviders || []), cp]
                    )
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                    sel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {sel && <Check size={10} className="inline mr-1" />}
                  {cp}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Sensitive Data Handled">
          <div className="space-y-1.5">
            {SENSITIVE_DATA_OPTIONS.map((item) => {
              const sel = profile.sensitiveData?.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    updateProfile(
                      'sensitiveData',
                      sel
                        ? (profile.sensitiveData || []).filter((x) => x !== item.id)
                        : [...(profile.sensitiveData || []), item.id]
                    )
                  }
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all flex items-center justify-between ${
                    sel ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {sel && <Check size={12} className="text-indigo-400" />}
                    {item.label}
                  </span>
                  {item.flag && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">{item.flag}</span>
                  )}
                </button>
              );
            })}
          </div>
        </Field>

        <button
          onClick={handleSave}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            saved ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {saved ? '✓ Saved' : 'Save Profile'}
        </button>
      </Section>

      {/* Security stats */}
      <Section title="Security Status">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{scoring.totalScore}</p>
            <p className="text-xs text-slate-500">Score</p>
          </div>
          <div className="bg-green-500/10 rounded-xl p-3">
            <p className="text-2xl font-bold text-green-400">{passCount}</p>
            <p className="text-xs text-slate-500">Passing</p>
          </div>
          <div className="bg-red-500/10 rounded-xl p-3">
            <p className="text-2xl font-bold text-red-400">{failCount}</p>
            <p className="text-xs text-slate-500">Issues</p>
          </div>
        </div>
      </Section>

      {/* Integrations (coming soon) */}
      <Section title="Integrations">
        <p className="text-sm text-slate-400 mb-3">
          Connect SecurityOS to your cloud platforms for automatic evidence collection.
        </p>
        <div className="space-y-2">
          {[
            { name: 'Microsoft 365', icon: '📧', status: 'coming_soon' },
            { name: 'Google Workspace', icon: '🔵', status: 'coming_soon' },
            { name: 'AWS', icon: '☁️', status: 'coming_soon' },
            { name: 'Azure', icon: '🔷', status: 'coming_soon' },
          ].map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{integration.icon}</span>
                <span className="text-sm text-slate-300">{integration.name}</span>
              </div>
              <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Data management */}
      <Section title="Data & Reset">
        <div className="space-y-2">
          <button
            onClick={resetToDemo}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white text-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <RefreshCw size={15} /> Reset to demo data
            </span>
            <ChevronRight size={15} className="text-slate-500" />
          </button>
          <button
            onClick={markAllPassing}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white text-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <Check size={15} /> Mark all controls as passing
            </span>
            <ChevronRight size={15} className="text-slate-500" />
          </button>
          <button
            onClick={clearAllData}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-red-500/30 text-red-400 hover:border-red-400 text-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <Trash2 size={15} /> Clear all data &amp; reset
            </span>
            <ChevronRight size={15} className="text-red-500" />
          </button>
        </div>
      </Section>

      {/* About */}
      <Section title="About SecurityOS">
        <div className="space-y-2 text-sm text-slate-400">
          <p>SecurityOS v0.1.0 — MVP</p>
          <p>25 controls mapped to NIST CSF 2.0, CIS Controls v8, and industry frameworks.</p>
          <p>Built for small businesses (1–25 employees) that handle sensitive customer information.</p>
          <div className="pt-2 border-t border-slate-800 text-xs text-slate-600">
            <p>Control framework: NIST CSF 2.0 (primary), CIS Controls v8, HIPAA Security Rule, PCI DSS, FTC Safeguards Rule</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
