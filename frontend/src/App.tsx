// frontend/src/App.tsx (Refatorado com Multi-tenancy, JWT Auth e Torneios)

import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MatchesProvider, useMatches } from './contexts/MatchesContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { ToastProvider } from './components/Toast';
import ClubSelector from './components/ClubSelector';
import OfflineBanner from './components/OfflineBanner';
import LoadingIndicator from './components/LoadingIndicator';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const MatchSetup = React.lazy(() => import('./pages/MatchSetup'));
const ScoreboardV2 = React.lazy(() => import('./pages/ScoreboardV2'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const TournamentDashboard = React.lazy(() => import('./pages/TournamentDashboard'));
const GestorDashboard = React.lazy(() => import('./pages/GestorDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const JoinClubPage = React.lazy(() => import('./pages/JoinClub'));
const MatchDiscovery = React.lazy(() => import('./pages/MatchDiscovery'));
const MatchReport = React.lazy(() => import('./pages/MatchReport'));

function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <MatchesProvider>
          {/* AREA 4: ToastProvider substitui window.alert() — themeable para White Label */}
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </MatchesProvider>
      </AuthProvider>
    </NavigationProvider>
  );
}

const AppContent: React.FC = () => {
  const { isAuthenticated, currentUser, activeClub, logout } = useAuth();
  const { matches, loading, error, addMatch } = useMatches();
  const {
    navigateToDashboard,
    navigateToGestorDashboard,
    navigateToAdminDashboard,
    navigateToMatch,
    navigateToNewMatch,
    navigateToLogin,
  } = useNavigation();

  const navigate = useNavigate();

  const isGestor = activeClub?.role === 'GESTOR';

  const isAdmin = activeClub?.role === 'ADMIN';

  return (
    <div className="app-container">
      {/* ── Banner offline/sync — sticky no topo, visível em toda app ── */}
      <OfflineBanner />
      <header className="app-header">
        <h1>RacketApp</h1>
        {isAuthenticated && (
          <div className="ml-auto flex items-center gap-3">
            <ClubSelector variant="dropdown" />
            {isAdmin && (
              <button
                onClick={navigateToAdminDashboard}
                className="cursor-pointer rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500"
              >
                🔑 Admin
              </button>
            )}
            {isGestor && (
              <button
                onClick={navigateToGestorDashboard}
                className="cursor-pointer rounded-lg border border-yellow-500/25 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-500"
              >
                👔 Painel Gestor
              </button>
            )}
            {currentUser && (
              <span className="text-xs">{currentUser.name || currentUser.email}</span>
            )}
            <button
              onClick={() => {
                logout();
                navigateToLogin();
              }}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main>
        <React.Suspense fallback={<LoadingIndicator />}>
          <Routes>
            {/* Rota de Auth (Login/Registro) */}
            <Route path="/login" element={<AuthPage />} />

            {/* Dashboard — ADMIN e GESTOR são redirecionados */}
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? (
                  isAdmin ? (
                    <Navigate to="/admin" replace />
                  ) : isGestor ? (
                    <Navigate to="/gestor" replace />
                  ) : (
                    <Dashboard
                      onNewMatchClick={navigateToNewMatch}
                      onDiscoverMatches={() => navigate('/partidas')}
                      onContinueMatch={(match, initialState) =>
                        navigateToMatch(match.id.toString(), initialState)
                      }
                      onStartMatch={(match) => navigateToMatch(match.id.toString())}
                      matches={matches}
                      loading={loading}
                      error={error}
                      currentUser={currentUser}
                    />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* Criar Partida */}
            <Route
              path="/match/new"
              element={
                isAuthenticated ? (
                  <MatchSetup
                    onBackToDashboard={navigateToDashboard}
                    onMatchCreated={(matchData) => {
                      addMatch(matchData);
                      navigateToMatch(matchData.id);
                    }}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* Placar */}
            <Route
              path="/match/:matchId"
              element={
                isAuthenticated ? (
                  <ScoreboardV2 onEndMatch={navigateToDashboard} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* Painel do Gestor */}
            <Route
              path="/gestor"
              element={
                isAuthenticated ? (
                  isGestor ? (
                    <GestorDashboard />
                  ) : (
                    <Navigate to={isAdmin ? '/admin' : '/dashboard'} />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* Painel Admin — acesso restrito a ADMIN */}
            <Route
              path="/admin"
              element={
                isAuthenticated && isAdmin ? (
                  <AdminDashboard />
                ) : (
                  <Navigate to={isAuthenticated ? '/dashboard' : '/login'} />
                )
              }
            />

            {/* Torneios */}
            <Route
              path="/tournaments"
              element={isAuthenticated ? <TournamentDashboard /> : <Navigate to="/login" />}
            />

            {/* Entrar no Clube via convite (público) */}
            <Route path="/join/:code" element={<JoinClubPage />} />

            {/* Descobrir partidas */}
            <Route
              path="/partidas"
              element={
                isAuthenticated ? (
                  <MatchDiscovery onBack={() => navigate(-1)} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* Relatório de partida anotada */}
            <Route
              path="/match-report/:matchId/:sessionId"
              element={isAuthenticated ? <MatchReport /> : <Navigate to="/login" />}
            />

            {/* Rota Padrão */}
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    isAuthenticated
                      ? isAdmin
                        ? '/admin'
                        : isGestor
                          ? '/gestor'
                          : '/dashboard'
                      : '/login'
                  }
                />
              }
            />
          </Routes>
        </React.Suspense>
      </main>
    </div>
  );
};

export default App;
