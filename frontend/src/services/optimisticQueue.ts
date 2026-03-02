// frontend/src/services/optimisticQueue.ts
// === AREA 3: Gerenciamento de Estado — Fila de Ações Otimistas ===
// Toda ação gera um temporaryId único antes de enviar ao servidor.
// Vital para rastrear ações em banco centralizado com latência variável.

/**
 * Representa uma ação otimista pendente de confirmação.
 */
export interface OptimisticAction<T = unknown> {
  /** ID temporário local (gerado antes do envio) */
  temporaryId: string;
  /** Tipo da ação (ex: 'ADD_POINT', 'UNDO_POINT') */
  type: string;
  /** Payload da ação */
  payload: T;
  /** Timestamp de criação */
  createdAt: number;
  /** Status da ação */
  status: "pending" | "syncing" | "confirmed" | "failed" | "conflict";
  /** ID do servidor (preenchido após confirmação) */
  serverId?: string;
  /** Número de tentativas de sync */
  retryCount: number;
  /** Erro, se houver */
  error?: string;
}

/**
 * Callbacks para eventos da fila.
 */
export interface QueueCallbacks<T = unknown> {
  /** Chamado quando uma ação é confirmada pelo servidor */
  onConfirmed?: (action: OptimisticAction<T>) => void;
  /** Chamado quando uma ação falha após todas as tentativas */
  onFailed?: (action: OptimisticAction<T>) => void;
  /** Chamado quando um conflito é detectado */
  onConflict?: (action: OptimisticAction<T>) => void;
}

let actionCounter = 0;

/**
 * Gera um ID temporário único para ações otimistas.
 */
export function generateTemporaryId(): string {
  actionCounter++;
  return `tmp_${Date.now()}_${actionCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Fila de ações otimistas com retry e tracking de status.
 *
 * Uso:
 * ```ts
 * const queue = new OptimisticQueue({ maxRetries: 3 });
 * const action = queue.enqueue('ADD_POINT', { winner: 'PLAYER_1', ... });
 * // A UI já aplica o efeito localmente
 * // O queue faz sync com o servidor em background
 * ```
 */
export class OptimisticQueue<T = unknown> {
  private _queue: OptimisticAction<T>[] = [];
  private _maxRetries: number;
  private _callbacks: QueueCallbacks<T>;

  constructor(
    options: { maxRetries?: number; callbacks?: QueueCallbacks<T> } = {},
  ) {
    this._maxRetries = options.maxRetries ?? 3;
    this._callbacks = options.callbacks ?? {};
  }

  /**
   * Adiciona uma ação à fila com ID temporário.
   * Retorna a ação criada (para aplicar otimisticamente na UI).
   */
  enqueue(type: string, payload: T): OptimisticAction<T> {
    const action: OptimisticAction<T> = {
      temporaryId: generateTemporaryId(),
      type,
      payload,
      createdAt: Date.now(),
      status: "pending",
      retryCount: 0,
    };

    this._queue.push(action);
    return action;
  }

  /**
   * Marca uma ação como confirmada pelo servidor.
   */
  confirm(temporaryId: string, serverId?: string): void {
    const action = this._findAction(temporaryId);
    if (action) {
      action.status = "confirmed";
      action.serverId = serverId;
      this._callbacks.onConfirmed?.(action);
    }
  }

  /**
   * Marca uma ação como falha.
   * Se retryCount < maxRetries, volta para 'pending'.
   */
  fail(temporaryId: string, error: string): void {
    const action = this._findAction(temporaryId);
    if (!action) return;

    action.retryCount++;
    action.error = error;

    if (action.retryCount < this._maxRetries) {
      action.status = "pending";
    } else {
      action.status = "failed";
      this._callbacks.onFailed?.(action);
    }
  }

  /**
   * Marca uma ação como em conflito com o estado do servidor.
   */
  markConflict(temporaryId: string): void {
    const action = this._findAction(temporaryId);
    if (action) {
      action.status = "conflict";
      this._callbacks.onConflict?.(action);
    }
  }

  /**
   * Retorna ações pendentes (para retry ou processamento).
   */
  getPending(): OptimisticAction<T>[] {
    return this._queue.filter((a) => a.status === "pending");
  }

  /**
   * Retorna ações em conflito.
   */
  getConflicts(): OptimisticAction<T>[] {
    return this._queue.filter((a) => a.status === "conflict");
  }

  /**
   * Retorna todas as ações na fila.
   */
  getAll(): OptimisticAction<T>[] {
    return [...this._queue];
  }

  /**
   * Remove ações confirmadas da fila (limpeza periódica).
   */
  purgeConfirmed(): void {
    this._queue = this._queue.filter((a) => a.status !== "confirmed");
  }

  /**
   * Limpa toda a fila.
   */
  clear(): void {
    this._queue = [];
  }

  /**
   * Tamanho atual da fila.
   */
  get size(): number {
    return this._queue.length;
  }

  /**
   * Verifica se há ações pendentes ou em sync.
   */
  get hasPending(): boolean {
    return this._queue.some(
      (a) => a.status === "pending" || a.status === "syncing",
    );
  }

  private _findAction(temporaryId: string): OptimisticAction<T> | undefined {
    return this._queue.find((a) => a.temporaryId === temporaryId);
  }
}

export default OptimisticQueue;
