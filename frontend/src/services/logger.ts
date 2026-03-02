// frontend/src/services/logger.ts
// === AREA 7: Logs e Observabilidade — Debugging Multi-tenant ===
// Logger estruturado que inclui userId, clubId, sessionId automaticamente.
// Permite filtrar logs por cliente em ambientes multi-tenant.

// === Tipos ===

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface LogContext {
  /** ID do usuário (email ou ID do backend) */
  userId?: string | null;
  /** ID do clube (tenant) */
  clubId?: string | null;
  /** ID da sessão (gerado ao iniciar o app) */
  sessionId?: string;
  /** Timestamp da ação */
  timestamp?: string;
  /** Dados extras do contexto */
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  context: LogContext;
  data?: unknown;
  timestamp: string;
}

// Níveis numéricos para comparação
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 99,
};

// === Singleton Logger ===

class AppLogger {
  private static _instance: AppLogger;

  private _globalContext: LogContext = {};
  private _minLevel: LogLevel = this._resolveDefaultLevel();
  private _history: LogEntry[] = [];
  private _maxHistory = 100;
  /** Handlers externos (ex: Sentry, datadog) — útil para Enterprise */
  private _externalHandlers: Array<(entry: LogEntry) => void> = [];

  private constructor() {
    this._initSessionId();
  }

  public static getInstance(): AppLogger {
    if (!AppLogger._instance) {
      AppLogger._instance = new AppLogger();
    }
    return AppLogger._instance;
  }

  // === Configuração de Contexto Global ===

  /**
   * Define o contexto global do logger.
   * Chamado ao fazer login: setGlobalContext({ userId: user.email, clubId: club.id })
   */
  public setGlobalContext(context: Partial<LogContext>): void {
    this._globalContext = { ...this._globalContext, ...context };
  }

  /**
   * Limpa o contexto global.
   * Chamado ao fazer logout.
   */
  public clearGlobalContext(): void {
    const sessionId = this._globalContext.sessionId;
    this._globalContext = { sessionId }; // Mantém sessionId
  }

  /**
   * Retorna o contexto global atual.
   */
  public getGlobalContext(): LogContext {
    return { ...this._globalContext };
  }

  // === Configuração de Nível ===

  /**
   * Define o nível mínimo de log.
   * Em Enterprise, pode ser configurado remotamente pelo painel do clube.
   */
  public setLevel(level: LogLevel): void {
    this._minLevel = level;
    this.info("Logger", `Nível de log alterado para: ${level}`);
  }

  /**
   * Retorna o nível atual.
   */
  public getLevel(): LogLevel {
    return this._minLevel;
  }

  // === Handlers Externos ===

  /**
   * Registra um handler externo (Sentry, DataDog, LogRocket, etc.).
   * Clubes Enterprise podem ter integração com ferramentas de observabilidade.
   */
  public addExternalHandler(handler: (entry: LogEntry) => void): () => void {
    this._externalHandlers.push(handler);
    return () => {
      this._externalHandlers = this._externalHandlers.filter(
        (h) => h !== handler,
      );
    };
  }

  // === Métodos de Log ===

  /** Log de debug (somente em ambientes de desenvolvimento) */
  public debug(module: string, message: string, data?: unknown): void {
    this._log("debug", module, message, data);
  }

  /** Log informativo */
  public info(module: string, message: string, data?: unknown): void {
    this._log("info", module, message, data);
  }

  /** Log de aviso */
  public warn(module: string, message: string, data?: unknown): void {
    this._log("warn", module, message, data);
  }

  /** Log de erro */
  public error(module: string, message: string, data?: unknown): void {
    this._log("error", module, message, data);
  }

  /**
   * Retorna os últimos N logs (para debugging local).
   */
  public getHistory(limit: number = 50): LogEntry[] {
    return this._history.slice(-limit);
  }

  /**
   * Retorna logs filtrados por userId ou clubId.
   * Útil quando um clube reclama de um bug específico.
   */
  public getHistoryForTenant(filter: {
    userId?: string;
    clubId?: string;
  }): LogEntry[] {
    return this._history.filter((entry) => {
      if (filter.userId && entry.context.userId !== filter.userId) return false;
      if (filter.clubId && entry.context.clubId !== filter.clubId) return false;
      return true;
    });
  }

  /**
   * Limpa o histórico de logs.
   */
  public clearHistory(): void {
    this._history = [];
  }

  // === Criadores de Logger por Módulo ===

  /**
   * Retorna um logger com o módulo pré-configurado.
   * Uso: const log = logger.createModuleLogger('ScoreboardV2');
   *      log.info('Dados da partida carregados', { id: match.id });
   */
  public createModuleLogger(module: string) {
    return {
      debug: (message: string, data?: unknown) =>
        this.debug(module, message, data),
      info: (message: string, data?: unknown) =>
        this.info(module, message, data),
      warn: (message: string, data?: unknown) =>
        this.warn(module, message, data),
      error: (message: string, data?: unknown) =>
        this.error(module, message, data),
    };
  }

  // === Internos ===

  private _log(
    level: LogLevel,
    module: string,
    message: string,
    data?: unknown,
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this._minLevel]) {
      return; // Nível abaixo do mínimo configurado
    }

    const timestamp = new Date().toISOString();

    const entry: LogEntry = {
      level,
      module,
      message,
      context: {
        ...this._globalContext,
        timestamp,
      },
      data,
      timestamp,
    };

    // Adicionar ao histórico (circular buffer)
    this._history.push(entry);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    // Formatar e emitir no console
    const prefix = `[${module}]`;
    const contextStr = this._formatContextSuffix(entry.context);

    switch (level) {
      case "debug":
        // eslint-disable-next-line no-console
        console.debug(
          `${prefix} ${message}${contextStr}`,
          ...(data !== undefined ? [data] : []),
        );
        break;
      case "info":
        // eslint-disable-next-line no-console
        console.log(
          `${prefix} ${message}${contextStr}`,
          ...(data !== undefined ? [data] : []),
        );
        break;
      case "warn":
        // eslint-disable-next-line no-console
        console.warn(
          `${prefix} ${message}${contextStr}`,
          ...(data !== undefined ? [data] : []),
        );
        break;
      case "error":
        // eslint-disable-next-line no-console
        console.error(
          `${prefix} ${message}${contextStr}`,
          ...(data !== undefined ? [data] : []),
        );
        break;
    }

    // Notificar handlers externos (Sentry, etc.)
    for (const handler of this._externalHandlers) {
      try {
        handler(entry);
      } catch {
        // Nunca deixar handler externo quebrar o app
      }
    }
  }

  /**
   * Formata o contexto como sufixo legível de log.
   * Inclui apenas campos presentes (userId, clubId, sessionId curto).
   */
  private _formatContextSuffix(context: LogContext): string {
    const parts: string[] = [];

    if (context.userId) {
      parts.push(`user:${context.userId}`);
    }
    if (context.clubId) {
      parts.push(`club:${context.clubId}`);
    }
    if (context.sessionId) {
      // Mostra apenas os 6 primeiros chars do sessionId
      parts.push(`session:${context.sessionId.slice(0, 6)}`);
    }

    return parts.length > 0 ? ` | ${parts.join(", ")}` : "";
  }

  /**
   * Resolve o nível padrão baseado em variáveis de ambiente.
   * Em produção: 'info'. Em desenvolvimento: 'debug'.
   */
  private _resolveDefaultLevel(): LogLevel {
    try {
      if (typeof import.meta !== "undefined" && import.meta.env) {
        const envLevel = import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined;
        if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
          return envLevel;
        }
        return import.meta.env.DEV ? "debug" : "info";
      }
    } catch {
      // Fallback para ambientes sem import.meta (testes)
    }
    return "debug";
  }

  /**
   * Gera um ID de sessão único para rastreamento de logs.
   */
  private _initSessionId(): void {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this._globalContext = { sessionId };
  }

  /** Reset para testes */
  public _reset(): void {
    this._globalContext = {};
    this._minLevel = "debug";
    this._history = [];
    this._externalHandlers = [];
    this._initSessionId();
  }
}

// === Export Singleton ===

export const logger = AppLogger.getInstance();

/**
 * Atalho para criar um logger de módulo.
 * Uso: const log = createLogger('ScoreboardV2');
 *      log.info('Dados da partida carregados', { id });
 */
export function createLogger(module: string) {
  return logger.createModuleLogger(module);
}

export default logger;
