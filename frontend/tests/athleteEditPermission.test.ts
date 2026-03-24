// tests/athleteEditPermission.test.ts
// Testes de lógica de permissão para edição de perfis de atletas/técnicos.
// Cobre a lógica extraída de api/_handlers/_athletes.js:
//   - isSelf: o próprio atleta pode editar seu perfil
//   - isGestorOfClub: GESTOR do mesmo clube pode editar qualquer perfil
//   - ADMIN: sempre pode editar
//   - Outros: 403 Forbidden

import { describe, it, expect } from 'vitest';

// ── Lógica extraída de api/_handlers/_athletes.js ──────────
// Replica exatamente a condição de permissão do PATCH /athletes/:id

interface Ctx {
  userId: string;
  role: string;
  clubId: string;
}

interface AthleteProfile {
  userId: string | null;
  clubId: string;
}

function canEditAthleteProfile(ctx: Ctx, athlete: AthleteProfile): boolean {
  const isSelf = !!athlete.userId && athlete.userId === ctx.userId;
  const isGestorOfClub =
    (ctx.role === 'GESTOR' && ctx.clubId === athlete.clubId) || ctx.role === 'ADMIN';
  return isSelf || isGestorOfClub;
}

// ── Testes ───────────────────────────────────────────────────

describe('Permissão PATCH /athletes/:id — canEditAthleteProfile', () => {
  // ── Caso: GESTOR do mesmo clube ──────────────────────────

  describe('GESTOR do mesmo clube', () => {
    it('pode editar atleta do seu próprio clube', () => {
      const ctx: Ctx = {
        userId: 'gestor-1',
        role: 'GESTOR',
        clubId: 'club-A',
      };
      const athlete: AthleteProfile = { userId: 'atleta-1', clubId: 'club-A' };
      expect(canEditAthleteProfile(ctx, athlete)).toBe(true);
    });

    it('pode editar atleta convidado (userId=null) do seu clube', () => {
      const ctx: Ctx = {
        userId: 'gestor-1',
        role: 'GESTOR',
        clubId: 'club-A',
      };
      const athlete: AthleteProfile = { userId: null, clubId: 'club-A' };
      expect(canEditAthleteProfile(ctx, athlete)).toBe(true);
    });

    it('NÃO pode editar atleta de clube diferente', () => {
      const ctx: Ctx = {
        userId: 'gestor-1',
        role: 'GESTOR',
        clubId: 'club-A',
      };
      const athlete: AthleteProfile = { userId: 'atleta-2', clubId: 'club-B' };
      expect(canEditAthleteProfile(ctx, athlete)).toBe(false);
    });
  });

  // ── Caso: ADMIN (super-admin) ────────────────────────────

  describe('ADMIN (super-admin de plataforma)', () => {
    it('pode editar qualquer atleta independente de clube', () => {
      const ctx: Ctx = {
        userId: 'admin-1',
        role: 'ADMIN',
        clubId: 'qualquer-clube',
      };
      const athlete: AthleteProfile = {
        userId: 'atleta-3',
        clubId: 'outro-clube',
      };
      expect(canEditAthleteProfile(ctx, athlete)).toBe(true);
    });

    it('pode editar atleta convidado (userId=null)', () => {
      const ctx: Ctx = {
        userId: 'admin-1',
        role: 'ADMIN',
        clubId: 'qualquer-clube',
      };
      const athlete: AthleteProfile = { userId: null, clubId: 'club-X' };
      expect(canEditAthleteProfile(ctx, athlete)).toBe(true);
    });
  });

  // ── Caso: auto-edição (isSelf) ───────────────────────────

  describe('Auto-edição (isSelf)', () => {
    it('atleta pode editar seu próprio perfil mesmo sendo ATHLETE', () => {
      const ctx: Ctx = {
        userId: 'atleta-5',
        role: 'ATHLETE',
        clubId: 'club-A',
      };
      const athlete: AthleteProfile = {
        userId: 'atleta-5',
        clubId: 'club-A',
      };
      expect(canEditAthleteProfile(ctx, athlete)).toBe(true);
    });

    it('COACH pode editar seu próprio AthleteProfile (se existir)', () => {
      const ctx: Ctx = {
        userId: 'coach-7',
        role: 'COACH',
        clubId: 'club-A',
      };
      const athlete: AthleteProfile = { userId: 'coach-7', clubId: 'club-A' };
      expect(canEditAthleteProfile(ctx, athlete)).toBe(true);
    });

    it('isSelf=false quando userId do perfil é null', () => {
      const ctx: Ctx = {
        userId: 'atleta-5',
        role: 'ATHLETE',
        clubId: 'club-A',
      };
      // Atleta convidado (sem userId) — não é isSelf para ninguém
      const athlete: AthleteProfile = { userId: null, clubId: 'club-A' };
      // Não é GESTOR nem ADMIN, e não é isSelf
      expect(canEditAthleteProfile(ctx, athlete)).toBe(false);
    });
  });

  // ── Caso: papéis sem permissão ───────────────────────────

  describe('Papéis sem permissão de edição', () => {
    const unauthorizedRoles = ['ATHLETE', 'COACH', 'SPECTATOR'] as const;

    for (const role of unauthorizedRoles) {
      it(`${role} NÃO pode editar perfil de outro atleta`, () => {
        const ctx: Ctx = {
          userId: 'user-X',
          role,
          clubId: 'club-A',
        };
        const athlete: AthleteProfile = {
          userId: 'outro-user',
          clubId: 'club-A',
        };
        expect(canEditAthleteProfile(ctx, athlete)).toBe(false);
      });
    }

    it('GESTOR de clube diferente NÃO pode editar atleta de outro clube', () => {
      const ctx: Ctx = {
        userId: 'gestor-B',
        role: 'GESTOR',
        clubId: 'club-B',
      };
      const athlete: AthleteProfile = {
        userId: 'atleta-A',
        clubId: 'club-A',
      };
      expect(canEditAthleteProfile(ctx, athlete)).toBe(false);
    });
  });

  // ── Separação ADMIN vs GESTOR ────────────────────────────

  describe('Separação semântica ADMIN vs GESTOR', () => {
    it('GESTOR não tem acesso cross-clube (diferente de ADMIN)', () => {
      const ctxGestor: Ctx = {
        userId: 'g',
        role: 'GESTOR',
        clubId: 'club-A',
      };
      const ctxAdmin: Ctx = {
        userId: 'a',
        role: 'ADMIN',
        clubId: 'club-A',
      };
      const athleteOutroClube: AthleteProfile = {
        userId: 'x',
        clubId: 'club-Z',
      };

      expect(canEditAthleteProfile(ctxGestor, athleteOutroClube)).toBe(false);
      expect(canEditAthleteProfile(ctxAdmin, athleteOutroClube)).toBe(true);
    });
  });
});
