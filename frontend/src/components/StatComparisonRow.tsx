import React from 'react';

interface StatComparisonRowProps {
  label: string;
  p1Value: number;
  p2Value: number;
  suffix?: string;
  decimals?: number;
  isPercentage?: boolean;
  higherIsBetter?: boolean;
}

/**
 * Formata um valor numérico de estatística para exibição.
 * Valor 999 é tratado como infinito (sem rodadas de limite).
 */
export function formatStat(value: number, suffix = '', decimals = 0): string {
  if (value === 999) return '∞';
  if (typeof value !== 'number' || isNaN(value)) return `0${suffix}`;
  return `${value.toFixed(decimals)}${suffix}`;
}

/** Linha de comparação entre os dois jogadores para uma estatística. */
const StatComparisonRow: React.FC<StatComparisonRowProps> = ({
  label,
  p1Value,
  p2Value,
  suffix = '',
  decimals = 0,
  isPercentage = false,
  higherIsBetter = true,
}) => {
  // Ocultar linhas onde ambos os valores são zero para reduzir ruído,
  // exceto para labels que sempre devem aparecer.
  const alwaysShow = ['Pontos Conquistados', '% 1º Saque', 'Aces', 'Duplas Faltas'];
  if (!alwaysShow.includes(label)) {
    const bothZero = (p1Value === 0 || p1Value == null) && (p2Value === 0 || p2Value == null);
    if (bothZero) return null;
  }

  const p1Better = higherIsBetter ? p1Value > p2Value : p1Value < p2Value;
  const p2Better = higherIsBetter ? p2Value > p1Value : p2Value < p1Value;
  const effectiveSuffix = isPercentage ? '%' : suffix;

  return (
    <div className="stat-comparison-row">
      <div className={`stat-value ${p1Better ? 'better' : ''}`}>
        {formatStat(p1Value, effectiveSuffix, decimals)}
      </div>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${p2Better ? 'better' : ''}`}>
        {formatStat(p2Value, effectiveSuffix, decimals)}
      </div>
    </div>
  );
};

export default StatComparisonRow;
