import { useState, useEffect, useCallback } from 'react';
import type { AnnotatedMatch } from '../components/AnnotatedMatchCard';
import type { OpenMatch } from '../components/OpenMatchCard';
import type { CompletedMatch } from '../components/CompletedMatchCard';
import { API_URL } from '../config/api';

interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
  activeClubId?: string | null;
  [key: string]: unknown;
}

interface UseDashboardDataReturn {
  openMatches: OpenMatch[];
  openMatchesLoading: boolean;
  annotatedMatches: AnnotatedMatch[];
  setAnnotatedMatches: React.Dispatch<React.SetStateAction<AnnotatedMatch[]>>;
  annotatedByMe: AnnotatedMatch[];
  setAnnotatedByMe: React.Dispatch<React.SetStateAction<AnnotatedMatch[]>>;
  annotatedLoading: boolean;
  completedMatches: CompletedMatch[];
  setCompletedMatches: React.Dispatch<React.SetStateAction<CompletedMatch[]>>;
  completedLoading: boolean;
  setOpenMatches: React.Dispatch<React.SetStateAction<OpenMatch[]>>;
  refetchCompleted: () => void;
}

export function useDashboardData(authUser: AuthUser | null | undefined): UseDashboardDataReturn {
  const [openMatches, setOpenMatches] = useState<OpenMatch[]>([]);
  const [openMatchesLoading, setOpenMatchesLoading] = useState(false);
  const [annotatedMatches, setAnnotatedMatches] = useState<AnnotatedMatch[]>([]);
  const [annotatedByMe, setAnnotatedByMe] = useState<AnnotatedMatch[]>([]);
  const [annotatedLoading, setAnnotatedLoading] = useState(false);
  const [completedMatches, setCompletedMatches] = useState<CompletedMatch[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);

  // ── Fetch open-for-annotation matches ────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    setOpenMatchesLoading(true);
    const _token = localStorage.getItem('racket_token') ?? '';
    fetch(`${API_URL}/matches/open-for-annotation`, {
      headers: { Authorization: `Bearer ${_token}` },
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown[]) => {
        if (!Array.isArray(data)) {
          setOpenMatches([]);
          return;
        }
        const normalized: OpenMatch[] = data.map((m: unknown) => {
          const raw = m as Record<string, unknown>;
          const players =
            raw.players && typeof raw.players === 'object'
              ? (raw.players as { p1: string; p2: string })
              : { p1: (raw.playerP1 as string) ?? '', p2: (raw.playerP2 as string) ?? '' };
          return { ...(raw as Omit<OpenMatch, 'players'>), players } as OpenMatch;
        });
        setOpenMatches(normalized);
      })
      .catch(() => setOpenMatches([]))
      .finally(() => setOpenMatchesLoading(false));
  }, [authUser]);

  // ── Fetch annotated matches ─────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    setAnnotatedLoading(true);
    const _token = localStorage.getItem('racket_token') ?? '';
    const headers = { Authorization: `Bearer ${_token}` };
    Promise.all([
      fetch(`${API_URL}/matches/annotated-for-me`, { headers, credentials: 'include' })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${API_URL}/matches/annotated-by-me`, { headers, credentials: 'include' })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([forMe, byMe]) => {
        setAnnotatedMatches(Array.isArray(forMe) ? (forMe as AnnotatedMatch[]) : []);
        setAnnotatedByMe(Array.isArray(byMe) ? (byMe as AnnotatedMatch[]) : []);
      })
      .finally(() => setAnnotatedLoading(false));
  }, [authUser]);

  // ── Fetch completed matches ────────────────────────────────────────────────
  const fetchCompleted = useCallback(() => {
    if (!authUser) return;
    setCompletedLoading(true);
    const _token = localStorage.getItem('racket_token') ?? '';
    fetch(`${API_URL}/matches/my-completed`, {
      headers: { Authorization: `Bearer ${_token}` },
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        setCompletedMatches(Array.isArray(data) ? (data as CompletedMatch[]) : []);
      })
      .catch(() => setCompletedMatches([]))
      .finally(() => setCompletedLoading(false));
  }, [authUser]);

  useEffect(() => {
    fetchCompleted();
  }, [fetchCompleted]);

  return {
    openMatches,
    openMatchesLoading,
    annotatedMatches,
    setAnnotatedMatches,
    annotatedByMe,
    setAnnotatedByMe,
    annotatedLoading,
    completedMatches,
    setCompletedMatches,
    completedLoading,
    setOpenMatches,
    refetchCompleted: fetchCompleted,
  };
}
