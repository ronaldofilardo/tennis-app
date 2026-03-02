import { vi } from "vitest";

export const mockAuthContext = {
  isAuthenticated: false,
  currentUser: null as null | {
    id: string;
    email: string;
    name: string;
    role: string;
    clubs: Array<{
      clubId: string;
      clubName: string;
      clubSlug: string;
      role: string;
    }>;
    activeClubId: string | null;
    activeRole: string;
  },
  activeClub: null as null | {
    clubId: string;
    clubName: string;
    clubSlug: string;
    role: string;
  },
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  switchClub: vi.fn(),
  loading: false,
  error: null as string | null,
  clearError: vi.fn(),
};

export function resetMockAuthContext(overrides = {}) {
  Object.assign(mockAuthContext, {
    isAuthenticated: false,
    currentUser: null,
    activeClub: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    switchClub: vi.fn(),
    loading: false,
    error: null,
    clearError: vi.fn(),
    ...overrides,
  });
}
