import { useState, useEffect, createContext, useContext } from 'react';
import DashboardView from './views/securityos/DashboardView';
import OnboardingView from './views/securityos/OnboardingView';
import ControlsView from './views/securityos/ControlsView';
import AICopilotView from './views/securityos/AICopilotView';
import TrustPassportView from './views/securityos/TrustPassportView';
import SettingsView from './views/securityos/SettingsView';
import { calculateScore, generateDemoStatuses } from './data/scoring';
import { STATUS } from './data/controls';
import {
  LayoutDashboard, ShieldCheck, Bot, BadgeCheck, Settings,
  AlertTriangle, Bell, Menu, X,
} from 'lucide-react';

// ─── App Context ──────────────────────────────────────────────────────────────
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const STORAGE_KEY = 'securityos_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const DEFAULT_PROFILE = {
  businessName: '',
  industry: '',
  employeeCount: '',
  revenueRange: '',
  cloudProviders: [],
  emailProvider: '',
  sensitiveData: [],
  hasInsurance: null,
  regulatoryExposure: [],
};

// ─── Navigation ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'controls', label: 'Fix Issues', icon: ShieldCheck },
  { id: 'copilot', label: 'AI Copilot', icon: Bot },
  { id: 'passport', label: 'Trust Passport', icon: BadgeCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function SecurityOSApp() {
  const saved = loadState();

  const [profile, setProfile] = useState(saved?.profile ?? DEFAULT_PROFILE);
  const [controlStatuses, setControlStatuses] = useState(
    saved?.controlStatuses ?? generateDemoStatuses()
  );
  const [currentView, setCurrentView] = useState('dashboard');
  const [onboardingComplete, setOnboardingComplete] = useState(saved?.onboardingComplete ?? false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedControlId, setSelectedControlId] = useState(null);

  const scoring = calculateScore(controlStatuses);

  useEffect(() => {
    saveState({ profile, controlStatuses, onboardingComplete });
  }, [profile, controlStatuses, onboardingComplete]);

  function updateControlStatus(controlId, status, notes = null) {
    setControlStatuses((prev) => ({
      ...prev,
      [controlId]: {
        status,
        notes,
        lastChecked: new Date().toISOString(),
      },
    }));
  }

  function navigateTo(view, controlId = null) {
    setCurrentView(view);
    setSelectedControlId(controlId);
    setSidebarOpen(false);
  }

  if (!onboardingComplete) {
    return (
      <OnboardingView
        profile={profile}
        setProfile={setProfile}
        onComplete={() => setOnboardingComplete(true)}
      />
    );
  }

  const contextValue = {
    profile,
    setProfile,
    controlStatuses,
    updateControlStatus,
    scoring,
    navigateTo,
    selectedControlId,
    setSelectedControlId,
  };

  const issueCount = scoring.summary.failing + scoring.summary.unknown;

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800
            flex flex-col transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:relative lg:translate-x-0 lg:flex
          `}
        >
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <ShieldCheck size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">SecurityOS</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Score pill */}
          <div className="mx-4 mt-4 mb-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Security Score</p>
                <p className="text-2xl font-bold text-white">{scoring.totalScore}</p>
              </div>
              <ScoreRing score={scoring.totalScore} size={44} />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <Icon size={18} />
                  {item.label}
                  {item.id === 'controls' && issueCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {issueCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              {profile.businessName || 'Your Business'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Last checked: just now
            </p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar (mobile) */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                <ShieldCheck size={12} className="text-white" />
              </div>
              <span className="font-bold text-sm">SecurityOS</span>
            </div>
            <button className="relative text-slate-400 hover:text-white">
              <Bell size={20} />
              {issueCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {Math.min(issueCount, 9)}
                </span>
              )}
            </button>
          </header>

          {/* View content */}
          <main className="flex-1 overflow-y-auto">
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'controls' && <ControlsView />}
            {currentView === 'copilot' && <AICopilotView />}
            {currentView === 'passport' && <TrustPassportView />}
            {currentView === 'settings' && <SettingsView />}
          </main>

          {/* Bottom tab bar (mobile) */}
          <nav className="lg:hidden flex border-t border-slate-800 bg-slate-900">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors relative
                    ${active ? 'text-indigo-400' : 'text-slate-500'}`}
                >
                  <Icon size={20} />
                  <span className="text-[10px]">{item.label}</span>
                  {item.id === 'controls' && issueCount > 0 && (
                    <span className="absolute top-1 right-1/4 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                      {Math.min(issueCount, 9)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </AppContext.Provider>
  );
}

// ─── Score Ring SVG ───────────────────────────────────────────────────────────
export function ScoreRing({ score, size = 80, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;

  const color =
    score >= 90 ? '#22c55e' :
    score >= 75 ? '#6366f1' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' :
    '#ef4444';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1e293b"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={progress}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}
