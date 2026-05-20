import { describe, it, expect } from 'vitest';
import {
  createMatchData,
  createMatchState,
  createAnnotationSession,
  createSetScore,
  createHttpError,
} from '../fixture-builders';
import type { MatchData, MatchState, AnnotationSession } from '../../types/scoreboard';

describe('fixture builders — typed test factories', () => {
  describe('createMatchData', () => {
    it('deve criar MatchData com valores padrão', () => {
      const match = createMatchData();

      expect(match).toBeDefined();
      expect(match.id).toBe('match_test_001');
      expect(match.sportType).toBe('TENNIS');
      expect(match.format).toBe('BEST_OF_3');
      expect(match.status).toBe('LIVE');
      expect(match.players).toEqual({ p1: 'Jogador 1', p2: 'Jogador 2' });
    });

    it('deve permitir override de campos', () => {
      const match = createMatchData({
        id: 'custom_match_123',
        status: 'COMPLETED',
        players: { p1: 'Maria', p2: 'João' },
      });

      expect(match.id).toBe('custom_match_123');
      expect(match.status).toBe('COMPLETED');
      expect(match.players.p1).toBe('Maria');
      expect(match.format).toBe('BEST_OF_3'); // padrão mantido
    });

    it('deve incluir annotationSessions array', () => {
      const match = createMatchData();
      expect(Array.isArray(match.annotationSessions)).toBe(true);
      expect(match.annotationSessions).toHaveLength(0);
    });

    it('deve ter tipos corretos', () => {
      const match: MatchData = createMatchData();
      expect(typeof match.id).toBe('string');
      expect(typeof match.sportType).toBe('string');
      expect(typeof match.status).toBe('string');
    });
  });

  describe('createMatchState', () => {
    it('deve criar MatchState com valores padrão', () => {
      const state = createMatchState();

      expect(state.config.sportType).toBe('TENNIS');
      expect(state.currentGame.points).toEqual({ PLAYER_1: 0, PLAYER_2: 0 });
      expect(state.isFinished).toBe(false);
      expect(Array.isArray(state.completedSets)).toBe(true);
    });

    it('deve permitir override de currentGame', () => {
      const state = createMatchState({
        currentGame: {
          points: { PLAYER_1: 30, PLAYER_2: 15 },
          server: 'PLAYER_2',
          isTiebreak: false,
          isMatchTiebreak: false,
        },
      });

      expect(state.currentGame.points.PLAYER_1).toBe(30);
      expect(state.currentGame.server).toBe('PLAYER_2');
    });

    it('deve manter startedAt timestamp válido', () => {
      const state = createMatchState();
      const startedDate = new Date(state.startedAt);
      expect(startedDate instanceof Date && !isNaN(startedDate.getTime())).toBe(true);
    });
  });

  describe('createAnnotationSession', () => {
    it('deve criar AnnotationSession com valores padrão', () => {
      const session = createAnnotationSession();

      expect(session.id).toBe('session_test_001');
      expect(session.status).toBe('SUSPENDED');
      expect(session.isActive).toBe(false);
      expect(session.matchStateSnapshot).toBeDefined();
    });

    it('deve permitir override de status', () => {
      const session = createAnnotationSession({
        status: 'ACTIVE',
        isActive: true,
      });

      expect(session.status).toBe('ACTIVE');
      expect(session.isActive).toBe(true);
      expect(session.id).toBe('session_test_001'); // padrão mantido
    });

    it('deve incluir match state snapshot', () => {
      const session = createAnnotationSession();
      expect(session.matchStateSnapshot).toBeDefined();
      expect(typeof session.matchStateSnapshot.config).toBe('object');
    });
  });

  describe('createSetScore', () => {
    it('deve criar placar de set corretamente', () => {
      const score = createSetScore(1, { PLAYER_1: 6, PLAYER_2: 4 });

      expect(score.setNumber).toBe(1);
      expect(score.PLAYER_1).toBe(6);
      expect(score.PLAYER_2).toBe(4);
    });

    it('deve permitir múltiplos sets', () => {
      const set1 = createSetScore(1, { PLAYER_1: 6, PLAYER_2: 4 });
      const set2 = createSetScore(2, { PLAYER_1: 3, PLAYER_2: 6 });

      expect(set1.setNumber).toBe(1);
      expect(set2.setNumber).toBe(2);
    });
  });

  describe('createHttpError', () => {
    it('deve criar erro HTTP com status padrão', () => {
      const error = createHttpError();

      expect(error.status).toBe(400);
      expect(error.message).toBe('Bad Request');
      expect(error.code).toBe('HTTP_400');
    });

    it('deve permitir customização de status e message', () => {
      const error = createHttpError(404, 'Partida não encontrada');

      expect(error.status).toBe(404);
      expect(error.message).toBe('Partida não encontrada');
      expect(error.code).toBe('HTTP_404');
    });

    it('deve usar diferentes status codes', () => {
      const err500 = createHttpError(500, 'Internal Server Error');
      const err401 = createHttpError(401, 'Unauthorized');

      expect(err500.status).toBe(500);
      expect(err401.status).toBe(401);
    });
  });

  describe('integration — factories work together', () => {
    it('deve criar match com session suspensa', () => {
      const match = createMatchData({
        annotationSessions: [createAnnotationSession({ matchId: 'match_test_001' })],
      });

      expect(match.annotationSessions).toHaveLength(1);
      expect(match.annotationSessions[0].status).toBe('SUSPENDED');
      expect(match.annotationSessions[0].matchStateSnapshot.config.sportType).toBe('TENNIS');
    });

    it('deve replicar factory pattern com múltiplos matches', () => {
      const matches = [
        createMatchData({ id: 'match_001' }),
        createMatchData({ id: 'match_002' }),
        createMatchData({ id: 'match_003' }),
      ];

      expect(matches).toHaveLength(3);
      expect(matches[0].id).toBe('match_001');
      expect(matches[1].id).toBe('match_002');
      matches.forEach((m) => {
        expect(m.sportType).toBe('TENNIS');
      });
    });
  });
});
