import { vi } from 'vitest';

export const mockMatchesContext = {
  matches: [],
  fetchMatches: vi.fn(),
  updateMatch: vi.fn(),
  removeMatch: vi.fn(),
};

export function resetMockMatchesContext(overrides = {}) {
  Object.assign(mockMatchesContext, {
    matches: [],
    fetchMatches: vi.fn(),
    updateMatch: vi.fn(),
    removeMatch: vi.fn(),
    ...overrides,
  });
}
