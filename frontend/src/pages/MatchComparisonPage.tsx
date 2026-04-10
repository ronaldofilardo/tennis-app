// frontend/src/pages/MatchComparisonPage.tsx
// Página wrapper para o comparativo de anotações de uma partida.
// Lê :matchId da URL e delega toda a lógica ao MatchComparisonView.

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MatchComparisonView from '../components/MatchComparisonView';

const MatchComparisonPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  if (!matchId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        Partida não encontrada.
      </div>
    );
  }

  return <MatchComparisonView matchId={matchId} onClose={() => navigate('/dashboard')} />;
};

export default MatchComparisonPage;
