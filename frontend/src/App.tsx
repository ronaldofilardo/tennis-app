// frontend/src/App.tsx (Refatorado com Context API - Fase 3 Completa)

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Dashboard from './pages/Dashboard';
import MatchSetup from './pages/MatchSetup';
import ScoreboardV2 from './pages/ScoreboardV2';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MatchesProvider, useMatches } from './contexts/MatchesContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import MOCK_PLAYERS from './data/players';

function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <MatchesProvider>
          <AppContent />
        </MatchesProvider>
      </AuthProvider>
    </NavigationProvider>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { matches, loading, error, addMatch } = useMatches();
  const { navigateToDashboard, navigateToMatch, navigateToNewMatch, navigateToLogin } = useNavigation();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>RacketApp</h1>
        {isAuthenticated && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            {currentUser && <span style={{ fontSize: 12 }}>{currentUser.role === 'annotator' ? 'Anotador' : 'Player'}: {currentUser.email}</span>}
            <button onClick={() => { logout(); navigateToLogin(); }}>Logout</button>
          </div>
        )}
      </header>

      <main>
        <Routes>
          {/* Rota de Login */}
          <Route path="/login" element={<LoginForm />} />

          {/* Rota do Dashboard */}
          <Route path="/dashboard" element={
            isAuthenticated ? (
              <Dashboard
                onNewMatchClick={navigateToNewMatch}
                onContinueMatch={(match, initialState) => navigateToMatch(match.id.toString(), initialState)}
                onStartMatch={(match) => navigateToMatch(match.id.toString())}
                matches={matches}
                loading={loading}
                error={error}
                currentUser={currentUser}
                players={MOCK_PLAYERS}
              />
            ) : <Navigate to="/login" />
          } />

          {/* Rota de Criação de Partida */}
          <Route path="/match/new" element={
            isAuthenticated ? (
              <MatchSetup
                onBackToDashboard={navigateToDashboard}
                onMatchCreated={(matchData) => {
                  addMatch(matchData);
                  navigateToMatch(matchData.id);
                }}
                players={MOCK_PLAYERS}
              />
            ) : <Navigate to="/login" />
          } />

          {/* Rota do Placar (dinâmica com ID da partida) */}
          <Route path="/match/:matchId" element={
            isAuthenticated ? (
              <ScoreboardV2
                onEndMatch={navigateToDashboard}
              />
            ) : <Navigate to="/login" />
          } />

          {/* Rota Padrão (redireciona para login ou dashboard) */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </main>
    </div>
  );
};

const LoginForm: React.FC = () => {
  const { login, loading, error } = useAuth();
  const { navigateToDashboard } = useNavigation();

  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginEmail, loginPassword);
      navigateToDashboard();
    } catch {
      // Error is handled by AuthContext
    }
  };

  return (
    <div className="login-card" style={{ maxWidth: 420, margin: '32px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Login (local)</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label>Email</label>
          <input
            type="email"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            style={{ width: '100%' }}
            disabled={loading}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Senha</label>
          <input
            type="password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            style={{ width: '100%' }}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        {error && <p style={{color: 'red', fontSize: '0.9em', marginTop: '8px'}}>{error}</p>}
      </form>
    </div>
  );
}

export default App;
