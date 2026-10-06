import { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import OnboardingView from './views/securityos/OnboardingView';
import AnalysisView from './views/securityos/AnalysisView';
import HomeView from './views/securityos/HomeView';
import FixView from './views/securityos/FixView';
import AttestView from './views/securityos/AttestView';
import RiskView from './views/securityos/RiskView';
import CopilotView from './views/securityos/CopilotView';
import PassportView from './views/securityos/PassportView';
import SettingsView from './views/securityos/SettingsView';
import GlobalView from './views/securityos/GlobalView';
import { calculateScore, buildDemoStatuses } from './data/scoring';
import { loadCatalog } from './data/controls';
import { Home, Bot, BadgeCheck, Settings, Globe } from 'lucide-react';

// ── App Context ───────────────────────────────────────────────────────────────
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const STORAGE_KEY_V2 = 'securityos_v2';
const STORAGE_KEY_V3 = 'securityos_v3';

function loadState() {
  try {
    const rawV3 = localStorage.getItem(STORAGE_KEY_V3);
    if (rawV3) return JSON.parse(rawV3);

    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (!rawV2) return null;
    const v2 = JSON.parse(rawV2);
    if (!v2) return null;

    // v2 → v3 migration (single-tenant → multi-tenant)
    const tenantId = 'tenant-1';
    const migrated = {
      activeTenantId: tenantId,
      tenants: [{
        id: tenantId,
        name: v2?.profile?.businessName || 'Tenant 1',
        profile: v2?.profile ?? null,
        statuses: v2?.statuses ?? null,
      }],
    };
    try { localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(migrated)); } catch {}
    return migrated;
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(state)); } catch {}
}

const DEFAULT_PROFILE = {
  businessName: '', industry: '', employeeCount: '',
  emailProvider: '', cloudProviders: [], sensitiveData: [],
};

function makeId(prefix = 'tenant') {
  try {
    // eslint-disable-next-line no-undef
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  } catch {}
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function normalizeTenant(t) {
  const profile = t?.profile ?? DEFAULT_PROFILE;
  const statuses = t?.statuses ?? buildDemoStatuses();
  const name = t?.name ?? profile.businessName ?? 'Tenant';
  const attestations = t?.attestations ?? [];
  return { id: t?.id ?? makeId('tenant'), name, profile, statuses, attestations };
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'global', label: 'Global', icon: Globe },
  { id: 'copilot', label: 'Copilot', icon: Bot },
  { id: 'passport', label: 'Passport', icon: BadgeCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function SecurityOSApp() {
  const saved = loadState();
  const catalog = loadCatalog();

  const [tenants, setTenants] = useState(() => {
    const initial = saved?.tenants?.length ? saved.tenants.map(normalizeTenant) : null;
    if (initial) return initial;
    return [{
      id: 'tenant-1',
      name: 'Tenant 1',
      profile: DEFAULT_PROFILE,
      statuses: buildDemoStatuses(),
    }];
  });
  const [activeTenantId, setActiveTenantId] = useState(() => saved?.activeTenantId ?? tenants?.[0]?.id ?? 'tenant-1');
  const [view, setView] = useState('home');
  const [fixControlId, setFixControlId] = useState(null);
  const [attestControlId, setAttestControlId] = useState(null);
  const [phase, setPhase] = useState(saved ? 'app' : 'onboarding');
  const [riskOpen, setRiskOpen] = useState(false);
  const [activeFramework, setActiveFramework] = useState('all');
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState(null);

  // Ensure active tenant id always points to an existing tenant.
  useEffect(() => {
    if (!tenants.length) return;
    if (tenants.some(t => t.id === activeTenantId)) return;
    setActiveTenantId(tenants[0].id);
  }, [tenants, activeTenantId]);

  const activeTenant = useMemo(() => {
    if (!tenants.length) return null;
    return tenants.find(t => t.id === activeTenantId) ?? tenants[0];
  }, [tenants, activeTenantId]);

  const profile = activeTenant?.profile ?? DEFAULT_PROFILE;
  const statuses = activeTenant?.statuses ?? {};
  const attestations = activeTenant?.attestations ?? [];

  const scoring = calculateScore(statuses, profile, catalog);

  useEffect(() => {
    saveState({ tenants, activeTenantId });
  }, [tenants, activeTenantId]);

  const updateStatus = useCallback((controlId, status, notes = null, evidenceSource = 'manual') => {
    setTenants(prev => prev.map(t => {
      if (t.id !== activeTenantId) return t;
      const nextStatuses = {
        ...(t.statuses ?? {}),
        [controlId]: { status, notes, evidence_source: evidenceSource, last_checked: new Date().toISOString() },
      };
      return { ...t, statuses: nextStatuses };
    }));
  }, [activeTenantId]);

  const setProfile = useCallback((updater) => {
    setTenants(prev => prev.map(t => {
      if (t.id !== activeTenantId) return t;
      const nextProfile = typeof updater === 'function' ? updater(t.profile ?? DEFAULT_PROFILE) : updater;
      return { ...t, profile: nextProfile ?? DEFAULT_PROFILE, name: nextProfile?.businessName || t.name };
    }));
  }, [activeTenantId]);

  function completeOnboarding() {
    setPhase('analysis');
  }

  function completeAnalysis() {
    setPhase('app');
  }

  function openFix(controlId) {
    setFixControlId(controlId);
  }

  function openCopilotWithPrompt(prompt) {
    setCopilotInitialPrompt(prompt);
    setView('copilot');
    setFixControlId(null);
  }

  function clearCopilotPrompt() {
    setCopilotInitialPrompt(null);
  }

  function openFixForTenant(tenantId, controlId) {
    setActiveTenantId(tenantId);
    setFixControlId(controlId);
  }

  function closeFix() {
    setFixControlId(null);
  }

  function openAttest(controlId = null) {
    setAttestControlId(controlId || '__any__');
    setFixControlId(null);
  }

  function closeAttest() {
    setAttestControlId(null);
  }

  const addAttestation = useCallback((attestation) => {
    setTenants(prev => prev.map(t => {
      if (t.id !== activeTenantId) return t;
      return { ...t, attestations: [...(t.attestations ?? []), attestation] };
    }));
  }, [activeTenantId]);

  function openRisk() {
    setRiskOpen(true);
  }

  function closeRisk() {
    setRiskOpen(false);
  }

  const addTenant = useCallback((name = 'New Tenant', seed = 'demo') => {
    const id = makeId('tenant');
    const profile = { ...DEFAULT_PROFILE, businessName: name };
    const statuses = seed === 'empty' ? {} : buildDemoStatuses();
    setTenants(prev => [...prev, { id, name, profile, statuses }]);
    setActiveTenantId(id);
    setView('global');
  }, []);

  const removeTenant = useCallback((tenantId) => {
    setTenants(prev => {
      if (prev.length <= 1) return prev; // always keep at least one tenant
      const next = prev.filter(t => t.id !== tenantId);
      if (tenantId === activeTenantId) setActiveTenantId(next[0]?.id ?? prev[0]?.id);
      return next.length ? next : prev;
    });
  }, [activeTenantId]);

  const renameTenant = useCallback((tenantId, name) => {
    setTenants(prev => prev.map(t => (t.id === tenantId ? { ...t, name, profile: { ...(t.profile ?? DEFAULT_PROFILE), businessName: name } } : t)));
  }, []);

  const switchTenant = useCallback((tenantId) => {
    setActiveTenantId(tenantId);
  }, []);

  const ctx = {
    // Active tenant data (backwards-compatible with existing views)
    profile,
    setProfile,
    statuses,
    updateStatus,
    scoring,
    catalog,
    openFix,
    openFixForTenant,
    openRisk,
    openCopilotWithPrompt,
    clearCopilotPrompt,

    // Attestation APIs
    attestations,
    openAttest,
    closeAttest,
    addAttestation,

    // Framework filtering
    activeFramework,
    setFramework: setActiveFramework,

    // Copilot deep-link
    copilotInitialPrompt,

    // Multi-tenant APIs
    tenants,
    activeTenantId,
    switchTenant,
    addTenant,
    removeTenant,
    renameTenant,
    setView,
    view,
  };

  // ── Render phases ──────────────────────────────────────────────────────────
  if (phase === 'onboarding') {
    return (
      <OnboardingView
        profile={profile}
        setProfile={setProfile}
        onComplete={completeOnboarding}
      />
    );
  }

  if (phase === 'analysis') {
    return <AnalysisView profile={profile} onComplete={completeAnalysis} />;
  }

  // ── Main App ───────────────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={ctx}>
      <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden max-w-lg mx-auto">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {attestControlId ? (
            <AttestView
              preSelectedControlIds={attestControlId !== '__any__' ? [attestControlId] : []}
              onBack={closeAttest}
            />
          ) : fixControlId ? (
            <FixView controlId={fixControlId} onBack={closeFix} />
          ) : riskOpen ? (
            <RiskView onBack={closeRisk} />
          ) : (
            <>
              {view === 'home'     && <HomeView />}
              {view === 'global'   && <GlobalView />}
              {view === 'copilot'  && <CopilotView />}
              {view === 'passport' && <PassportView />}
              {view === 'settings' && <SettingsView />}
            </>
          )}
        </main>

        {/* Bottom nav — always visible */}
        {!fixControlId && !attestControlId && !riskOpen && (
          <nav className="flex border-t border-slate-800 bg-slate-900 shrink-0">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
                    active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </AppContext.Provider>
  );
}

// ── Score Ring SVG ────────────────────────────────────────────────────────────
export function ScoreRing({ score, size = 80, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#22c55e' : score >= 75 ? '#6366f1' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={progress} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
}
