import React from 'react';
import type { TennisFormat } from '../core/scoring/types';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import './RulesGuide.css';

interface RulesGuideProps {
  format: TennisFormat;
}

const RulesGuide: React.FC<RulesGuideProps> = ({ format }) => {
  const formatDisplayName = TennisConfigFactory.getFormatDisplayName(format);

  const getRulesForFormat = () => {
    switch (format) {
      case 'BEST_OF_3':
        return [
          'Melhor de 3 sets (primeiro a vencer 2)',
          'Cada set vai até 6 games (vantagem de 2)',
          'Tiebreak aos 6-6 (primeiro a 7 pontos)',
          'Games com vantagem (15, 30, 40, vantagem)'
        ];

      case 'BEST_OF_5':
        return [
          'Melhor de 5 sets (primeiro a vencer 3)',
          'Cada set vai até 6 games (vantagem de 2)',
          'Tiebreak aos 6-6 (primeiro a 7 pontos)',
          'Games com vantagem (15, 30, 40, vantagem)'
        ];

      case 'SINGLE_SET':
        return [
          'Apenas 1 set',
          'Set vai até 6 games (vantagem de 2)',
          'Tiebreak aos 6-6 (primeiro a 7 pontos)',
          'Games com vantagem (15, 30, 40, vantagem)'
        ];

      case 'PRO_SET':
        return [
          'Apenas 1 set estendido',
          'Set vai até 8 games (vantagem de 2)',
          'Tiebreak aos 8-8 (primeiro a 7 pontos)',
          'Games com vantagem (15, 30, 40, vantagem)'
        ];

      case 'MATCH_TIEBREAK':
        return [
          'Apenas 1 match tiebreak de 10 pontos',
          'Não há sets ou games regulares',
          'Primeiro a 10 pontos (vantagem de 2)',
          'Servidor muda a cada 2 pontos'
        ];

      case 'SHORT_SET':
        return [
          'Apenas 1 set curto',
          'Set vai até 4 games (vantagem de 2)',
          'Sem tiebreak - deve vencer por 2 de vantagem',
          'Games com vantagem (15, 30, 40, vantagem)'
        ];

      case 'NO_AD':
        return [
          'Melhor de 3 sets (primeiro a vencer 2)',
          'Cada set vai até 6 games (vantagem de 2)',
          'Tiebreak aos 6-6 (primeiro a 7 pontos)',
          'SEM VANTAGEM: aos 40-40, próximo ponto decide (sudden death)'
        ];

      case 'FAST4':
        return [
          'Primeiro a vencer 4 sets curtos',
          'Cada set vai até 4 games (vantagem de 2)',
          'Tiebreak aos 3-3 (primeiro a 7 pontos)',
          'SEM VANTAGEM: aos 40-40, próximo ponto decide'
        ];

      default:
        return ['Formato padrão'];
    }
  };

  const rules = getRulesForFormat();

  return (
    <div className="rules-guide">
      <div className="rules-section">
        <h3>🎾 Guia de Regras - {formatDisplayName}</h3>
        <ul className="rules-list">
          {rules.map((rule: string, index: number) => (
            <li key={index} className="rule-item">
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RulesGuide;