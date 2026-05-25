/**
 * PointDetailsExample — Showcase do DetailsPanel pattern
 * Exemplo funcional baseado em "Detalhes do Ponto" (imagem)
 */

import React, { useState } from 'react';
import { DetailsPanel, DetailsHeader, DetailsSection, ButtonGroup } from '../DetailsPanel';

interface RallyDetails {
  situation?: string;
  result?: string;
  shot?: string;
  ballExchanges?: number;
}

const PointDetailsExample: React.FC = () => {
  const [details, setDetails] = useState<RallyDetails>({});

  const situacaoOptions = [
    { label: 'Devolução de Saque', value: 'devolucao' },
    { label: 'Fundo de Quadra', value: 'fundo' },
    { label: 'Passada', value: 'passada' },
    { label: 'Rede', value: 'rede' },
  ];

  const resultadoOptions = [
    { label: 'Erro Não Forçado', value: 'erro-nao-forcado' },
    { label: 'Erro Forçado', value: 'erro-forcado' },
    { label: 'Winner', value: 'winner' },
  ];

  const golpeOptions = [
    { label: 'Forehand (FH)', value: 'forehand' },
    { label: 'Backhand (BH)', value: 'backhand' },
    { label: 'Voleio', value: 'voleio' },
  ];

  const ondeErroOptions = [
    { label: 'Fora (Out)', value: 'fora' },
    { label: 'Na Rede (Net)', value: 'rede' },
  ];

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '2rem auto',
        padding: '1rem',
      }}
    >
      <DetailsPanel
        accentColor="green"
        header={<DetailsHeader label="DEVOLVEDOR" subtitle="ARTHUR" />}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            <button
              style={{
                background: '#22c55e',
                color: '#0f1117',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Confirmar Ponto
            </button>
            <button
              style={{
                background: 'transparent',
                color: '#e8eaf0',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        }
      >
        {/* Seção 1: Situação do Ponto */}
        <DetailsSection title="1. SITUAÇÃO DO PONTO">
          <ButtonGroup
            options={situacaoOptions}
            selected={details.situation}
            onChange={(val) => setDetails({ ...details, situation: val as string })}
            size="sm"
          />
        </DetailsSection>

        {/* Seção 2: Resultado */}
        <DetailsSection title="2. RESULTADO">
          <ButtonGroup
            options={resultadoOptions}
            selected={details.result}
            onChange={(val) => setDetails({ ...details, result: val as string })}
            size="sm"
          />
        </DetailsSection>

        {/* Seção 3: Golpe */}
        <DetailsSection title="3. GOLPE">
          <ButtonGroup
            options={golpeOptions}
            selected={details.shot}
            onChange={(val) => setDetails({ ...details, shot: val as string })}
            size="sm"
          />
        </DetailsSection>

        {/* Seção 4: Onde Errou */}
        {details.result?.includes('erro') && (
          <DetailsSection title="4. ONDE ERROU?">
            <ButtonGroup options={ondeErroOptions} selected="" onChange={() => {}} size="sm" />
          </DetailsSection>
        )}

        {/* Seção 5: Trocas de Bolas */}
        <DetailsSection title="5. TROCAS DE BOLAS" variant="input">
          <input
            type="number"
            min="1"
            value={details.ballExchanges || ''}
            onChange={(e) =>
              setDetails({
                ...details,
                ballExchanges: parseInt(e.target.value) || 0,
              })
            }
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              color: '#e8eaf0',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '1rem',
              textAlign: 'center',
            }}
            placeholder="0"
          />
        </DetailsSection>
      </DetailsPanel>
    </div>
  );
};

export default PointDetailsExample;
