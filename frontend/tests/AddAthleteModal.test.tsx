// tests/AddAthleteModal.test.tsx
// Testes do modal de cadastro manual de atleta/técnico pelo gestor.
// Cobre: render, validações, submit bem-sucedido, erros de API,
//        atleta convidado (sem e-mail), troca de papel e seção de responsáveis.

import '../vitest.setup';

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mock CSS ────────────────────────────────────────────────
vi.mock('../src/components/AddAthleteModal.css', () => ({}));

// ── Mock do httpClient ───────────────────────────────────────
const mockHttpPost = vi.fn();
vi.mock('../src/config/httpClient', () => ({
  default: {
    post: (...args: unknown[]) => mockHttpPost(...args),
  },
  httpClient: {
    post: (...args: unknown[]) => mockHttpPost(...args),
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

import AddAthleteModal from '../src/components/AddAthleteModal';

// ── Props padrão ─────────────────────────────────────────────
const defaultProps = {
  isOpen: true,
  clubId: 'club-abc',
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

describe('AddAthleteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Renderização básica ───────────────────────────────────

  describe('Renderização', () => {
    it('exibe o modal quando isOpen=true', () => {
      render(<AddAthleteModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Cadastrar Atleta / Técnico')).toBeInTheDocument();
    });

    it('não renderiza nada quando isOpen=false', () => {
      render(<AddAthleteModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('exibe os dois botões de papel: Atleta e Técnico', () => {
      render(<AddAthleteModal {...defaultProps} />);
      // Espectador foi movido para platformRole — não é mais papel de clube
      expect(screen.getByRole('button', { name: /Atleta/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Técnico/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Espectador/i })).not.toBeInTheDocument();
    });

    it('exibe botões Cancelar e Cadastrar', () => {
      render(<AddAthleteModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument();
    });
  });

  // ── Validações de formulário ──────────────────────────────

  describe('Validações', () => {
    it('exibe erro quando nome está vazio ao submeter', async () => {
      render(<AddAthleteModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /✅ Cadastrar/i }));
      expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('exibe erro quando CPF tem menos de 11 dígitos', async () => {
      render(<AddAthleteModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Atleta Teste' },
      });
      // Causa: getByLabelText(/cpf/i) achava "CPF", "CPF do pai" e "CPF da mãe" ao mesmo tempo
      fireEvent.change(screen.getByLabelText('CPF'), {
        target: { value: '123.456.789' }, // apenas 9 dígitos
      });

      fireEvent.click(screen.getByRole('button', { name: /✅ Cadastrar/i }));
      expect(await screen.findByText('CPF deve ter 11 dígitos')).toBeInTheDocument();
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('exibe erro quando e-mail tem formato inválido', async () => {
      render(<AddAthleteModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Atleta Teste' },
      });
      fireEvent.change(screen.getByLabelText(/e-mail/i), {
        target: { value: 'emailinvalido' },
      });

      fireEvent.click(screen.getByRole('button', { name: /✅ Cadastrar/i }));
      expect(await screen.findByText('E-mail inválido')).toBeInTheDocument();
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('limpa erro de nome ao digitar valor válido', async () => {
      render(<AddAthleteModal {...defaultProps} />);

      // Dispara validação
      fireEvent.click(screen.getByRole('button', { name: /✅ Cadastrar/i }));
      expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();

      // Corrige o campo
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'João' },
      });

      expect(screen.queryByText('Nome é obrigatório')).not.toBeInTheDocument();
    });
  });

  // ── Interações ────────────────────────────────────────────

  describe('Interações', () => {
    it('chama onClose ao clicar no botão fechar (✕)', () => {
      render(<AddAthleteModal {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Fechar modal'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose ao clicar no botão Cancelar', () => {
      render(<AddAthleteModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose ao clicar no overlay (fora do modal)', () => {
      render(<AddAthleteModal {...defaultProps} />);
      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('muda papel ao clicar em Técnico', () => {
      render(<AddAthleteModal {...defaultProps} />);
      const tecnicoBtn = screen.getByRole('button', { name: /Técnico/i });
      fireEvent.click(tecnicoBtn);
      expect(tecnicoBtn.className).toContain('active');
    });
  });

  // ── Seção de Responsáveis ─────────────────────────────────

  describe('Seção de Responsáveis', () => {
    it('exibe seção de Responsáveis quando papel=ATHLETE (padrão)', () => {
      render(<AddAthleteModal {...defaultProps} />);
      expect(screen.getByText(/Responsáveis/i)).toBeInTheDocument();
    });

    it('oculta seção de Responsáveis quando papel=COACH', () => {
      render(<AddAthleteModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Técnico/i }));
      expect(screen.queryByText(/Responsáveis/i)).not.toBeInTheDocument();
    });
  });

  // ── Submit bem-sucedido ───────────────────────────────────

  describe('Submit bem-sucedido', () => {
    it('chama httpClient.post no endpoint correto e exibe toast de sucesso com código', async () => {
      mockHttpPost.mockResolvedValueOnce({
        data: { globalIdDisplay: '[ABCDEF12]' },
      });

      render(<AddAthleteModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'João da Silva' },
      });

      fireEvent.click(screen.getByRole('button', { name: /✅ Cadastrar/i }));

      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith(
          '/clubs/club-abc/athletes',
          expect.objectContaining({ name: 'João da Silva' }),
        );
      });

      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('[ABCDEF12]'));
      expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('envia payload sem campo email quando e-mail não é informado (atleta convidado)', async () => {
      mockHttpPost.mockResolvedValueOnce({
        data: { globalIdDisplay: '[GUEST123]' },
      });

      render(<AddAthleteModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Atleta Convidado' },
      });
      // Não preenche e-mail

      fireEvent.click(screen.getByRole('button', { name: /✅ Cadastrar/i }));

      await waitFor(() => {
        const [, payload] = mockHttpPost.mock.calls[0] as [string, Record<string, unknown>];
        expect(payload.email).toBeUndefined();
        expect(payload.name).toBe('Atleta Convidado');
      });
    });

    it('inclui email no payload quando e-mail é informado', async () => {
      mockHttpPost.mockResolvedValueOnce({
        data: { globalIdDisplay: '[ABCDEF12]' },
      });

      render(<AddAthleteModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Maria Teste' },
      });
      fireEvent.change(screen.getByLabelText(/e-mail/i), {
        target: { value: 'maria@teste.com' },
      });

      fireEvent.click(screen.getByRole('button', { name: /✅ Cadastrar/i }));

      await waitFor(() => {
        const [, payload] = mockHttpPost.mock.calls[0] as [string, Record<string, unknown>];
        expect(payload.email).toBe('maria@teste.com');
      });
    });

    it('limpa o formulário quando isOpen muda de false para true novamente', async () => {
      const { rerender } = render(<AddAthleteModal {...defaultProps} isOpen={false} />);

      rerender(<AddAthleteModal {...defaultProps} isOpen={true} />);
      const nameInput = screen.getByLabelText(/nome completo/i) as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });
  });

  // ── Erros de API ──────────────────────────────────────────

  describe('Erros de API', () => {
    it('exibe toast.error com mensagem do servidor quando API retorna erro', async () => {
      mockHttpPost.mockRejectedValueOnce({
        response: { data: { error: 'CPF ou e-mail já cadastrado' } },
      });

      render(<AddAthleteModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'João Duplicado' },
      });

      fireEvent.click(screen.getByRole('button', { name: /✅ Cadastrar/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('CPF ou e-mail já cadastrado');
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('exibe mensagem genérica quando API retorna erro sem body', async () => {
      mockHttpPost.mockRejectedValueOnce(new Error('Network Error'));

      render(<AddAthleteModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Atleta Erro' },
      });

      fireEvent.click(screen.getByRole('button', { name: /✅ Cadastrar/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Erro ao cadastrar. Tente novamente.');
      });
    });
  });
});
