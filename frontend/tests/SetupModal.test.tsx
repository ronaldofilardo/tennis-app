// tests/SetupModal.test.tsx
// Cobertura das correções da Fase 6 (Auditoria Sênior):
// Garante que SetupModal, extraído de dentro do ScoreboardV2, funciona corretamente
// como componente independente (sem depender do estado do pai para definição).

import '../vitest.setup';

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../src/core/scoring/TennisConfigFactory', () => ({
  TennisConfigFactory: {
    getFormatDisplayName: (format: string) => {
      const map: Record<string, string> = {
        STANDARD: 'Padrão (3 sets)',
        FAST4: 'Fast4',
        SUPER_TIEBREAK: 'Super Tiebreak',
      };
      return map[format] ?? format;
    },
  },
}));

import SetupModal from '../src/components/scoreboard/SetupModal';

const defaultProps = {
  isOpen: true,
  players: { p1: 'Alice', p2: 'Bob' },
  format: 'STANDARD',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

// ── Renderização ─────────────────────────────────────────────────────────────

describe('SetupModal — Renderização', () => {
  it('renderiza quando isOpen é true', () => {
    render(<SetupModal {...defaultProps} />);
    expect(screen.getByText('Configuração da Partida')).toBeInTheDocument();
  });

  it('não renderiza quando isOpen é false', () => {
    render(<SetupModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Configuração da Partida')).not.toBeInTheDocument();
  });

  it('exibe o nome do formato traduzido', () => {
    render(<SetupModal {...defaultProps} />);
    expect(screen.getByText('Padrão (3 sets)')).toBeInTheDocument();
  });

  it('exibe os botões com nomes dos jogadores', () => {
    render(<SetupModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /alice saca primeiro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bob saca primeiro/i })).toBeInTheDocument();
  });

  it('exibe botão cancelar', () => {
    render(<SetupModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });
});

// ── Interações ────────────────────────────────────────────────────────────────

describe('SetupModal — Interações', () => {
  it('chama onConfirm com PLAYER_1 ao clicar no botão do p1', () => {
    const onConfirm = vi.fn();
    render(<SetupModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /alice saca primeiro/i }));
    expect(onConfirm).toHaveBeenCalledWith('PLAYER_1');
  });

  it('chama onConfirm com PLAYER_2 ao clicar no botão do p2', () => {
    const onConfirm = vi.fn();
    render(<SetupModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /bob saca primeiro/i }));
    expect(onConfirm).toHaveBeenCalledWith('PLAYER_2');
  });

  it('chama onCancel ao clicar em Cancelar', () => {
    const onCancel = vi.fn();
    render(<SetupModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
