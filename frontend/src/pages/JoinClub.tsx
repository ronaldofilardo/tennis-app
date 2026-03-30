// frontend/src/pages/JoinClub.tsx
// Página pública para entrar em um clube via código de convite.
// Rota: /join/:code

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { httpClient } from '../config/httpClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../components/Toast';
import './JoinClub.css';

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
      setError('Código de convite inválido.');
      setLoading(false);
      return;
    }

    const fetchClub = async () => {
      try {
        const response = await httpClient.get<ClubPreview>(`/clubs/invite/${code}`);
        setClub(response.data);
      } catch {
        setError('Código de convite inválido ou expirado.');
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
      toast.info('Faça login para entrar no clube.');
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
      const message = err instanceof Error ? err.message : 'Erro ao entrar no clube';
      toast.error(message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="join-club-page">
        <div className="join-club-card">
          <div className="join-club-loading">Verificando convite...</div>
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="join-club-page">
        <div className="join-club-card">
          <div className="join-club-error-icon">❌</div>
          <h2 className="join-club-title">Convite Inválido</h2>
          <p className="join-club-description">{error || 'Clube não encontrado.'}</p>
          <button className="join-club-btn-secondary" onClick={() => navigation.replace('/')}>
            Ir para o início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-club-page">
      <div className="join-club-card">
        <h2 className="join-club-title">{club.name}</h2>
        <p className="join-club-subtitle">convida você para entrar no clube</p>

        {club.memberCount !== undefined && (
          <p className="join-club-member-count">👥 {club.memberCount} membros</p>
        )}

        {alreadyMember ? (
          <>
            <p className="join-club-already-member">✅ Você já é membro deste clube!</p>
            <button
              className="join-club-btn-primary"
              onClick={() => navigation.navigateToDashboard()}
            >
              Ir ao Dashboard
            </button>
          </>
        ) : (
          <>
            {!currentUser && (
              <p className="join-club-login-note">
                Você precisará fazer login ou criar uma conta para continuar.
              </p>
            )}
            <button className="join-club-btn-primary" onClick={handleJoin} disabled={joining}>
              {joining ? 'Entrando...' : currentUser ? 'Entrar no Clube' : 'Login para Entrar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinClubPage;
