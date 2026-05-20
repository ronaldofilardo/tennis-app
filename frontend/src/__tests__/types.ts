/**
 * Test Mock Types — Strongly-typed mock interfaces for test utilities
 * Prevents `any` types from slipping into test code while maintaining flexibility
 */

import type { RealtimeMatchState, RealtimeMatchService } from '../services/RealtimeMatchService';
import type { Vi } from 'vitest';

/**
 * Mock type for RealtimeMatchService methods
 * Used in hooks/__tests__/useRealtimeMatch.test.ts
 */
export interface MockRealtimeMatchService extends Partial<RealtimeMatchService> {
  startWatching: Vi.Mock<
    [matchId: string, onUpdate: (state: RealtimeMatchState) => void],
    Promise<void>
  >;
  stopWatching: Vi.Mock<[matchId: string, onUpdate?: (state: RealtimeMatchState) => void], void>;
  updateMatchState: Vi.Mock<
    [matchId: string, state: Partial<RealtimeMatchState>],
    Promise<RealtimeMatchState>
  >;
}

/**
 * Mock type for HTTP Client (used across tests)
 */
export interface MockHttpClient {
  get: Vi.Mock<
    [url: string, config?: unknown],
    Promise<{ ok: boolean; data?: unknown; status: number }>
  >;
  patch: Vi.Mock<
    [url: string, data?: unknown, config?: unknown],
    Promise<{ ok: boolean; data?: unknown; status: number }>
  >;
  post: Vi.Mock<
    [url: string, data?: unknown, config?: unknown],
    Promise<{ ok: boolean; data?: unknown; status: number }>
  >;
  put: Vi.Mock<
    [url: string, data?: unknown, config?: unknown],
    Promise<{ ok: boolean; data?: unknown; status: number }>
  >;
  delete: Vi.Mock<
    [url: string, config?: unknown],
    Promise<{ ok: boolean; data?: unknown; status: number }>
  >;
  setAuthConfig: Vi.Mock<[config: unknown], void>;
  setTenantConfig: Vi.Mock<[config: unknown], void>;
  onUnauthorized: Vi.Mock<[callback: (err: unknown) => void], void>;
}

/**
 * Mock type for React Router useNavigate
 */
export type MockNavigate = Vi.Mock<[path: string, options?: unknown], void>;

/**
 * Mock type for Toast hook
 */
export interface MockToast {
  showToast: Vi.Mock<[message: string, type?: string], void>;
  success: Vi.Mock<[message: string], void>;
  error: Vi.Mock<[message: string], void>;
  warning: Vi.Mock<[message: string], void>;
  info: Vi.Mock<[message: string], void>;
  dismiss: Vi.Mock<[id?: string], void>;
  dismissAll: Vi.Mock<[], void>;
}

/**
 * Mock type for Auth Context
 */
export interface MockAuthContext {
  currentUser: { id: string; email: string } | null;
  logout: Vi.Mock<[], void>;
}

/**
 * Generic HTTP Error structure used in tests
 */
export interface MockHttpError {
  response?: {
    status: number;
    data?: {
      error?: string;
      message?: string;
    };
  };
  message: string;
}
