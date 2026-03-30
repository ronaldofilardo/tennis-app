import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { httpClient } from '../config/httpClient';
import { logger } from '../services/logger';

const matchesLog = logger.createModuleLogger('MatchesContext');

interface CompletedSet {
  setNumber: number;
  games: { PLAYER_1: number; PLAYER_2: number };
  winner: 'PLAYER_1' | 'PLAYER_2';
}

/**
 * MatchData representa o contrato completo da API GET /matches/visible.
 * REGRA: ao adicionar um campo novo no Prisma schema + matchService.getVisibleMatches,
 * basta adicionar aqui também. O Dashboard usa "match as any" para campos extras,
 * mas tipificar aqui garante autocompletar e segurança de tipos.
 */
interface MatchData {
  id: string;
  sportType: string;
  sport?: string;
  format?: string;
  courtType?: 'CLAY' | 'HARD' | 'GRASS' | null;
  nickname?: string | null;
  players?: { p1: string; p2: string };
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  score?: string;
  winner?: string | null;
  completedSets?: CompletedSet[];
  matchState?: Record<string, unknown> | null;
  visibleTo?: string;
  apontadorEmail?: string;
  playersEmails?: string[];
}

// Schema Zod para validação da resposta da API GET /matches/visible.
// Uso de passthrough() para campos extras que o servidor possa retornar sem quebrar.
const MatchDataSchema = z
  .object({
    id: z.string(),
    sportType: z.string(),
    sport: z.string().optional(),
    format: z.string().optional(),
    courtType: z.enum(['CLAY', 'HARD', 'GRASS']).nullable().optional(),
    nickname: z.string().nullable().optional(),
    players: z.object({ p1: z.string(), p2: z.string() }).optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    score: z.string().optional(),
    winner: z.string().nullable().optional(),
    completedSets: z.array(z.unknown()).optional(),
    matchState: z.record(z.unknown()).nullable().optional(),
    visibleTo: z.string().optional(),
    apontadorEmail: z.string().optional(),
    playersEmails: z.array(z.string()).optional(),
  })
  .passthrough();

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

  const fetchMatches = async (signal?: AbortSignal) => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Usa httpClient que injeta automaticamente o Authorization header a partir do JWT.
      // O email/role são extraídos no servidor pelo middleware de autenticação,
      // nunca devem ser enviados em query string (fica em logs/histórico do browser).
      const response = await httpClient.get<unknown[]>('/matches/visible', {
        signal,
        timeout: 10_000,
      });

      // Valida o schema da resposta para detectar quebras de contrato da API antecipadamente.
      const parseResult = z.array(MatchDataSchema).safeParse(response.data);
      if (!parseResult.success) {
        matchesLog.warn('Resposta da API /matches/visible não passou na validação Zod', {
          issues: parseResult.error.issues.slice(0, 5),
        });
        // Degradação graciosa: usa os dados mesmo assim (não bloqueia o UI)
        setMatches(response.data as MatchData[]);
      } else {
        setMatches(parseResult.data as MatchData[]);
      }
    } catch (err) {
      // Ignorar cancelamentos originados pelo cleanup do useEffect
      if (err instanceof Error && err.name === 'AbortError') return;
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addMatch = (newMatch: MatchData) => {
    setMatches((prev) => [newMatch, ...prev]);
  };

  const refreshMatches = async () => {
    await fetchMatches();
  };

  // Carrega partidas quando o dashboard é acessado e usuário está autenticado
  useEffect(() => {
    if (location.pathname === '/dashboard' && isAuthenticated && currentUser) {
      const controller = new AbortController();
      fetchMatches(controller.signal);
      return () => controller.abort();
    }
  }, [location.pathname, isAuthenticated, currentUser?.email]); // Adicionada dependência específica

  const value: MatchesContextType = {
    matches,
    loading,
    error,
    refreshMatches,
    addMatch,
  };

  return <MatchesContext.Provider value={value}>{children}</MatchesContext.Provider>;
};

export const useMatches = (): MatchesContextType => {
  const context = useContext(MatchesContext);
  if (context === undefined) {
    throw new Error('useMatches must be used within a MatchesProvider');
  }
  return context;
};
