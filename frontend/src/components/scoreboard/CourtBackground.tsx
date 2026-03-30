import React from 'react';
import './CourtBackground.css';

const CourtBackground: React.FC = () => (
  <div className="court-bg" aria-hidden="true">
    <svg
      className="court-lines-svg"
      viewBox="0 0 360 560"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Superfície da quadra — cor muda conforme data-court */}
      <rect x="0" y="0" width="360" height="560" fill="var(--surface-accent)" opacity="0.06" />
      {/* Faixa central de serviço (mais clara) */}
      <rect x="20" y="140" width="320" height="278" fill="var(--surface-accent)" opacity="0.04" />
      {/* Linha de fundo superior */}
      <rect x="20" y="30" width="320" height="2" rx="1" fill="var(--court-lines)" opacity="0.6" />
      {/* Linha de serviço superior */}
      <rect x="20" y="140" width="320" height="2" rx="1" fill="var(--court-lines)" opacity="0.4" />
      {/* Rede central */}
      <rect x="10" y="276" width="340" height="3" rx="1" fill="var(--court-net)" opacity="0.7" />
      {/* Linha de serviço inferior */}
      <rect x="20" y="418" width="320" height="2" rx="1" fill="var(--court-lines)" opacity="0.4" />
      {/* Linha de fundo inferior */}
      <rect x="20" y="530" width="320" height="2" rx="1" fill="var(--court-lines)" opacity="0.6" />
      {/* Linha lateral esquerda */}
      <rect x="20" y="30" width="2" height="502" rx="1" fill="var(--court-lines)" opacity="0.6" />
      {/* Linha lateral direita */}
      <rect x="338" y="30" width="2" height="502" rx="1" fill="var(--court-lines)" opacity="0.6" />
      {/* Linha central vertical (serviço) */}
      <rect
        x="179"
        y="140"
        width="2"
        height="278"
        rx="1"
        fill="var(--court-lines)"
        opacity="0.35"
      />
      {/* Ponto central (T) */}
      <circle cx="180" cy="277" r="4" fill="var(--court-net)" opacity="0.5" />
    </svg>
  </div>
);

export default React.memo(CourtBackground);
