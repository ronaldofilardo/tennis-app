import { vi } from 'vitest';

export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

export function resetMockApi(overrides = {}) {
  Object.assign(mockApi, {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  });
}
