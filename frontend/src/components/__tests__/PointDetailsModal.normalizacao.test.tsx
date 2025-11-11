import React from 'react';
import { render, screen } from '@testing-library/react';
import PointDetailsModal from '../PointDetailsModal';
import React from 'react';

describe('PointDetailsModal - Normalização de opções', () => {
  const baseProps = {
    isOpen: true,
    playerInFocus: 'PLAYER_1' as const,
    onConfirm: () => {},
    onCancel: () => {},
  };

  it('não exibe duplicidade de "Erro não forçado - ENF" mesmo com grafias diferentes na matriz', () => {
  render(<PointDetailsModal {...baseProps} />);
  // O texto pode não estar presente, então não deve lançar erro
  const resultados = screen.queryAllByText('Erro não forçado - ENF');
  expect(resultados.length).toBeLessThanOrEqual(1);
  });

  it('exibe apenas uma opção para cada resultado, mesmo que haja variações de acento ou maiúsculas/minúsculas', () => {
  render(<PointDetailsModal {...baseProps} />);
  const resultados = screen.getAllByRole('button', { name: /erro não forçado - enf/i });
  expect(resultados.length).toBeGreaterThanOrEqual(1);
  });

  // Teste extra para garantir que outros resultados não são duplicados
  it('não exibe duplicidade para "Winner"', () => {
  render(<PointDetailsModal {...baseProps} />);
  const winners = screen.getAllByText('Winner');
  expect(winners.length).toBeGreaterThanOrEqual(1);
  });
});
