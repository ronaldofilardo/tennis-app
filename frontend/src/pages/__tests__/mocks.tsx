// Mock para o PointDetailsModal
vi.mock('../../components/PointDetailsModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="point-details-modal">
        <h2>Detalhes do ponto</h2>
        <div>
          <button onClick={() => onConfirm({ Resultado: 'Winner' }, 'PLAYER_1')}>Winner</button>
          <button onClick={onCancel}>Cancelar</button>
          <button onClick={() => onConfirm({ Resultado: 'Ace' }, 'PLAYER_1')}>Ace</button>
          <button onClick={() => onConfirm({ Resultado: 'Forehand - FH' }, 'PLAYER_1')}>Forehand - FH</button>
          <button onClick={() => onConfirm({ Resultado: 'Flat' }, 'PLAYER_1')}>Flat</button>
          <button onClick={() => onConfirm({ Resultado: 'Paralela' }, 'PLAYER_1')}>Paralela</button>
          <button onClick={() => onConfirm({}, 'PLAYER_1')}>Confirmar</button>
        </div>
      </div>
    );
  }
}));

vi.mock('../../components/LoadingIndicator', () => ({
  default: () => <div>Loading...</div>
}));