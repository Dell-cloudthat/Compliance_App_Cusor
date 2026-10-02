import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import OnboardingView from './views/securityos/OnboardingView';
import AnalysisView from './views/securityos/AnalysisView';
import HomeView from './views/securityos/HomeView';
import FixView from './views/securityos/FixView';
import CopilotView from './views/securityos/CopilotView';
import PassportView from './views/securityos/PassportView';
import SettingsView from './views/securityos/SettingsView';
import { calculateScore, buildDemoStatuses } from './data/scoring';
import { loadCatalog } from './data/controls';
import { Home, Bot, BadgeCheck, Settings } from 'lucide-react';

// ── App Context ───────────────────────────────────────────────────────────────
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const STORAGE_KEY = 'securityos_v2';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

const DEFAULT_PROFILE = {
  businessName: '', industry: '', employeeCount: '',
  emailProvider: '', cloudProviders: [], sensitiveData: [],
};

// ── Bottom Nav ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'copilot', label: 'Copilot', icon: Bot },
  { id: 'passport', label: 'Passport', icon: BadgeCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function SecurityOSApp() {
  const saved = loadState();
  const catalog = loadCatalog();

  const [profile, setProfile] = useState(saved?.profile ?? DEFAULT_PROFILE);
  const [statuses, setStatuses] = useState(saved?.statuses ?? buildDemoStatuses());
  const [view, setView] = useState('home');           // home | copilot | passport | settings
  const [fixControlId, setFixControlId] = useState(null); // when non-null, show FixView
  const [phase, setPhase] = useState(saved ? 'app' : 'onboarding'); // onboarding | analysis | app

  const scoring = calculateScore(statuses, profile, catalog);

  useEffect(() => {
    saveState({ profile, statuses });
  }, [profile, statuses]);

  const updateStatus = useCallback((controlId, status, notes = null, evidenceSource = 'manual') => {
    setStatuses(prev => ({
      ...prev,
      [controlId]: { status, notes, evidence_source: evidenceSource, last_checked: new Date().toISOString() },
    }));
  }, []);

  function completeOnboarding() {
    setPhase('analysis');
  }

  function completeAnalysis() {
    setPhase('app');
  }

  function openFix(controlId) {
    setFixControlId(controlId);
  }

  function closeFix() {
    setFixControlId(null);
  }

  const ctx = { profile, setProfile, statuses, updateStatus, scoring, catalog, openFix };

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
          {fixControlId ? (
            <FixView controlId={fixControlId} onBack={closeFix} />
          ) : (
            <>
              {view === 'home'     && <HomeView />}
              {view === 'copilot'  && <CopilotView />}
              {view === 'passport' && <PassportView />}
              {view === 'settings' && <SettingsView />}
            </>
          )}
        </main>

        {/* Bottom nav — always visible */}
        {!fixControlId && (
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
