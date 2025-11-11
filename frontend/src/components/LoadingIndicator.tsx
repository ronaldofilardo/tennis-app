import React from 'react';
import './LoadingIndicator.css';

const LoadingIndicator: React.FC = () => {
  return (
    <div data-testid="scoreboard-loading" className="loading-indicator">
      <div className="loading-spinner"></div>
      <p>Carregando partida...</p>
    </div>
  );
};

export default LoadingIndicator;