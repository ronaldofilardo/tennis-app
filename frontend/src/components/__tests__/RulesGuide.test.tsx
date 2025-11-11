import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RulesGuide from '../RulesGuide';
import type { TennisFormat } from '../../core/scoring/types';

describe('RulesGuide', () => {
  const format: TennisFormat = 'BEST_OF_3';

  it('deve renderizar título e seções principais', () => {
    render(<RulesGuide format={format} />);
  expect(screen.getByRole('heading', { name: /guia de regras/i })).toBeInTheDocument();
  expect(screen.getByText('Melhor de 3 sets (primeiro a vencer 2)')).toBeInTheDocument();
  expect(screen.getByText('Cada set vai até 6 games (vantagem de 2)')).toBeInTheDocument();
  });

  it('deve exibir todas as regras do formato', () => {
    render(<RulesGuide format={format} />);
  expect(screen.getByText('Melhor de 3 sets (primeiro a vencer 2)')).toBeInTheDocument();
  expect(screen.getByText('Cada set vai até 6 games (vantagem de 2)')).toBeInTheDocument();
  expect(screen.getByText('Tiebreak aos 6-6 (primeiro a 7 pontos)')).toBeInTheDocument();
  expect(screen.getByText('Games com vantagem (15, 30, 40, vantagem)')).toBeInTheDocument();
  });
});