// tests/EditMemberModal.test.tsx
// Testes do modal de edição de atleta/técnico pelo gestor (GESTOR only).
// Cobre: render por papel, carregamento de perfil, submit, validações, erros de API.

import '../vitest.setup';

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mock CSS ────────────────────────────────────────────────
vi.mock('../src/components/AddAthleteModal.css', () => ({}));

// ── Mock do httpClient ───────────────────────────────────────
const mockHttpGet = vi.fn();
const mockHttpPatch = vi.fn();
vi.mock('../src/config/httpClient', () => ({
  default: {
    get: (...args: unknown[]) => mockHttpGet(...args),
    patch: (...args: unknown[]) => mockHttpPatch(...args),
  },
  httpClient: {
    get: (...args: unknown[]) => mockHttpGet(...args),
    patch: (...args: unknown[]) => mockHttpPatch(...args),
  },
}));

// ── Mock do Toast ────────────────────────────────────────────
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('../src/components/Toast', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    warning: vi.fn(),
  }),
}));

import EditMemberModal, { type EditableMember } from '../src/components/EditMemberModal';

// ── Fixtures ──────────────────────────────────────────────────
const athleteMember: EditableMember = {
  id: 'ms-001',
  userId: 'u-001',
  clubId: 'club-123',
  role: 'ATHLETE',
  user: {
    id: 'u-001',
    email: 'atleta@teste.com',
    name: 'Carlos Atleta',
    athleteProfile: { id: 'ap-001', globalId: 'abc1234567890000' },
  },
};

const coachMember: EditableMember = {
  id: 'ms-002',
  userId: 'u-002',
  clubId: 'club-123',
  role: 'COACH',
  user: {
    id: 'u-002',
    email: 'tecnico@teste.com',
    name: 'Pedro Técnico',
    athleteProfile: null,
  },
};

const guestAthleteMember: EditableMember = {
  id: 'ms-003',
  userId: null,
  clubId: 'club-123',
  role: 'ATHLETE',
  user: {
    id: null,
    email: null,
    name: 'Atleta Convidado',
    athleteProfile: null, // sem athleteProfile
  },
};

const mockFullAthleteProfile = {
  name: 'Carlos Atleta',
  nickname: 'Carlão',
  birthDate: '1995-06-15T00:00:00.000Z',
  phone: '(11) 91234-5678',
  category: 'ADULTO',
  gender: 'MALE',
  ranking: 42,
};

const defaultProps = {
  isOpen: true,
  clubId: 'club-123',
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

describe('EditMemberModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpGet.mockResolvedValue({ data: mockFullAthleteProfile });
    mockHttpPatch.mockResolvedValue({ data: {} });
  });

  // ── Não renderiza quando fechado ─────────────────────────

  describe('Visibilidade', () => {
    it('não renderiza nada quando isOpen=false', () => {
      render(<EditMemberModal {...defaultProps} isOpen={false} member={athleteMember} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('não renderiza nada quando member=null', () => {
      render(<EditMemberModal {...defaultProps} isOpen={true} member={null} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ── Render para COACH ────────────────────────────────────

  describe('Render — Técnico (COACH)', () => {
    it("exibe título 'Editar Técnico'", () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      expect(screen.getByText('Editar Técnico')).toBeInTheDocument();
    });

    it('exibe subtítulo com nome do membro', () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      expect(screen.getByText('Pedro Técnico')).toBeInTheDocument();
    });

    it('preenche campo nome com valor do membro', () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      const nameInput = screen.getByLabelText(/nome completo/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Pedro Técnico');
    });

    it('preenche campo email com valor do membro', () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      const emailInput = screen.getByLabelText(/e-mail/i) as HTMLInputElement;
      expect(emailInput.value).toBe('tecnico@teste.com');
    });

    it('NÃO exibe campos de atleta (apelido, telefone, categoria, ranking)', () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      expect(screen.queryByLabelText(/apelido/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/telefone/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/categoria/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/ranking/i)).not.toBeInTheDocument();
    });

    it('NÃO busca perfil de atleta para COACH', () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      expect(mockHttpGet).not.toHaveBeenCalled();
    });
  });

  // ── Render para ATHLETE ───────────────────────────────────

  describe('Render — Atleta (ATHLETE)', () => {
    it("exibe título 'Editar Atleta'", async () => {
      render(<EditMemberModal {...defaultProps} member={athleteMember} />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(screen.getByText('Editar Atleta')).toBeInTheDocument();
    });

    it('busca perfil via GET /athletes/:profileId ao abrir', async () => {
      render(<EditMemberModal {...defaultProps} member={athleteMember} />);
      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledWith('/athletes/ap-001');
      });
    });

    it('preenche campos do atleta após carregar perfil', async () => {
      render(<EditMemberModal {...defaultProps} member={athleteMember} />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());

      const nameInput = screen.getByLabelText(/nome completo/i) as HTMLInputElement;
      await waitFor(() => expect(nameInput.value).toBe('Carlos Atleta'));

      expect((screen.getByLabelText(/apelido/i) as HTMLInputElement).value).toBe('Carlão');
      expect((screen.getByLabelText(/telefone/i) as HTMLInputElement).value).toBe(
        '(11) 91234-5678',
      );
    });

    it('NÃO exibe campo e-mail para ATHLETE', async () => {
      render(<EditMemberModal {...defaultProps} member={athleteMember} />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
    });

    it('exibe campos Dados Esportivos (Categoria e Ranking) para ATHLETE', async () => {
      render(<EditMemberModal {...defaultProps} member={athleteMember} />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(await screen.findByLabelText(/categoria/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ranking/i)).toBeInTheDocument();
    });

    it('exibe toast de erro quando falha ao carregar perfil do atleta', async () => {
      mockHttpGet.mockRejectedValueOnce(new Error('Network Error'));
      render(<EditMemberModal {...defaultProps} member={athleteMember} />);
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Erro ao carregar dados do atleta');
      });
    });
  });

  // ── Atleta Convidado (sem athleteProfile) ────────────────

  describe('Atleta Convidado (sem athleteProfile)', () => {
    it('NÃO faz GET de perfil quando athleteProfile é null', () => {
      render(<EditMemberModal {...defaultProps} member={guestAthleteMember} />);
      expect(mockHttpGet).not.toHaveBeenCalled();
    });

    it('preenche nome com user.name do membro convidado', () => {
      render(<EditMemberModal {...defaultProps} member={guestAthleteMember} />);
      const nameInput = screen.getByLabelText(/nome completo/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Atleta Convidado');
    });
  });

  // ── Fechamento do Modal ───────────────────────────────────

  describe('Fechamento', () => {
    it('chama onClose ao clicar no botão ✕', async () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      fireEvent.click(screen.getByLabelText('Fechar modal'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose ao clicar em Cancelar', async () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose ao clicar no overlay (fora do modal)', async () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Validações ────────────────────────────────────────────

  describe('Validação', () => {
    it('exibe toast de erro quando nome está vazio ao submeter (COACH)', async () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: '' },
      });
      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Nome é obrigatório');
      });
      expect(mockHttpPatch).not.toHaveBeenCalled();
    });
  });

  // ── Submit COACH ──────────────────────────────────────────

  describe('Submit — Técnico (COACH)', () => {
    it('chama PATCH /clubs/:clubId/members/:id/profile com nome e email', async () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);

      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Pedro Técnico Atualizado' },
      });
      fireEvent.change(screen.getByLabelText(/e-mail/i), {
        target: { value: 'novoemail@teste.com' },
      });

      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));

      await waitFor(() => {
        expect(mockHttpPatch).toHaveBeenCalledWith(
          '/clubs/club-123/members/ms-002/profile',
          expect.objectContaining({
            name: 'Pedro Técnico Atualizado',
            email: 'novoemail@teste.com',
          }),
        );
      });
    });

    it('omite email do payload quando campo e-mail está vazio', async () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);

      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Pedro Técnico' },
      });
      fireEvent.change(screen.getByLabelText(/e-mail/i), {
        target: { value: '' },
      });

      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));

      await waitFor(() => {
        const [, payload] = mockHttpPatch.mock.calls[0] as [string, Record<string, unknown>];
        expect(payload.email).toBeUndefined();
      });
    });

    it('exibe toast de sucesso e chama onSuccess + onClose após salvar', async () => {
      render(<EditMemberModal {...defaultProps} member={coachMember} />);

      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Pedro Técnico' },
      });
      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Dados atualizados com sucesso!');
      });
      expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Submit ATHLETE ────────────────────────────────────────

  describe('Submit — Atleta (ATHLETE)', () => {
    it('chama PATCH /athletes/:profileId com dados do atleta', async () => {
      render(<EditMemberModal {...defaultProps} member={athleteMember} />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());

      const nameInput = await screen.findByLabelText(/nome completo/i);
      fireEvent.change(nameInput, { target: { value: 'Carlos Atleta Novo' } });

      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));

      await waitFor(() => {
        expect(mockHttpPatch).toHaveBeenCalledWith(
          '/athletes/ap-001',
          expect.objectContaining({ name: 'Carlos Atleta Novo' }),
        );
      });
    });

    it('envia ranking como inteiro quando preenchido', async () => {
      render(<EditMemberModal {...defaultProps} member={athleteMember} />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());

      const rankingInput = await screen.findByLabelText(/ranking/i);
      fireEvent.change(rankingInput, { target: { value: '99' } });

      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));

      await waitFor(() => {
        const [, payload] = mockHttpPatch.mock.calls[0] as [string, Record<string, unknown>];
        expect(payload.ranking).toBe(99);
      });
    });

    it('omite ranking do payload quando campo está vazio', async () => {
      render(<EditMemberModal {...defaultProps} member={athleteMember} />);
      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());

      const rankingInput = await screen.findByLabelText(/ranking/i);
      fireEvent.change(rankingInput, { target: { value: '' } });

      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));

      await waitFor(() => {
        const [, payload] = mockHttpPatch.mock.calls[0] as [string, Record<string, unknown>];
        expect(payload.ranking).toBeUndefined();
      });
    });

    it('lança erro quando athleteProfile.id está ausente (atleta sem perfil)', async () => {
      const memberSemPerfil: EditableMember = {
        ...athleteMember,
        user: { ...athleteMember.user, athleteProfile: null },
      };
      render(<EditMemberModal {...defaultProps} member={memberSemPerfil} />);

      const nameInput = screen.getByLabelText(/nome completo/i);
      fireEvent.change(nameInput, { target: { value: 'Atleta X' } });
      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
      expect(mockHttpPatch).not.toHaveBeenCalled();
    });
  });

  // ── Erros de API ──────────────────────────────────────────

  describe('Erros de API', () => {
    it('exibe mensagem do servidor quando PATCH retorna erro com body', async () => {
      mockHttpPatch.mockRejectedValueOnce({
        response: { data: { error: 'E-mail já está em uso' } },
      });

      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Pedro' },
      });
      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('E-mail já está em uso');
      });
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('exibe mensagem genérica quando PATCH retorna erro sem body', async () => {
      mockHttpPatch.mockRejectedValueOnce(new Error('Network Error'));

      render(<EditMemberModal {...defaultProps} member={coachMember} />);
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Pedro' },
      });
      fireEvent.click(screen.getByRole('button', { name: /✅ Salvar/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Erro ao salvar. Tente novamente.');
      });
    });
  });
});
