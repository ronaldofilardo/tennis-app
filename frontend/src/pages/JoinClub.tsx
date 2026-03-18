// frontend/src/pages/JoinClub.tsx
// Página pública para entrar em um clube via código de convite.
// Rota: /join/:code

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import httpClient from "../config/httpClient";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { useToast } from "../components/Toast";

interface ClubPreview {
  id: string;
  name: string;
  slug: string;
  memberCount?: number;
}

const JoinClubPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { currentUser, refreshUser } = useAuth();
  const navigation = useNavigation();
  const toast = useToast();

  const [club, setClub] = useState<ClubPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  // Fetch club info by invite code
  useEffect(() => {
    if (!code) {
      setError("Código de convite inválido.");
      setLoading(false);
      return;
    }

    const fetchClub = async () => {
      try {
        const response = await httpClient.get<ClubPreview>(
          `/clubs/invite/${code}`,
        );
        setClub(response.data);
      } catch {
        setError("Código de convite inválido ou expirado.");
      } finally {
        setLoading(false);
      }
    };

    fetchClub();
  }, [code]);

  // Check if already a member
  useEffect(() => {
    if (club && currentUser) {
      const isMember = currentUser.clubs?.some((c) => c.clubId === club.id);
      setAlreadyMember(!!isMember);
    }
  }, [club, currentUser]);

  const handleJoin = async () => {
    if (!club || !code) return;

    if (!currentUser) {
      // Redirect to login with return URL
      toast.info("Faça login para entrar no clube.");
      navigation.replace(`/login?redirect=/join/${code}`);
      return;
    }

    setJoining(true);
    try {
      await httpClient.post(`/clubs/join`, {
        inviteCode: code,
      });
      toast.success(`Você entrou no clube ${club.name}!`);
      // Refresh user data to include new club
      if (refreshUser) {
        await refreshUser();
      }
      navigation.navigateToDashboard();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao entrar no clube";
      toast.error(message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.loading}>Verificando convite...</div>
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>❌</div>
          <h2 style={styles.title}>Convite Inválido</h2>
          <p style={styles.description}>{error || "Clube não encontrado."}</p>
          <button
            style={styles.btnSecondary}
            onClick={() => navigation.replace("/")}
          >
            Ir para o início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>{club.name}</h2>
        <p style={styles.subtitle}>convida você para entrar no clube</p>

        {club.memberCount !== undefined && (
          <p style={styles.memberCount}>👥 {club.memberCount} membros</p>
        )}

        {alreadyMember ? (
          <>
            <p style={styles.alreadyMember}>✅ Você já é membro deste clube!</p>
            <button
              style={styles.btnPrimary}
              onClick={() => navigation.navigateToDashboard()}
            >
              Ir ao Dashboard
            </button>
          </>
        ) : (
          <>
            {!currentUser && (
              <p style={styles.loginNote}>
                Você precisará fazer login ou criar uma conta para continuar.
              </p>
            )}
            <button
              style={styles.btnPrimary}
              onClick={handleJoin}
              disabled={joining}
            >
              {joining
                ? "Entrando..."
                : currentUser
                  ? "Entrar no Clube"
                  : "Login para Entrar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// === Estilos ===
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "var(--court-bg, #0a0f14)",
  },
  card: {
    maxWidth: 420,
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "40px 32px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    objectFit: "cover",
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    background: "var(--accent-gold, #eab308)",
    color: "#000",
    fontSize: 36,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--text-primary, #f8fafc)",
    margin: 0,
  },
  subtitle: {
    fontSize: 15,
    color: "var(--text-secondary, #8fb8a4)",
    margin: 0,
  },
  memberCount: {
    fontSize: 14,
    color: "var(--text-muted, #4a5e54)",
    margin: "4px 0 12px",
  },
  description: {
    fontSize: 14,
    color: "var(--text-secondary, #8fb8a4)",
    marginBottom: 16,
  },
  alreadyMember: {
    fontSize: 15,
    color: "var(--success-green, #22c55e)",
    fontWeight: 600,
    margin: "12px 0",
  },
  loginNote: {
    fontSize: 13,
    color: "var(--text-muted, #4a5e54)",
    margin: 0,
  },
  loading: {
    fontSize: 15,
    color: "var(--text-secondary, #8fb8a4)",
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  btnPrimary: {
    marginTop: 8,
    padding: "12px 32px",
    background: "var(--accent-gold, #eab308)",
    color: "#000",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
  },
  btnSecondary: {
    marginTop: 8,
    padding: "10px 24px",
    background: "rgba(255,255,255,0.06)",
    color: "var(--text-primary, #f8fafc)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10,
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
  },
};

export default JoinClubPage;
