// frontend/src/services/RealtimeMatchService.ts
import { API_URL } from "../config/api";
import type { MatchState, Player, PointDetails } from "../core/scoring/types";

export interface RealtimeMatchState extends MatchState {
  status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
  lastUpdate: Date;
}

export class RealtimeMatchService {
  private static instance: RealtimeMatchService;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private subscribers: Map<string, Set<(state: RealtimeMatchState) => void>> =
    new Map();
  private activeWatchers: Map<string, number> = new Map(); // Contador de watchers ativos por matchId

  private constructor() {}

  public static getInstance(): RealtimeMatchService {
    if (!RealtimeMatchService.instance) {
      RealtimeMatchService.instance = new RealtimeMatchService();
    }
    return RealtimeMatchService.instance;
  }

  // Inicia o monitoramento de uma partida
  public async startWatching(
    matchId: string,
    onUpdate: (state: RealtimeMatchState) => void,
  ) {
    // Incrementa contador de watchers ativos
    const currentCount = this.activeWatchers.get(matchId) || 0;
    this.activeWatchers.set(matchId, currentCount + 1);

    // Adiciona o subscriber
    if (!this.subscribers.has(matchId)) {
      this.subscribers.set(matchId, new Set());
    }
    this.subscribers.get(matchId)?.add(onUpdate);

    // Inicia o polling apenas se for o primeiro watcher
    if (!this.pollingIntervals.has(matchId)) {
      const interval = setInterval(async () => {
        try {
          const state = await this.fetchMatchState(matchId);
          this.notifySubscribers(matchId, state);
        } catch (error) {
          // polling error — será retentado no próximo ciclo
        }
      }, 2000); // Atualiza a cada 2 segundos

      this.pollingIntervals.set(matchId, interval);
    }

    // Busca o estado inicial
    try {
      const initialState = await this.fetchMatchState(matchId);
      onUpdate(initialState);
    } catch (error) {
      throw error;
    }
  }

  // Para o monitoramento de uma partida
  public stopWatching(
    matchId: string,
    onUpdate?: (state: RealtimeMatchState) => void,
  ) {
    // Decrementa contador de watchers ativos
    const currentCount = this.activeWatchers.get(matchId) || 0;
    if (currentCount > 0) {
      this.activeWatchers.set(matchId, currentCount - 1);
    }

    if (onUpdate) {
      this.subscribers.get(matchId)?.delete(onUpdate);
    } else {
      this.subscribers.delete(matchId);
      this.activeWatchers.delete(matchId);
    }

    // Se não há mais subscribers ou watchers ativos, para o polling
    const subscriberCount = this.subscribers.get(matchId)?.size || 0;
    const watcherCount = this.activeWatchers.get(matchId) || 0;

    if (subscriberCount === 0 || watcherCount === 0) {
      const interval = this.pollingIntervals.get(matchId);
      if (interval) {
        clearInterval(interval);
        this.pollingIntervals.delete(matchId);
      }
      this.subscribers.delete(matchId);
      this.activeWatchers.delete(matchId);
    }
  }

  // Atualiza o estado de uma partida
  public async updateMatchState(
    matchId: string,
    state: Partial<RealtimeMatchState>,
  ) {
    try {
      const response = await fetch(`${API_URL}/matches/${matchId}/state`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Falha ao atualizar estado da partida: ${response.status} ${errorText}`,
        );
      }

      const updatedState = await response.json();
      this.notifySubscribers(matchId, updatedState);
      return updatedState;
    } catch (error) {
      throw error;
    }
  }

  private async fetchMatchState(matchId: string): Promise<RealtimeMatchState> {
    try {
      const response = await fetch(`${API_URL}/matches/${matchId}/state`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Falha ao buscar estado da partida: ${response.status} ${errorText}`,
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  private notifySubscribers(matchId: string, state: RealtimeMatchState) {
    this.subscribers.get(matchId)?.forEach((subscriber) => {
      subscriber(state);
    });
  }
}
