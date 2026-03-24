// tests/phases2-4.test.ts
// Testes de regressão para Phases 2-4 — Decisões Arquiteturais
// Phase 2.1: SPECTATOR read-only
// Phase 2.2: FINISHED immutability
// Phase 2.3: Cross-club PUBLIC read-only
// Phase 3: Tournament isOpenToExternalAthletes
// Phase 4: Annotation sessions logic

import { describe, it, expect, beforeAll } from "vitest";

// ============================================================
// Phase 2.1: SPECTATOR Read-Only — lógica pura replicada
// ============================================================

function canSpectatorPerformWrite(role: string): boolean {
  return role !== "SPECTATOR";
}

describe("Phase 2.1 — SPECTATOR Read-Only", () => {
  it("SPECTATOR não pode criar partidas", () => {
    expect(canSpectatorPerformWrite("SPECTATOR")).toBe(false);
  });

  it("SPECTATOR não pode modificar partidas", () => {
    expect(canSpectatorPerformWrite("SPECTATOR")).toBe(false);
  });

  it("ATHLETE pode criar/modificar partidas", () => {
    expect(canSpectatorPerformWrite("ATHLETE")).toBe(true);
  });

  it("COACH pode criar/modificar partidas", () => {
    expect(canSpectatorPerformWrite("COACH")).toBe(true);
  });

  it("GESTOR pode criar/modificar partidas", () => {
    expect(canSpectatorPerformWrite("GESTOR")).toBe(true);
  });

  it("ADMIN pode criar/modificar partidas", () => {
    expect(canSpectatorPerformWrite("ADMIN")).toBe(true);
  });
});

// ============================================================
// Phase 2.2: FINISHED Immutability — lógica de guarda
// ============================================================

function canModifyMatchByStatus(
  matchStatus: string,
  role: string,
): { allowed: boolean; code: number; error?: string } {
  if (role === "SPECTATOR") {
    return {
      allowed: false,
      code: 403,
      error: "Spectators cannot modify matches",
    };
  }
  if (matchStatus === "FINISHED") {
    return { allowed: false, code: 409, error: "Match already finished" };
  }
  return { allowed: true, code: 200 };
}

describe("Phase 2.2 — FINISHED Immutability", () => {
  it("rejeita PATCH em partida FINISHED com 409", () => {
    const result = canModifyMatchByStatus("FINISHED", "COACH");
    expect(result.allowed).toBe(false);
    expect(result.code).toBe(409);
    expect(result.error).toBe("Match already finished");
  });

  it("permite PATCH em partida IN_PROGRESS", () => {
    const result = canModifyMatchByStatus("IN_PROGRESS", "COACH");
    expect(result.allowed).toBe(true);
    expect(result.code).toBe(200);
  });

  it("permite PATCH em partida NOT_STARTED", () => {
    const result = canModifyMatchByStatus("NOT_STARTED", "ADMIN");
    expect(result.allowed).toBe(true);
  });

  it("SPECTATOR bloqueado antes de chegar no check FINISHED (403 tem prioridade)", () => {
    const result = canModifyMatchByStatus("IN_PROGRESS", "SPECTATOR");
    expect(result.allowed).toBe(false);
    expect(result.code).toBe(403);
  });

  it("SPECTATOR bloqueado mesmo em FINISHED (403 vem antes de 409)", () => {
    const result = canModifyMatchByStatus("FINISHED", "SPECTATOR");
    expect(result.code).toBe(403);
  });
});

// ============================================================
// Phase 2.3: Cross-Club PUBLIC Read-Only
// ============================================================

function canWriteCrossClub(
  matchClubId: string | null,
  userClubId: string,
  userRole: string,
): { allowed: boolean; error?: string } {
  // ADMIN bypassa
  if (userRole === "ADMIN") return { allowed: true };
  // Cross-club: partida de outro clube
  if (matchClubId && matchClubId !== userClubId) {
    return { allowed: false, error: "Cross-club matches are read-only" };
  }
  return { allowed: true };
}

describe("Phase 2.3 — Cross-Club PUBLIC Read-Only", () => {
  it("bloqueia escrita de usuário cross-club", () => {
    const result = canWriteCrossClub("club-A", "club-B", "COACH");
    expect(result.allowed).toBe(false);
    expect(result.error).toBe("Cross-club matches are read-only");
  });

  it("permite escrita de usuário do mesmo clube", () => {
    const result = canWriteCrossClub("club-A", "club-A", "COACH");
    expect(result.allowed).toBe(true);
  });

  it("ADMIN pode escrever cross-club", () => {
    const result = canWriteCrossClub("club-A", "club-B", "ADMIN");
    expect(result.allowed).toBe(true);
  });

  it("partida sem clubId (avulsa) permite escrita", () => {
    const result = canWriteCrossClub(null, "club-A", "ATHLETE");
    expect(result.allowed).toBe(true);
  });
});

// ============================================================
// Phase 3: Tournament isOpenToExternalAthletes
// ============================================================

function canAthleteEnrollInTournament(
  tournamentClubId: string,
  athleteClubId: string | null,
  isOpenToExternalAthletes: boolean,
): { allowed: boolean; error?: string } {
  if (!isOpenToExternalAthletes && tournamentClubId) {
    if (athleteClubId && athleteClubId !== tournamentClubId) {
      return {
        allowed: false,
        error: "Tournament does not accept external athletes",
      };
    }
  }
  return { allowed: true };
}

describe("Phase 3 — Tournament isOpenToExternalAthletes", () => {
  it("bloqueia atleta externo quando isOpenToExternalAthletes=false", () => {
    const result = canAthleteEnrollInTournament("club-A", "club-B", false);
    expect(result.allowed).toBe(false);
    expect(result.error).toBe("Tournament does not accept external athletes");
  });

  it("permite atleta externo quando isOpenToExternalAthletes=true", () => {
    const result = canAthleteEnrollInTournament("club-A", "club-B", true);
    expect(result.allowed).toBe(true);
  });

  it("permite atleta do mesmo clube mesmo com isOpen=false", () => {
    const result = canAthleteEnrollInTournament("club-A", "club-A", false);
    expect(result.allowed).toBe(true);
  });

  it("permite atleta sem clube (null) inscrito em torneio interno", () => {
    const result = canAthleteEnrollInTournament("club-A", null, false);
    expect(result.allowed).toBe(true);
  });
});

// ============================================================
// Phase 4: Annotation Sessions — lógica de sessão
// ============================================================

interface Session {
  id: string;
  annotatorUserId: string;
  isActive: boolean;
  endedAt: string | null;
}

function canStartAnnotationSession(
  matchStatus: string,
  userRole: string,
): { allowed: boolean; error?: string } {
  if (userRole === "SPECTATOR") {
    return { allowed: false, error: "Spectators cannot annotate matches" };
  }
  if (matchStatus === "FINISHED") {
    return { allowed: false, error: "Match already finished" };
  }
  return { allowed: true };
}

function canEndSession(
  session: Session,
  userId: string,
  userRole: string,
): { allowed: boolean; error?: string } {
  if (session.annotatorUserId !== userId && userRole !== "ADMIN") {
    return {
      allowed: false,
      error: "Only the annotator or admin can end a session",
    };
  }
  if (!session.isActive) {
    return { allowed: false, error: "Session already ended" };
  }
  return { allowed: true };
}

function canEndorseSession(session: Session): {
  allowed: boolean;
  error?: string;
} {
  if (session.isActive) {
    return { allowed: false, error: "Cannot endorse an active session" };
  }
  return { allowed: true };
}

describe("Phase 4 — Annotation Sessions", () => {
  describe("startSession", () => {
    it("SPECTATOR não pode iniciar sessão", () => {
      const result = canStartAnnotationSession("IN_PROGRESS", "SPECTATOR");
      expect(result.allowed).toBe(false);
    });

    it("COACH pode iniciar sessão", () => {
      const result = canStartAnnotationSession("IN_PROGRESS", "COACH");
      expect(result.allowed).toBe(true);
    });

    it("não pode iniciar em partida FINISHED", () => {
      const result = canStartAnnotationSession("FINISHED", "COACH");
      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Match already finished");
    });

    it("ADMIN pode iniciar sessão", () => {
      const result = canStartAnnotationSession("IN_PROGRESS", "ADMIN");
      expect(result.allowed).toBe(true);
    });

    it("ATHLETE pode iniciar sessão (se compatível com canAnnotateMatch)", () => {
      const result = canStartAnnotationSession("IN_PROGRESS", "ATHLETE");
      expect(result.allowed).toBe(true);
    });
  });

  describe("endSession", () => {
    const activeSession: Session = {
      id: "s1",
      annotatorUserId: "u1",
      isActive: true,
      endedAt: null,
    };

    it("anotador pode encerrar sua própria sessão", () => {
      const result = canEndSession(activeSession, "u1", "COACH");
      expect(result.allowed).toBe(true);
    });

    it("outro usuário não pode encerrar sessão de outro", () => {
      const result = canEndSession(activeSession, "u2", "COACH");
      expect(result.allowed).toBe(false);
    });

    it("ADMIN pode encerrar sessão de qualquer um", () => {
      const result = canEndSession(activeSession, "u2", "ADMIN");
      expect(result.allowed).toBe(true);
    });

    it("não pode encerrar sessão já encerrada", () => {
      const ended: Session = {
        ...activeSession,
        isActive: false,
        endedAt: "2026-01-01",
      };
      const result = canEndSession(ended, "u1", "COACH");
      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Session already ended");
    });
  });

  describe("endorseSession", () => {
    it("pode endossar sessão encerrada", () => {
      const session: Session = {
        id: "s1",
        annotatorUserId: "u1",
        isActive: false,
        endedAt: "2026-01-01",
      };
      const result = canEndorseSession(session);
      expect(result.allowed).toBe(true);
    });

    it("não pode endossar sessão ativa", () => {
      const session: Session = {
        id: "s1",
        annotatorUserId: "u1",
        isActive: true,
        endedAt: null,
      };
      const result = canEndorseSession(session);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Cannot endorse an active session");
    });
  });
});

// ============================================================
// Integration: authorization.ts com Phases 2-4
// ============================================================

describe("authorization.ts — integração com Phases 2-4", () => {
  let canEditMatch: any;
  let canAnnotateMatch: any;
  let canCreateMatch: any;

  beforeAll(async () => {
    const mod = await import("../src/services/authorization");
    canEditMatch = mod.canEditMatch;
    canAnnotateMatch = mod.canAnnotateMatch;
    canCreateMatch = mod.canCreateMatch;
  });

  const match = {
    id: "m1",
    apontadorEmail: null,
    playersEmails: ["player@test.com"],
    status: "IN_PROGRESS",
  };

  it("SPECTATOR não pode editar (canEditMatch)", () => {
    expect(
      canEditMatch({ email: "spec@test.com", role: "SPECTATOR" }, match),
    ).toBe(false);
  });

  it("SPECTATOR não pode anotar (canAnnotateMatch)", () => {
    expect(
      canAnnotateMatch({ email: "spec@test.com", role: "SPECTATOR" }, match),
    ).toBe(false);
  });

  it("SPECTATOR não pode criar (canCreateMatch)", () => {
    expect(canCreateMatch({ email: "spec@test.com", role: "SPECTATOR" })).toBe(
      false,
    );
  });

  it("FINISHED bloqueia edição para todos exceto? (canEditMatch)", () => {
    const finishedMatch = { ...match, status: "FINISHED" };
    expect(
      canEditMatch({ email: "admin@test.com", role: "ADMIN" }, finishedMatch),
    ).toBe(false);
  });

  it("FINISHED bloqueia anotação (canAnnotateMatch)", () => {
    const finishedMatch = { ...match, status: "FINISHED" };
    expect(
      canAnnotateMatch(
        { email: "coach@test.com", role: "COACH" },
        finishedMatch,
      ),
    ).toBe(false);
  });
});
