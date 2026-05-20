// src/core/scoring/TennisScoring.ts
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
import { API_URL } from '../../config/api';

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
  }

  // Salvar estado atual no histórico antes de fazer mudanças
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
  public undoLastPoint(): MatchState | null {
    if (this.history.length === 0) {
      return null;
    }

    const previousState = this.history.pop();
    const previousPointsLength = this.historyPointsLengths.pop() ?? this.pointsHistory.length;
    if (previousState) {
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

    if (this.state.currentGame.isTiebreak || this.state.currentGame.isMatchTiebreak) {
      return this.transitions.addTiebreakPoint(this.state, this.config, player);
    }

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
      return this.transitions.addTiebreakPoint(this.state, this.config, player);
    }

    return this.transitions.addRegularPoint(this.state, this.config, player);
  }

  // Sincronizar estado atual com o backend
  public async syncState(): Promise<boolean> {
    if (!this.syncEnabled || !this.matchId) {
      return false;
    }

    try {
      // Usar fetch com controle de timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      // Sempre usa o endpoint autenticado
      const url = `${API_URL}/matches/${this.matchId}/state`;

      const token = this._tokenProvider ? this._tokenProvider() : null; // sem fallback para localStorage — token deve ser injetado

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          matchState: this.getState(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        // propagar para tratamento pelo chamador
      }
      throw error;
    }
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

  // Converte pontos do placar (GamePoint) para número real de pontos disputados
  private convertScoreToActualPoints(score: GamePoint): number {
    switch (score) {
      case '0':
        return 0;
      case '15':
        return 1;
      case '30':
        return 2;
      case '40':
        return 3;
      case 'AD':
        return 4; // Na vantagem, pelo menos 4 pontos foram disputados
      default:
        return 0;
    }
  }

  // Calcula o total de pontos disputados no game atual
  private getTotalPointsPlayed(): number {
    if (this.state.currentGame.isTiebreak) {
      // No tie-break, soma simples funciona porque cada ponto vale 1
      const p1Points = this.state.currentGame.points.PLAYER_1 as number;
      const p2Points = this.state.currentGame.points.PLAYER_2 as number;
      return p1Points + p2Points;
    } else {
      // Em games regulares, converte os valores de placar para pontos reais
      const p1Score = this.state.currentGame.points.PLAYER_1 as GamePoint;
      const p2Score = this.state.currentGame.points.PLAYER_2 as GamePoint;

      const p1ActualPoints = this.convertScoreToActualPoints(p1Score);
      const p2ActualPoints = this.convertScoreToActualPoints(p2Score);

      // Casos especiais para vantagem
      if (p1Score === 'AD' || p2Score === 'AD') {
        // Se há vantagem, sabemos que foram disputados pelo menos 7 pontos (6 para chegar no deuce + 1 para vantagem)
        // Podemos ser mais precisos contando quantas vantagens já houve
        const basePoints = 6; // Mínimo para chegar ao deuce (40-40)
        const extraPoints = Math.max(p1ActualPoints - 3, 0) + Math.max(p2ActualPoints - 3, 0);
        return basePoints + extraPoints;
      }

      return p1ActualPoints + p2ActualPoints;
    }
  }

  // Determina o lado da quadra baseado no número de pontos disputados
  public getServingSide(): 'left' | 'right' {
    const totalPoints = this.getTotalPointsPlayed();

    // Regra do tênis: ímpar → esquerda, par → direita
    // Exemplos:
    // 0 pontos (início) → par → direita
    // 1 ponto → ímpar → esquerda
    // 2 pontos → par → direita
    // etc.
    return totalPoints % 2 === 0 ? 'right' : 'left';
  }

  // Método público para obter informações completas sobre o saque
  public getServerInfo(): {
    server: Player;
    side: 'left' | 'right';
    totalPointsPlayed: number;
    isOddPoint: boolean;
  } {
    const totalPoints = this.getTotalPointsPlayed();
    const isOdd = totalPoints % 2 === 1;

    return {
      server: this.state.server,
      side: this.getServingSide(),
      totalPointsPlayed: totalPoints,
      isOddPoint: isOdd,
    };
  }

  // Regra 10: Determina se os jogadores devem trocar de lado da quadra
  public shouldChangeSides(): {
    shouldChange: boolean;
    reason: string;
  } {
    const p1Games = this.state.currentSetState.games.PLAYER_1;
    const p2Games = this.state.currentSetState.games.PLAYER_2;
    const totalGames = p1Games + p2Games;

    // Durante tie-break: troca a cada 6 pontos (padrão) ou alternativa do Anexo V
    if (this.state.currentGame.isTiebreak) {
      const p1Points = this.state.currentGame.points.PLAYER_1 as number;
      const p2Points = this.state.currentGame.points.PLAYER_2 as number;
      const totalTiebreakPoints = p1Points + p2Points;

      if (this.config.useAlternateTiebreakSides) {
        // Anexo V: Troca após 1º ponto, depois a cada 4 pontos
        if (
          totalTiebreakPoints === 1 ||
          (totalTiebreakPoints > 1 && (totalTiebreakPoints - 1) % 4 === 0)
        ) {
          return {
            shouldChange: true,
            reason: `Tie-break alternativo: após 1º ponto e a cada 4 pontos (${totalTiebreakPoints} pontos jogados)`,
          };
        }
      } else {
        // Regra padrão: a cada 6 pontos
        if (totalTiebreakPoints > 0 && totalTiebreakPoints % 6 === 0) {
          return {
            shouldChange: true,
            reason: `Tie-break: troca a cada 6 pontos (${totalTiebreakPoints} pontos jogados)`,
          };
        }
      }
    }

    // Games ímpares de cada set (1º, 3º, 5º, etc.)
    if (totalGames % 2 === 1) {
      return {
        shouldChange: true,
        reason: `Fim do ${totalGames}º game (game ímpar)`,
      };
    }

    // Fim de set (implementado no método winSet)
    return {
      shouldChange: false,
      reason: 'Não é necessário trocar de lado agora',
    };
  }

  // === MÉTODOS PARA ANÁLISE DETALHADA DE PONTOS ===

  /**
   * Constrói o contexto do placar ANTES do ponto ser processado.
   * Captura set, games, pontuação e se é breakpoint para o devolvedor.
   */
  private buildPointContext(): PointContext {
    const game = this.state.currentGame;
    const set = this.state.currentSetState;
    const server = this.state.server;
    const opponent: Player = server === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';

    const serverScore = game.points[server];
    const receiverScore = game.points[opponent];

    // Breakpoint: o devolvedor pode quebrar o saque neste ponto
    let isBreakPoint = false;
    if (!game.isTiebreak && !game.isMatchTiebreak) {
      // Receiver tem 40 e sacador tem 0, 15 ou 30
      isBreakPoint =
        receiverScore === '40' &&
        (serverScore === '0' || serverScore === '15' || serverScore === '30');
      // Ou receiver tem AD (vantagem do devolvedor)
      if (receiverScore === 'AD') isBreakPoint = true;
      // No-Ad deciding point quando o devolvedor ainda não está adiantado
      if (game.isNoAdDecidingPoint && receiverScore === '40' && serverScore === '40') {
        isBreakPoint = true;
      }
    }

    return {
      setNumber: this.state.currentSet,
      gamesP1: set.games.PLAYER_1,
      gamesP2: set.games.PLAYER_2,
      setsWonP1: this.state.sets.PLAYER_1,
      setsWonP2: this.state.sets.PLAYER_2,
      gameScoreP1: game.points.PLAYER_1,
      gameScoreP2: game.points.PLAYER_2,
      server,
      isBreakPoint,
      isTiebreak: (game.isTiebreak || game.isMatchTiebreak) ?? false,
    };
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

  // Método para obter estatísticas básicas
  public getMatchStats(): {
    totalPoints: number;
    aces: number;
    doubleFaults: number;
    winners: number;
    unforcedErrors: number;
    forcedErrors: number;
  } {
    const stats = {
      totalPoints: this.pointsHistory.length,
      aces: 0,
      doubleFaults: 0,
      winners: 0,
      unforcedErrors: 0,
      forcedErrors: 0,
    };

    for (const point of this.pointsHistory) {
      // Contagem de saques
      if (point.serve?.type === 'ACE') stats.aces++;
      if (point.serve?.type === 'DOUBLE_FAULT') stats.doubleFaults++;

      // Contagem de resultados
      switch (point.result.type) {
        case 'WINNER':
          stats.winners++;
          break;
        case 'UNFORCED_ERROR':
          stats.unforcedErrors++;
          break;
        case 'FORCED_ERROR':
          stats.forcedErrors++;
          break;
      }
    }

    return stats;
  }

  // === MÉTODOS PARA REGRAS DO ANEXO V ===

  // Verifica se estamos no ponto decisivo do método No-Ad
  public isNoAdDecidingPoint(): boolean {
    return this.state.currentGame.isNoAdDecidingPoint || false;
  }

  // Método No-Ad: Permite ao recebedor escolher o lado para receber o ponto decisivo
  public setNoAdReceivingSide(side: 'left' | 'right'): void {
    if (this.isNoAdDecidingPoint()) {
      // escolha do lado será processada pela interface
      void side;
    }
  }

  // Regra No-Let: Verifica se um saque que toca a rede deve ser jogado
  public isNoLetServe(touchedNet: boolean): boolean {
    if (this.config.useNoLet && touchedNet) {
      return true; // Saque que toca a rede está em jogo
    }
    return false; // Regra normal: let
  }

  // Método para obter informações sobre as regras alternativas ativas
  public getAlternativeRules(): {
    noAd: boolean;
    alternateTiebreakSides: boolean;
    noLet: boolean;
  } {
    return {
      noAd: this.config.useNoAd || false,
      alternateTiebreakSides: this.config.useAlternateTiebreakSides || false,
      noLet: this.config.useNoLet || false,
    };
  }

  // Verifica se estamos no set decisório (ambos os jogadores completaram 1 set)
  public isDecidingSet(): boolean {
    return (
      this.state.completedSets.length === 1 &&
      this.state.sets.PLAYER_1 === 1 &&
      this.state.sets.PLAYER_2 === 1
    );
  }

  // Verifica se um match tiebreak deve ser jogado (set decisório com 6-6 em games)
  public shouldPlayMatchTiebreak(): boolean {
    return (
      this.isDecidingSet() &&
      this.state.currentSetState.games.PLAYER_1 === 6 &&
      this.state.currentSetState.games.PLAYER_2 === 6
    );
  }
}
