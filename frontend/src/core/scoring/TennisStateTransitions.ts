import type { MatchState, Player, TennisConfig } from './types';

/**
 * Módulo de transições de estado do tennis.
 * Contém toda a lógica de mudança de estado (game, set, match).
 */

export class TennisStateTransitions {
  private tiebreakPointsPlayed: number = 0;

  constructor() {}

  public resetTiebreakCounter(): void {
    this.tiebreakPointsPlayed = 0;
  }

  public addRegularPoint(state: MatchState, config: TennisConfig, player: Player): MatchState {
    const opponent: Player = player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    const currentPoints = state.currentGame.points[player] as string;
    const opponentPoints = state.currentGame.points[opponent] as string;

    let newPoints: string;

    // SHORT_SET: inicia tie-break ao 4-4
    if (config.format === 'SHORT_SET') {
      const games = state.currentSetState.games;
      if (
        games.PLAYER_1 >= 4 &&
        games.PLAYER_2 >= 4 &&
        currentPoints === '0' &&
        opponentPoints === '0'
      ) {
        this.startTiebreak(state, config);
        return this.addTiebreakPoint(state, config, player);
      }
    }

    switch (currentPoints) {
      case '0':
        newPoints = '15';
        break;
      case '15':
        newPoints = '30';
        break;
      case '30':
        newPoints = '40';
        break;
      case '40':
        if (opponentPoints === '40') {
          if (config.useAdvantage && !config.useNoAd) {
            newPoints = 'AD';
          } else if (config.useNoAd) {
            state.currentGame.isNoAdDecidingPoint = true;
            this.winGame(state, config, player);
            return state;
          } else {
            this.winGame(state, config, player);
            return state;
          }
        } else if (opponentPoints === 'AD') {
          state.currentGame.points[opponent] = '40';
          return state;
        } else {
          this.winGame(state, config, player);
          return state;
        }
        break;
      case 'AD':
        this.winGame(state, config, player);
        return state;
    }

    state.currentGame.points[player] = newPoints;
    return state;
  }

  public addTiebreakPoint(state: MatchState, config: TennisConfig, player: Player): MatchState {
    const currentPoints = state.currentGame.points[player] as number;
    const opponent: Player = player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    const opponentPoints = state.currentGame.points[opponent] as number;

    state.currentGame.points[player] = currentPoints + 1;
    const newPoints = currentPoints + 1;

    this.handleTiebreakServerChange(state);
    const minPoints = state.currentGame.isMatchTiebreak ? config.tiebreakPoints : 7;

    if (newPoints >= minPoints && newPoints - opponentPoints >= 2) {
      this.tiebreakPointsPlayed = 0;
      if (state.currentGame.isMatchTiebreak) {
        this.winMatch(state, config, player);
      } else {
        this.winSet(state, config, player);
      }
    }
    return state;
  }

  private winGame(state: MatchState, config: TennisConfig, player: Player): void {
    state.currentSetState.games[player]++;
    const opponent: Player = player === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    const gamesWon = state.currentSetState.games[player];
    const gamesLost = state.currentSetState.games[opponent];

    const tiebreakAt = config.tiebreakAt;
    if (
      typeof tiebreakAt === 'number' &&
      tiebreakAt > 0 &&
      gamesWon === tiebreakAt &&
      gamesLost === tiebreakAt &&
      !state.currentGame.isTiebreak &&
      !state.currentGame.isMatchTiebreak
    ) {
      this.startTiebreak(state, config);
      return;
    }

    if (this.shouldWinSet(config, gamesWon, gamesLost)) {
      this.winSet(state, config, player);
    } else {
      this.resetGame(state);
    }
  }

  private shouldWinSet(config: TennisConfig, gamesWon: number, gamesLost: number): boolean {
    const { gamesPerSet, format } = config;

    if (format === 'SHORT_SET') {
      if (gamesWon === 4 && gamesLost === 4) return false;
      return gamesWon >= 4 && gamesWon - gamesLost >= 2;
    }

    if (format === 'PRO_SET') {
      return gamesWon >= 8 && gamesWon - gamesLost >= 2;
    }

    if (format === 'FAST4') {
      return gamesWon >= 4 && gamesWon - gamesLost >= 2;
    }

    return gamesWon >= gamesPerSet && gamesWon - gamesLost >= 2;
  }

  private startTiebreak(state: MatchState, config: TennisConfig): void {
    this.tiebreakPointsPlayed = 0;
    state.currentGame = {
      points: { PLAYER_1: 0, PLAYER_2: 0 },
      server: state.server,
      isTiebreak: true,
    };
  }

  private winSet(state: MatchState, config: TennisConfig, player: Player): void {
    let tiebreakScore: { PLAYER_1: number; PLAYER_2: number } | undefined = undefined;
    if (state.currentGame.isTiebreak && !state.currentGame.isMatchTiebreak) {
      tiebreakScore = {
        PLAYER_1: state.currentGame.points.PLAYER_1 as number,
        PLAYER_2: state.currentGame.points.PLAYER_2 as number,
      };
    }

    if (state.currentGame.isTiebreak && !state.currentGame.isMatchTiebreak) {
      state.currentSetState.games[player]++;
    }

    const finishedSetNumber = state.currentSet;
    const gamesSnapshot = { ...state.currentSetState.games };

    state.sets[player]++;
    const setsWon = state.sets[player];

    if (!state.completedSets) state.completedSets = [];
    state.completedSets.push({
      setNumber: finishedSetNumber,
      games: gamesSnapshot,
      winner: player,
      tiebreakScore: tiebreakScore,
    });

    if (setsWon >= config.setsToWin) {
      this.winMatch(state, config, player);
      return;
    }

    state.currentSet++;
    state.currentSetState = { games: { PLAYER_1: 0, PLAYER_2: 0 } };

    if (this.shouldPlayMatchTiebreak(state, config)) {
      this.startMatchTiebreak(state);
    } else {
      this.resetGame(state);
    }
  }

  private shouldPlayMatchTiebreak(state: MatchState, config: TennisConfig): boolean {
    if (config.format !== 'BEST_OF_3_MATCH_TB') return false;

    if (!this.isDecidingSet(state, config)) return false;

    const sets = state.sets;
    return sets.PLAYER_1 === 1 && sets.PLAYER_2 === 1;
  }

  private isDecidingSet(state: MatchState, config: TennisConfig): boolean {
    const sets = state.sets;
    const setsToWin = config.setsToWin;
    return sets.PLAYER_1 === setsToWin - 1 && sets.PLAYER_2 === setsToWin - 1;
  }

  private startMatchTiebreak(state: MatchState): void {
    state.currentGame = {
      points: { PLAYER_1: 0, PLAYER_2: 0 },
      server: state.server,
      isTiebreak: true,
      isMatchTiebreak: true,
    };
  }

  private winMatch(state: MatchState, config: TennisConfig, player: Player): void {
    try {
      const finishedSetNumber = state.currentSet;
      const alreadyRecorded =
        Array.isArray(state.completedSets) &&
        state.completedSets.some((s) => s.setNumber === finishedSetNumber);

      if (!alreadyRecorded) {
        const gamesSnapshot = { ...state.currentSetState.games };
        let tiebreakScore: { PLAYER_1: number; PLAYER_2: number } | undefined = undefined;
        if (state.currentGame && state.currentGame.isMatchTiebreak) {
          const cg = state.currentGame;
          tiebreakScore = {
            PLAYER_1: Number(cg.points?.PLAYER_1 ?? 0),
            PLAYER_2: Number(cg.points?.PLAYER_2 ?? 0),
          };
        }

        if (!state.completedSets) state.completedSets = [];
        state.completedSets.push({
          setNumber: finishedSetNumber,
          games: gamesSnapshot,
          winner: player,
          tiebreakScore: tiebreakScore,
        });

        if (typeof state.sets[player] === 'number') {
          state.sets[player] = (state.sets[player] as number) + 1;
        }
      }
    } catch (e) {
      // Não bloquear finalização
    }

    state.winner = player;
    state.isFinished = true;
  }

  private resetGame(state: MatchState): void {
    this.changeServer(state);
    state.currentGame = {
      points: { PLAYER_1: '0', PLAYER_2: '0' },
      server: state.server,
      isTiebreak: false,
    };
  }

  private changeServer(state: MatchState): void {
    state.server = state.server === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
  }

  private handleTiebreakServerChange(state: MatchState): void {
    this.tiebreakPointsPlayed++;
    if (this.tiebreakPointsPlayed % 2 === 1) {
      this.changeServer(state);
      state.currentGame.server = state.server;
    }
  }
}
