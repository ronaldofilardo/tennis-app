// frontend/src/config/httpClient.ts
// === AREA 2: Arquitetura de API — Preparação para Autenticação e Tenants ===
// Camada de abstração sobre fetch que injeta automaticamente headers
// de identificação de tenant, autenticação e versionamento de payload.

import { API_URL } from './api';

// === Tipos ===

export interface TenantConfig {
  clubId: string | null;
  tenantVersion: string;
}

export interface AuthConfig {
  token: string | null;
  refreshToken?: string | null;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeout?: number;
  /** Versão do payload (padrão: "1.0") */
  payloadVersion?: string;
  /** Pular injeção de headers de tenant */
  skipTenantHeaders?: boolean;
  /** Pular injeção de headers de auth */
  skipAuthHeaders?: boolean;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  ok: boolean;
}

// === Erros tipados ===

export type HttpErrorType =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export class HttpError extends Error {
  public readonly type: HttpErrorType;
  public readonly status: number;
  public readonly responseData: unknown;

  constructor(message: string, type: HttpErrorType, status: number, responseData?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.type = type;
    this.status = status;
    this.responseData = responseData;
  }

  /** Erro de rede (sem conexão) */
  get isNetworkError(): boolean {
    return this.type === 'NETWORK_ERROR';
  }

  /** Token expirado ou inválido */
  get isAuthError(): boolean {
    return this.type === 'AUTH_ERROR';
  }

  /** Sem permissão (RBAC) */
  get isPermissionError(): boolean {
    return this.type === 'PERMISSION_ERROR';
  }

  /** Erro do servidor (5xx) */
  get isServerError(): boolean {
    return this.type === 'SERVER_ERROR';
  }
}

// === Interceptores ===

export type RequestInterceptor = (
  url: string,
  config: HttpRequestConfig,
) => HttpRequestConfig | Promise<HttpRequestConfig>;

export type ResponseInterceptor = (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;

export type ErrorInterceptor = (error: HttpError) => HttpError | Promise<HttpError>;

// === Singleton do HttpClient ===

class HttpClient {
  private static _instance: HttpClient;

  private _tenantConfig: TenantConfig = {
    clubId: null,
    tenantVersion: '1.0',
  };

  private _authConfig: AuthConfig = {
    token: null,
    refreshToken: null,
  };

  private _requestInterceptors: RequestInterceptor[] = [];
  private _responseInterceptors: ResponseInterceptor[] = [];
  private _errorInterceptors: ErrorInterceptor[] = [];

  /** Callback para quando um 401 é recebido (ex: redirecionar para login) */
  private _onUnauthorized: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): HttpClient {
    if (!HttpClient._instance) {
      HttpClient._instance = new HttpClient();
    }
    return HttpClient._instance;
  }

  // === Configuração ===

  public setTenantConfig(config: Partial<TenantConfig>): void {
    this._tenantConfig = { ...this._tenantConfig, ...config };
  }

  public getTenantConfig(): TenantConfig {
    return { ...this._tenantConfig };
  }

  public setAuthConfig(config: Partial<AuthConfig>): void {
    this._authConfig = { ...this._authConfig, ...config };
  }

  public getAuthConfig(): AuthConfig {
    return { ...this._authConfig };
  }

  public onUnauthorized(callback: () => void): void {
    this._onUnauthorized = callback;
  }

  // === Interceptores ===

  public addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this._requestInterceptors.push(interceptor);
    return () => {
      this._requestInterceptors = this._requestInterceptors.filter((i) => i !== interceptor);
    };
  }

  public addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this._responseInterceptors.push(interceptor);
    return () => {
      this._responseInterceptors = this._responseInterceptors.filter((i) => i !== interceptor);
    };
  }

  public addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this._errorInterceptors.push(interceptor);
    return () => {
      this._errorInterceptors = this._errorInterceptors.filter((i) => i !== interceptor);
    };
  }

  // === Métodos HTTP ===

  public async get<T = unknown>(
    path: string,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  public async post<T = unknown>(
    path: string,
    body?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...config, method: 'POST', body });
  }

  public async patch<T = unknown>(
    path: string,
    body?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...config, method: 'PATCH', body });
  }

  public async put<T = unknown>(
    path: string,
    body?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...config, method: 'PUT', body });
  }

  public async delete<T = unknown>(
    path: string,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  // === Request principal ===

  private async request<T = unknown>(
    path: string,
    config: HttpRequestConfig = {},
  ): Promise<HttpResponse<T>> {
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;

    // Aplicar interceptores de request
    let finalConfig = { ...config };
    for (const interceptor of this._requestInterceptors) {
      finalConfig = await interceptor(url, finalConfig);
    }

    // Montar headers com injeção automática de tenant e auth
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this._buildTenantHeaders(finalConfig),
      ...this._buildAuthHeaders(finalConfig),
      ...this._buildVersionHeaders(finalConfig),
      ...(finalConfig.headers || {}),
    };

    // Montar AbortController para timeout
    let abortController: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (finalConfig.timeout && !finalConfig.signal) {
      abortController = new AbortController();
      timeoutId = setTimeout(() => abortController!.abort(), finalConfig.timeout);
    }

    try {
      const fetchOptions: RequestInit = {
        method: finalConfig.method || 'GET',
        headers,
        signal: finalConfig.signal || abortController?.signal,
      };

      if (finalConfig.body && finalConfig.method !== 'GET') {
        fetchOptions.body = JSON.stringify(
          this._wrapPayload(finalConfig.body, finalConfig.payloadVersion),
        );
      }

      const response = await fetch(url, fetchOptions);

      if (timeoutId) clearTimeout(timeoutId);

      // Tratar erros HTTP
      if (!response.ok) {
        const errorData = await this._safeParseJson(response);
        const httpError = this._classifyError(response.status, errorData, url);

        // Callback para 401
        if (response.status === 401 && this._onUnauthorized) {
          this._onUnauthorized();
        }

        // Aplicar interceptores de erro
        let processedError = httpError;
        for (const interceptor of this._errorInterceptors) {
          processedError = await interceptor(processedError);
        }

        throw processedError;
      }

      const data = await this._safeParseJson(response);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value: string, key: string) => {
        responseHeaders[key] = value;
      });

      let result: HttpResponse<T> = {
        data: data as T,
        status: response.status,
        headers: responseHeaders,
        ok: true,
      };

      // Aplicar interceptores de response
      for (const interceptor of this._responseInterceptors) {
        result = (await interceptor(result)) as HttpResponse<T>;
      }

      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);

      if (error instanceof HttpError) {
        throw error;
      }

      // Classificar erro de rede vs timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new HttpError(`Request timeout para ${url}`, 'TIMEOUT_ERROR', 0);
      }

      throw new HttpError(
        `Erro de rede ao acessar ${url}: ${(error as Error).message}`,
        'NETWORK_ERROR',
        0,
      );
    }
  }

  // === Helpers internos ===

  private _buildTenantHeaders(config: HttpRequestConfig): Record<string, string> {
    if (config.skipTenantHeaders) return {};

    const headers: Record<string, string> = {};

    if (this._tenantConfig.clubId) {
      headers['X-Club-ID'] = this._tenantConfig.clubId;
    }

    if (this._tenantConfig.tenantVersion) {
      headers['X-Tenant-Version'] = this._tenantConfig.tenantVersion;
    }

    return headers;
  }

  private _buildAuthHeaders(config: HttpRequestConfig): Record<string, string> {
    if (config.skipAuthHeaders) return {};

    const headers: Record<string, string> = {};

    if (this._authConfig.token) {
      headers['Authorization'] = `Bearer ${this._authConfig.token}`;
    }

    return headers;
  }

  private _buildVersionHeaders(config: HttpRequestConfig): Record<string, string> {
    return {
      'X-Payload-Version': config.payloadVersion || '1.0',
    };
  }

  /**
   * Encapsula o payload com metadados de versão.
   * Em um sistema centralizado com muitos clientes, isso impede
   * quebras quando o formato dos dados muda.
   */
  private _wrapPayload(body: unknown, version?: string): unknown {
    // Por enquanto, apenas adiciona _meta ao payload se for objeto
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return {
        ...(body as Record<string, unknown>),
        _meta: {
          payloadVersion: version || '1.0',
          clientTimestamp: new Date().toISOString(),
          clubId: this._tenantConfig.clubId,
        },
      };
    }
    return body;
  }

  private _classifyError(status: number, data: unknown, url: string): HttpError {
    if (status === 401) {
      return new HttpError(`Autenticação necessária para ${url}`, 'AUTH_ERROR', status, data);
    }
    if (status === 403) {
      return new HttpError(`Sem permissão para acessar ${url}`, 'PERMISSION_ERROR', status, data);
    }
    if (status === 422 || status === 400) {
      return new HttpError(`Dados inválidos em ${url}`, 'VALIDATION_ERROR', status, data);
    }
    if (status >= 500) {
      return new HttpError(`Erro do servidor em ${url}`, 'SERVER_ERROR', status, data);
    }
    return new HttpError(`Erro HTTP ${status} em ${url}`, 'UNKNOWN_ERROR', status, data);
  }

  private async _safeParseJson(response: Response): Promise<unknown> {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  /** Reset para testes */
  public _reset(): void {
    this._tenantConfig = { clubId: null, tenantVersion: '1.0' };
    this._authConfig = { token: null, refreshToken: null };
    this._requestInterceptors = [];
    this._responseInterceptors = [];
    this._errorInterceptors = [];
    this._onUnauthorized = null;
  }
}

// === Export singleton ===

export const httpClient = HttpClient.getInstance();
