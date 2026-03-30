// tests/StatComparisonRow.test.tsx
// Cobertura das correções da Fase 6 (Auditoria Sênior):
// Garante que StatComparisonRow, extraído de dentro do MatchStatsModal,
// funciona corretamente como componente independente.

import '../vitest.setup';

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import StatComparisonRow, { formatStat } from '../src/components/StatComparisonRow';

// ── formatStat ────────────────────────────────────────────────────────────────

describe('formatStat — utilitário de formatação', () => {
  it('retorna "∞" para valor 999', () => {
    expect(formatStat(999)).toBe('∞');
  });

  it('formata zero como "0"', () => {
    expect(formatStat(0)).toBe('0');
  });

  it('formata número inteiro sem sufixo', () => {
    expect(formatStat(42)).toBe('42');
  });

  it('formata com sufixo "%"', () => {
    expect(formatStat(75, '%')).toBe('75%');
  });

  it('formata com decimais', () => {
    expect(formatStat(3.14159, '', 2)).toBe('3.14');
  });

  it('retorna "0" para NaN', () => {
    expect(formatStat(NaN)).toBe('0');
  });
});

// ── StatComparisonRow — Renderização ──────────────────────────────────────────

describe('StatComparisonRow — Renderização', () => {
  it('renderiza label e dois valores', () => {
    render(<StatComparisonRow label="Aces" p1Value={5} p2Value={3} />);
    expect(screen.getByText('Aces')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('aplica classe "better" ao valor maior quando higherIsBetter=true (padrão)', () => {
    const { container } = render(<StatComparisonRow label="Aces" p1Value={5} p2Value={3} />);
    const values = container.querySelectorAll('.stat-value');
    expect(values[0]).toHaveClass('better'); // p1 (5) é maior
    expect(values[1]).not.toHaveClass('better');
  });

  it('aplica classe "better" ao valor menor quando higherIsBetter=false', () => {
    const { container } = render(
      <StatComparisonRow label="Duplas Faltas" p1Value={1} p2Value={4} higherIsBetter={false} />,
    );
    const values = container.querySelectorAll('.stat-value');
    expect(values[0]).toHaveClass('better'); // p1 (1) é menor → melhor
    expect(values[1]).not.toHaveClass('better');
  });

  it('exibe sufixo em valores quando isPercentage=true', () => {
    render(<StatComparisonRow label="% 1º Saque" p1Value={65} p2Value={70} isPercentage />);
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('retorna null (oculta linha) quando ambos valores são zero e label não é especial', () => {
    const { container } = render(
      <StatComparisonRow label="Break Points Salvos" p1Value={0} p2Value={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza mesmo quando ambos são zero se label é sempre-visível', () => {
    render(<StatComparisonRow label="Aces" p1Value={0} p2Value={0} />);
    expect(screen.getByText('Aces')).toBeInTheDocument();
  });

  it('exibe ∞ quando o valor é 999', () => {
    render(<StatComparisonRow label="Pontos Conquistados" p1Value={999} p2Value={10} />);
    expect(screen.getByText('∞')).toBeInTheDocument();
  });
});
