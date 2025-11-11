import { vi } from 'vitest';

export const mockAuthContext = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
};

export function resetMockAuthContext(overrides = {}) {
  Object.assign(mockAuthContext, {
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}
