// frontend/src/App.tsx (Refatorado com Multi-tenancy, JWT Auth e Torneios)

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import MatchSetup from "./pages/MatchSetup";
import ScoreboardV2 from "./pages/ScoreboardV2";
import AuthPage from "./pages/AuthPage";
import TournamentDashboard from "./pages/TournamentDashboard";
import GestorDashboard from "./pages/GestorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import JoinClubPage from "./pages/JoinClub";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { MatchesProvider, useMatches } from "./contexts/MatchesContext";
import {
  NavigationProvider,
  useNavigation,
} from "./contexts/NavigationContext";
import { ToastProvider } from "./components/Toast";
import ClubSelector from "./components/ClubSelector";
import OfflineBanner from "./components/OfflineBanner";

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

  const isGestor = activeClub?.role === "GESTOR";

  const isAdmin = activeClub?.role === "ADMIN";

  return (
    <div className="app-container">
      {/* ── Banner offline/sync — sticky no topo, visível em toda app ── */}
      <OfflineBanner />
      <header className="app-header">
        <h1>RacketApp</h1>
        {isAuthenticated && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <ClubSelector variant="dropdown" />
            {isAdmin && (
              <button
                onClick={navigateToAdminDashboard}
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.25)",
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🔑 Admin
              </button>
            )}
            {isGestor && (
              <button
                onClick={navigateToGestorDashboard}
                style={{
                  background: "rgba(234,179,8,0.12)",
                  color: "#eab308",
                  border: "1px solid rgba(234,179,8,0.25)",
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                👔 Painel Gestor
              </button>
            )}
            {currentUser && (
              <span style={{ fontSize: 12 }}>
                {currentUser.name || currentUser.email}
              </span>
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
                    onContinueMatch={(match, initialState) =>
                      navigateToMatch(match.id.toString(), initialState)
                    }
                    onStartMatch={(match) =>
                      navigateToMatch(match.id.toString())
                    }
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
                  <Navigate to={isAdmin ? "/admin" : "/dashboard"} />
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
                <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
              )
            }
          />

          {/* Torneios */}
          <Route
            path="/tournaments"
            element={
              isAuthenticated ? (
                <TournamentDashboard />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Entrar no Clube via convite (público) */}
          <Route path="/join/:code" element={<JoinClubPage />} />

          {/* Rota Padrão */}
          <Route
            path="*"
            element={
              <Navigate
                to={
                  isAuthenticated
                    ? isAdmin
                      ? "/admin"
                      : isGestor
                        ? "/gestor"
                        : "/dashboard"
                    : "/login"
                }
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
