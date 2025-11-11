import { vi } from 'vitest';

export const mockNavigationContext = {
  currentPage: 'dashboard',
  history: [],
  navigate: vi.fn(),
};

export function resetMockNavigationContext(overrides = {}) {
  Object.assign(mockNavigationContext, {
    currentPage: 'dashboard',
    history: [],
    navigate: vi.fn(),
    ...overrides,
  });
}
