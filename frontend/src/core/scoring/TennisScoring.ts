// src/core/scoring/TennisScoring.ts
// Core tennis game engine — manages match state, point history and undo.
// Stats, rules and sync logic are delegated to dedicated modules.
import type {
  MatchState,
  Player,
  GamePoint,
  TennisFormat,
  TennisConfig,
  PointDetails,
  PointContext,
  EnhancedMatchState,
} from './types';
import { TennisConfigFactory } from './TennisConfigFactory';
import { TennisStateTransitions } from './TennisStateTransitions';
import {
  gameScoreToNumber,
  buildPointContextFromState,
  computeMatchStats,
} from './TennisStatsEngine';
import {
  computeServingSide,
  computeServerInfo,
  computeShouldChangeSides,
  checkIsDecidingSet,
  checkShouldPlayMatchTiebreak,
  computeAlternativeRules,
  checkIsNoLetServe,
  checkIsNoAdDecidingPoint,
} from './TennisRuleEngine';
import { syncMatchState } from './TennisSyncService';

// Lógica universal para todos os 8 formatos de tênis do PDF
export class TennisScoring {
  private state: MatchState;
  private config: TennisConfig;
  private matchId: string | null = null;
  private syncEnabled: boolean = false;
  private history: MatchState[] = [];
  private historyPointsLengths: number[] = [];
  private pointsHistory: PointDetails[] = [];
  private _tokenProvider: (() => string | null) | null = null;
  private transitions: TennisStateTransitions;
  private minFloorState: MatchState | null = null; // Snapshot soberano ao retomar anotação

  constructor(server: Player, format: TennisFormat = 'BEST_OF_3') {
    if (!TennisScoring.isValidPlayer(server)) {
      throw new Error(`Jogador inválido: ${server}`);
    }
    this.config = TennisConfigFactory.getConfig(format);
    this.state = this.getInitialState(server);
    this.history = [];
    this.historyPointsLengths = [];
    this.transitions = new TennisStateTransitions();
  }

  private static isValidPlayer(player: unknown): player is Player {
    return player === 'PLAYER_1' || player === 'PLAYER_2';
  }

  // Configurar sincronização com backend
  public enableSync(matchId: string): void {
    this.matchId = matchId;
    this.syncEnabled = true;
  }

  /**
   * Injeta um provider de token de autenticação.
   * O scoring engine não deve depender de localStorage — quem instancia
   * é responsável por fornecer o token atual (ex: httpClient.getAuthConfig().token).
   */
  public setTokenProvider(provider: () => string | null): void {
    this._tokenProvider = provider;
  }

  public disableSync(): void {
    this.syncEnabled = false;
    this.matchId = null;
  }

  private getInitialState(server: Player): MatchState {
    const isMatchTiebreak = this.config.format === 'MATCH_TIEBREAK';

    return {
      sets: { PLAYER_1: 0, PLAYER_2: 0 },
      currentSet: 1,
      currentSetState: { games: { PLAYER_1: 0, PLAYER_2: 0 } },
      currentGame: {
        points: isMatchTiebreak ? { PLAYER_1: 0, PLAYER_2: 0 } : { PLAYER_1: '0', PLAYER_2: '0' },
        server: server,
        isTiebreak: isMatchTiebreak,
        isMatchTiebreak: isMatchTiebreak,
      },
      server: server,
      isFinished: false,
      config: this.config,
      completedSets: [],
    };
  }

  public getState(): EnhancedMatchState {
    const state = JSON.parse(JSON.stringify(this.state)) as MatchState;
    // Incluir histórico de pontos detalhados no estado
    return {
      ...state,
      pointsHistory: this.pointsHistory,
    };
  }

  // Permite forçar startedAt (útil para testes e restauração)
  public setStartedAt(iso: string) {
    // attach to state copy
    this.state.startedAt = iso;
  }

  // Permite forçar endedAt (útil para testes e fechamento de partida)
  public setEndedAt(iso: string) {
    this.state.endedAt = iso;
  }

  // Carregar estado existente (para continuar partidas)
  public loadState(savedState: MatchState | EnhancedMatchState): void {
    // Se o estado salvo não tem config, usar a config atual
    if (!savedState.config) {
      savedState.config = this.config;
    }

    // Validar se o estado é compatível com a configuração atual
    if (savedState.config.format !== this.config.format) {
      // formato divergente — continua com config atual por segurança
    }

    // Restaurar estado completo
    this.state = {
      ...savedState,
      config: this.config, // Sempre usar config atual por segurança
    };

    // Restaurar histórico de pontos se disponível
    if ('pointsHistory' in savedState && savedState.pointsHistory) {
      this.pointsHistory = [...savedState.pointsHistory];
    } else {
      this.pointsHistory = []; // Inicializar vazio se não houver histórico
    }

    // Limpar histórico de undo ao carregar um estado salvo
    this.history = [];
    this.historyPointsLengths = [];

    // ✅ AUTO-SET FLOOR: Ao carregar estado (retomada), definir como piso soberano
    this.setSnapshotFloor(savedState as MatchState);
  }

  /**
   * Define o placar mínimo (floor) como soberano.
   * Quando um usuário retoma uma anotação abandonada, o estado anterior é armazenado
   * como piso — nenhum ponto pode ser desfeito ou adicionado para resultar em placar menor.
   */
  public setSnapshotFloor(state: MatchState): void {
    // Copiar estado para evitar mutação externa
    this.minFloorState = JSON.parse(JSON.stringify(state));
    console.log('[TennisScoring] Snapshot floor definido:', {
      sets: this.minFloorState.sets,
      currentSet: this.minFloorState.currentSet,
      games: this.minFloorState.currentSetState.games,
    });
  }

  /**
   * Validar se um novo estado é um downgrade em relação ao floor.
   * Comparar: sets ganhos, sets atuais, games no set atual, pontos no game.
   */
  private isStateDowngrade(newState: MatchState): boolean {
    if (!this.minFloorState) {
      // Sem floor, qualquer estado é válido
      return false;
    }

    // ✅ COMPARAÇÃO 1: Sets ganhos nunca podem diminuir
    if (
      newState.sets.PLAYER_1 < this.minFloorState.sets.PLAYER_1 ||
      newState.sets.PLAYER_2 < this.minFloorState.sets.PLAYER_2
    ) {
      return true;
    }

    // ✅ COMPARAÇÃO 2: Set atual não pode voltar
    if (newState.currentSet < this.minFloorState.currentSet) {
      return true;
    }

    // ✅ COMPARAÇÃO 3: Games no set atual não podem diminuir
    if (newState.currentSet === this.minFloorState.currentSet) {
      if (
        newState.currentSetState.games.PLAYER_1 <
          this.minFloorState.currentSetState.games.PLAYER_1 ||
        newState.currentSetState.games.PLAYER_2 < this.minFloorState.currentSetState.games.PLAYER_2
      ) {
        return true;
      }

      // ✅ COMPARAÇÃO 4: Pontos no game atual (se mesmo set/games)
      if (
        newState.currentSetState.games.PLAYER_1 ===
          this.minFloorState.currentSetState.games.PLAYER_1 &&
        newState.currentSetState.games.PLAYER_2 ===
          this.minFloorState.currentSetState.games.PLAYER_2
      ) {
        const newPoints1 = gameScoreToNumber(newState.currentGame.points.PLAYER_1 as GamePoint);
        const newPoints2 = gameScoreToNumber(newState.currentGame.points.PLAYER_2 as GamePoint);
        const floorPoints1 = gameScoreToNumber(
          this.minFloorState.currentGame.points.PLAYER_1 as GamePoint,
        );
        const floorPoints2 = gameScoreToNumber(
          this.minFloorState.currentGame.points.PLAYER_2 as GamePoint,
        );

        if (newPoints1 < floorPoints1 || newPoints2 < floorPoints2) {
          return true;
        }
      }
    }

    return false;
  }

  // Também persiste o comprimento atual de pointsHistory para que o undo possa
  // truncar precisamente, independentemente de o ponto ter details ou não.
  private saveToHistory(): void {
    const stateCopy = JSON.parse(JSON.stringify(this.state));
    this.history.push(stateCopy);
    this.historyPointsLengths.push(this.pointsHistory.length);
    // Manter apenas os últimos 50 estados para evitar uso excessivo de memória
    if (this.history.length > 50) {
      this.history.shift();
      this.historyPointsLengths.shift();
    }
  }

  // Desfazer último ponto (undo)
  // Restaura tanto o estado do jogo quanto o pointsHistory ao comprimento anterior,
  // garantindo stats consistentes independentemente de o ponto ter tido details ou não.
  // ✅ Respeita o floor: não permite undo abaixo do snapshot soberano.
  public undoLastPoint(): MatchState | null {
    if (this.history.length === 0) {
      return null;
    }

    const previousState = this.history.pop();
    const previousPointsLength = this.historyPointsLengths.pop() ?? this.pointsHistory.length;
    if (previousState) {
      // Validar se novo estado respeita floor
      if (this.isStateDowngrade(previousState)) {
        // Restaurar history para manter coerência
        this.history.push(previousState);
        if (previousPointsLength !== undefined) {
          this.historyPointsLengths.push(previousPointsLength);
        }
        // Retornar null indicando que undo foi bloqueado
        console.warn('[TennisScoring] Undo bloqueado: placar não pode ser menor que o snapshot', {
          floor: this.minFloorState,
          attempted: previousState,
        });
        return null;
      }

      this.state = previousState;
      this.pointsHistory = this.pointsHistory.slice(0, previousPointsLength);
      return this.getState();
    }

    return null;
  }

  // Verificar se é possível desfazer
  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public addPoint(player: Player, details?: PointDetails): MatchState {
    if (!TennisScoring.isValidPlayer(player)) {
      throw new Error(`Jogador inválido: ${player}`);
    }
    if (this.state.isFinished) return this.getState();

    this.saveToHistory();

    if (details) {
      const ctx = this.buildPointContext();
      this.recordPointDetails(player, { ...details, context: ctx });
    }

    // ✅ Calcular novo estado ANTES de aplicar (para validação)
    let newState: MatchState;
    if (this.state.currentGame.isTiebreak || this.state.currentGame.isMatchTiebreak) {
      newState = this.transitions.addTiebreakPoint(this.state, this.config, player);
    } else {
      const games = this.state.currentSetState.games;
      const tiebreakAt = this.config.tiebreakAt;
      if (
        this.state.currentGame.points.PLAYER_1 === '0' &&
        this.state.currentGame.points.PLAYER_2 === '0' &&
        typeof tiebreakAt === 'number' &&
        tiebreakAt > 0 &&
        games.PLAYER_1 === tiebreakAt &&
        games.PLAYER_2 === tiebreakAt
      ) {
        newState = this.transitions.addTiebreakPoint(this.state, this.config, player);
      } else {
        newState = this.transitions.addRegularPoint(this.state, this.config, player);
      }
    }

    // ✅ Validar downgrade ANTES de aplicar
    if (this.isStateDowngrade(newState)) {
      // Desfazer saveToHistory (remover do undo stack)
      this.history.pop();
      this.historyPointsLengths.pop();

      console.warn('[TennisScoring] Ponto rejeitado: placar não pode ser menor que o snapshot', {
        floor: this.minFloorState,
        attempted: newState,
      });
      return this.getState();
    }

    this.state = newState;
    return this.getState();
  }

  // Sincronizar estado atual com o backend
  public async syncState(): Promise<boolean> {
    if (!this.syncEnabled || !this.matchId) return false;
    return syncMatchState({
      matchId: this.matchId,
      state: this.getState(),
      tokenProvider: this._tokenProvider,
    });
  }

  // Wrapper para addPoint que inclui sincronização automática
  public async addPointWithSync(player: Player, details?: PointDetails): Promise<MatchState> {
    const newState = this.addPoint(player, details);

    // Sincronizar automaticamente se habilitado
    if (this.syncEnabled) {
      await this.syncState();
    }

    return newState;
  }

  // Undo com sincronização automática
  public async undoLastPointWithSync(): Promise<MatchState | null> {
    const newState = this.undoLastPoint();

    // Sincronizar automaticamente se habilitado
    if (this.syncEnabled && newState) {
      await this.syncState();
    }

    return newState;
  }

  // Determina o lado da quadra baseado no número de pontos disputados
  public getServingSide(): 'left' | 'right' {
    return computeServingSide(this.state);
  }

  // Método público para obter informações completas sobre o saque
  public getServerInfo(): ReturnType<typeof computeServerInfo> {
    return computeServerInfo(this.state);
  }

  // Regra 10: Determina se os jogadores devem trocar de lado da quadra
  public shouldChangeSides(): ReturnType<typeof computeShouldChangeSides> {
    return computeShouldChangeSides(this.state, this.config);
  }

  // === MÉTODOS PARA ANÁLISE DETALHADA DE PONTOS ===

  /** Builds the current PointContext (before a point is recorded). */
  private buildPointContext(): PointContext {
    return buildPointContextFromState(this.state);
  }

  private recordPointDetails(winner: Player, details: PointDetails): void {
    const pointDetail: PointDetails = {
      ...details,
      result: {
        winner: winner,
        type: details.result.type,
        finalShot: details.result.finalShot,
      },
      timestamp: Date.now(),
    };

    this.pointsHistory.push(pointDetail);
  }

  public getPointsHistory(): PointDetails[] {
    return [...this.pointsHistory];
  }

  public getLastPointDetails(): PointDetails | null {
    return this.pointsHistory.length > 0 ? this.pointsHistory[this.pointsHistory.length - 1] : null;
  }

  public clearPointsHistory(): void {
    this.pointsHistory = [];
  }

  /** Computes basic match statistics from the recorded points history. */
  public getMatchStats(): ReturnType<typeof computeMatchStats> {
    return computeMatchStats(this.pointsHistory);
  }

  // ── Annex V alternative rules ───────────────────────────────────────────────

  public isNoAdDecidingPoint(): boolean {
    return checkIsNoAdDecidingPoint(this.state);
  }

  /** Side selection for No-Ad deciding point — handled by UI. */
  public setNoAdReceivingSide(side: 'left' | 'right'): void {
    void side;
  }

  public isNoLetServe(touchedNet: boolean): boolean {
    return checkIsNoLetServe(this.config, touchedNet);
  }

  public getAlternativeRules(): ReturnType<typeof computeAlternativeRules> {
    return computeAlternativeRules(this.config);
  }

  // ── Set / match state checks ────────────────────────────────────────────────

  public isDecidingSet(): boolean {
    return checkIsDecidingSet(this.state);
  }

  public shouldPlayMatchTiebreak(): boolean {
    return checkShouldPlayMatchTiebreak(this.state);
  }
}
