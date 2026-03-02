// frontend/src/pages/AuthPage.tsx
// Página de Login e Registro unificada — Fase 1: Identidade

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import "./AuthPage.css";

type AuthMode = "login" | "register";

const AuthPage: React.FC = () => {
  const {
    login,
    register,
    loading,
    error,
    clearError,
    isAuthenticated,
    currentUser,
    activeClub,
  } = useAuth();
  const {
    navigateToDashboard,
    navigateToAdminDashboard,
    navigateToGestorDashboard,
  } = useNavigation();

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Se já autenticado, redirecionar com base no papel do clube ativo
  React.useEffect(() => {
    if (isAuthenticated && currentUser) {
      const role = activeClub?.role || currentUser.activeRole;
      if (role === "ADMIN") {
        navigateToAdminDashboard();
      } else if (role === "GESTOR") {
        navigateToGestorDashboard();
      } else {
        navigateToDashboard();
      }
    }
  }, [isAuthenticated, activeClub?.role, currentUser?.activeRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (mode === "register") {
      if (!name.trim()) {
        setLocalError("Informe seu nome.");
        return;
      }
      if (password.length < 6) {
        setLocalError("Senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("As senhas não conferem.");
        return;
      }
      await register(name.trim(), email.trim(), password);
    } else {
      await login(email.trim(), password);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setLocalError(null);
    clearError();
    setConfirmPassword("");
  };

  const displayError = localError || error;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🎾</span>
          <h1>RacketApp</h1>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Entre na sua conta"
              : "Crie sua conta gratuitamente"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="auth-name">Nome completo</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                disabled={loading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Senha</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "register" ? "Mínimo 6 caracteres" : "Sua senha"
              }
              disabled={loading}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
            />
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="auth-confirm">Confirmar senha</label>
              <input
                id="auth-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {displayError && (
            <div className="auth-error" role="alert">
              {displayError}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "login" ? (
            <p>
              Não tem conta?{" "}
              <button type="button" onClick={toggleMode} className="auth-link">
                Registre-se
              </button>
            </p>
          ) : (
            <p>
              Já tem conta?{" "}
              <button type="button" onClick={toggleMode} className="auth-link">
                Faça login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
