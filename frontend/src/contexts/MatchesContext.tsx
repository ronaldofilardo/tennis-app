import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { API_URL } from '../config/api';

interface CompletedSet {
  setNumber: number;
  games: { PLAYER_1: number; PLAYER_2: number };
  winner: 'PLAYER_1' | 'PLAYER_2';
}

interface MatchData {
  id: string;
  sportType: string;
  format?: string;
  players?: { p1: string; p2: string };
  status?: string;
  createdAt?: string;
  score?: string;
  completedSets?: CompletedSet[];
  winner?: string | null;
}

interface DashboardMatch {
  id: string | number;
  sportType?: string;
  sport?: string;
  players?: { p1: string; p2: string } | string;
  format?: string;
  status?: string;
  createdAt?: string;
  score?: string;
  completedSets?: Array<{ setNumber: number; games: { PLAYER_1: number; PLAYER_2: number }; winner: string }>;
}

interface MatchesContextType {
  matches: MatchData[];
  loading: boolean;
  error: string | null;
  refreshMatches: () => Promise<void>;
  addMatch: (match: MatchData) => void;
}

const MatchesContext = createContext<MatchesContextType | undefined>(undefined);

interface MatchesProviderProps {
  children: ReactNode;
}

export const MatchesProvider: React.FC<MatchesProviderProps> = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();

  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const query = `?email=${encodeURIComponent(currentUser.email)}&role=${encodeURIComponent(currentUser.role)}`;
      const endpoint = `${API_URL}/matches/visible${query}`;
      const res = await fetch(endpoint);

      if (!res.ok) throw new Error('Falha ao carregar partidas');

      const data = await res.json();
      setMatches(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addMatch = (newMatch: MatchData) => {
    setMatches(prev => [newMatch, ...prev]);
  };

  const refreshMatches = async () => {
    await fetchMatches();
  };

  // Carrega partidas quando o dashboard é acessado e usuário está autenticado
  useEffect(() => {
    if (location.pathname === '/dashboard' && isAuthenticated && currentUser) {
      fetchMatches();
    }
  }, [location.pathname, isAuthenticated, currentUser?.email]); // Adicionada dependência específica

  const value: MatchesContextType = {
    matches,
    loading,
    error,
    refreshMatches,
    addMatch,
  };

  return (
    <MatchesContext.Provider value={value}>
      {children}
    </MatchesContext.Provider>
  );
};

export const useMatches = (): MatchesContextType => {
  const context = useContext(MatchesContext);
  if (context === undefined) {
    throw new Error('useMatches must be used within a MatchesProvider');
  }
  return context;
};