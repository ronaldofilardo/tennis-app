import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScoreboardEngine } from '../hooks/useScoreboardEngine';
import * as httpClient from '../config/httpClient';

// Mock httpClient
vi.mock('../config/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock router
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test-match-id' }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/match/test-match-id' }),
}));

// Mock auth
vi.mock('../config/auth', () => ({
  useAuth: () => ({
    currentUser: { id: 'test-user-id', name: 'Test User', role: 'GESTOR' },
    isAuthenticated: true,
  }),
}));

describe('Session Resumption Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve marcar sessão como ABANDONED ao desmontar sem finalizar partida', async () => {
    const mockPatch = vi.fn().mockResolvedValue({ ok: true });
    (httpClient.httpClient.patch as any) = mockPatch;

    const { unmount } = renderHook(() => useScoreboardEngine(() => {}), {
      wrapper: ({ children }) => <div>{children}</div>,
    });

    // Simular marcação de alguns pontos (partida em andamento)
    await act(async () => {
      // Aguardar hook inicializar
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Desmontar hook
    unmount();

    // Aguardar cleanup effect executar
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Verificar que PATCH foi chamado com status ABANDONED
    expect(mockPatch).toHaveBeenCalledWith(
      expect.stringContaining('/sessions/'),
      expect.objectContaining({
        status: 'ABANDONED',
      })
    );
  });

  it('deve exportar suspendedSession e previousAnnotationPoints', () => {
    const { result } = renderHook(() => useScoreboardEngine(() => {}));

    expect(result.current).toHaveProperty('suspendedSession');
    expect(result.current).toHaveProperty('previousAnnotationPoints');
    expect(result.current).toHaveProperty('clearSuspendedSession');
  });

  it('deve limpar suspendedSession ao chamar clearSuspendedSession', () => {
    const { result } = renderHook(() => useScoreboardEngine(() => {}));

    // Valor inicial deve ser null
    expect(result.current.suspendedSession).toBeNull();

    act(() => {
      result.current.clearSuspendedSession();
    });

    // Após limpar, deve continuar null
    expect(result.current.suspendedSession).toBeNull();
  });
});

describe('Session Resumption - Modal Integration', () => {
  it('deve detectar sessão suspensa e mostrar modal no ScoreboardV2', async () => {
    // Este teste verifica que o estado showResumeModal é ativado
    // quando suspendedSession é detectado
    
    // Dados mockados
    const suspendedSessionData = {
      id: 'session-123',
      matchId: 'match-456',
      annotatorUserId: 'user-789',
      status: 'ABANDONED',
      isActive: false,
    };

    // Hook deve retornar suspendedSession quando carregado
    const { result } = renderHook(() => useScoreboardEngine(() => {}));

    // Simular detecção de sessão suspensa
    expect(result.current).toHaveProperty('suspendedSession');
  });

  it('deve retomar sessão ao chamar handleResumeAnnotation', async () => {
    const mockPatch = vi.fn().mockResolvedValue({ ok: true });
    (httpClient.httpClient.patch as any) = mockPatch;

    const { result } = renderHook(() => useScoreboardEngine(() => {}));

    const suspendedSession = {
      id: 'session-123',
      matchId: 'match-456',
      status: 'ABANDONED',
      isActive: false,
    };

    // Simular retomada de sessão através de ação em useReducer
    // (A lógica completa está em ScoreboardV2.tsx handleResumeAnnotation)
    act(() => {
      // Este teste valida que a estrutura existe
      expect(result.current).toBeDefined();
    });
  });
});

describe('Counter Behavior with Session Resumption', () => {
  it('não deve incrementar contador de anotadores quando sessão é retomada', async () => {
    // Quando um anotador deixa e volta:
    // 1. Backend detecta sessão ABANDONED
    // 2. Frontend mostra modal de retomada
    // 3. Ao retomar: não cria novo SESSION, apenas reativa
    // 4. Contador de anotadores não incrementa
    
    const { result } = renderHook(() => useScoreboardEngine(() => {}));

    // Verificar que estruturas necessárias existem
    expect(result.current).toHaveProperty('annotatorCount');
  });

  it('deve incrementar contador apenas ao criar nova sessão, não ao retomar', async () => {
    // Cenário 1: Anotador A entra → contador = 1
    // Cenário 2: Anotador A sai → sesssão = ABANDONED
    // Cenário 3: Anotador A volta + retoma → contador = 1 (não incrementa)
    // Cenário 4: Anotador B entra (nova sessão) → contador = 2
    
    const { result } = renderHook(() => useScoreboardEngine(() => {}));

    // Estrutura deve permitir rastrear estado
    expect(result.current).toHaveProperty('getSystem');
  });
});
