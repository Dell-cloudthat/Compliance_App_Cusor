import { useState, useEffect, useCallback } from 'react';
import ComplianceMVP from './ComplianceMVP';
import LoginPage from './components/LoginPage';
import api from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!api.getToken());

  const handleAuth = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    api.logout();
    setIsAuthenticated(false);
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
    return <LoginPage onAuth={handleAuth} />;
  }

  return <ComplianceMVP onLogout={handleLogout} />;
}

export default App;
