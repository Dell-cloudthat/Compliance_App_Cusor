import { useState, useEffect, useCallback, useMemo } from 'react';
import ComplianceMVP from './ComplianceMVP';
import LoginPage from './components/LoginPage';
import LandingPage from './pages/LandingPage';
import InviteRedeemPage from './pages/InviteRedeemPage';
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

  if (!isAuthenticated) {
    if (publicScreen === 'invite' && inviteToken) {
      return (
        <InviteRedeemPage
          token={inviteToken}
          onAuth={handleAuth}
          onBackToLanding={() => setPublicScreen('landing')}
        />
      );
    }
    if (publicScreen === 'login') {
      return <LoginPage onAuth={handleAuth} />;
    }
    return <LandingPage onRequestLogin={() => setPublicScreen('login')} />;
  }

  return <ComplianceMVP onLogout={handleLogout} />;
}

export default App;
