import { useState, useEffect, useCallback, useMemo } from 'react';
import ComplianceMVP from './ComplianceMVP';
import LoginPage from './components/LoginPage';
import LandingPage from './pages/LandingPage';
import InviteRedeemPage from './pages/InviteRedeemPage';
import ErrorBoundary from './components/ErrorBoundary';
import api from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!api.getToken());

  // Public routing (unauthenticated only): 'landing' | 'login' | 'invite'.
  // No react-router in this app — this is a small state machine gated on
  // the ?invite= query param, matching the existing view-switching pattern.
  const inviteToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite');
  }, []);
  const [publicScreen, setPublicScreen] = useState(inviteToken ? 'invite' : 'landing');

  const handleAuth = useCallback(() => {
    setIsAuthenticated(true);
    // Clean the ?invite= param out of the URL now that it's been redeemed.
    if (inviteToken) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [inviteToken]);

  const handleLogout = useCallback(() => {
    api.logout();
    setIsAuthenticated(false);
    setPublicScreen('landing');
  }, []);

  // If api.js clears the token on a 401, reflect that in UI state.
  // We patch the clearToken method once so the component re-renders.
  useEffect(() => {
    const original = api.clearToken.bind(api);
    api.clearToken = () => {
      original();
      setIsAuthenticated(false);
    };
    return () => {
      api.clearToken = original;
    };
  }, []);

  let screen;
  let resetKey;
  if (!isAuthenticated) {
    if (publicScreen === 'invite' && inviteToken) {
      screen = (
        <InviteRedeemPage
          token={inviteToken}
          onAuth={handleAuth}
          onBackToLanding={() => setPublicScreen('landing')}
        />
      );
      resetKey = 'invite';
    } else if (publicScreen === 'login') {
      screen = <LoginPage onAuth={handleAuth} />;
      resetKey = 'login';
    } else {
      screen = <LandingPage onRequestLogin={() => setPublicScreen('login')} />;
      resetKey = 'landing';
    }
  } else {
    screen = <ComplianceMVP onLogout={handleLogout} />;
    resetKey = 'app';
  }

  return (
    <ErrorBoundary resetKey={resetKey} fallbackLabel="the app">
      {screen}
    </ErrorBoundary>
  );
}

export default App;
