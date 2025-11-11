
import { vi } from 'vitest';
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

export function resetMockLocalStorage() {
  mockLocalStorage.getItem.mockReset();
  mockLocalStorage.setItem.mockReset();
  mockLocalStorage.removeItem.mockReset();
  mockLocalStorage.clear.mockReset();
}
