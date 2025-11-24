// frontend/src/components/PointDetailsModal.tsx (Versão Avançada com 4 etapas)

import React, { useState, useEffect, useMemo } from 'react';
import type { Player, PointDetails } from '../core/scoring/types';
import type { MatrizItem } from '../data/matrizData';
import { getResultados, getGolpes, getEfeitos, getDirecoes } from '../core/scoring/matrizUtils';
import './PointDetailsModal.css';

interface PointDetailsModalProps {
  isOpen: boolean;
  playerInFocus: Player;
  onConfirm: (details: Partial<PointDetails>, winner: Player) => void;
  onCancel: () => void;
  preselectedResult?: string;
}

const PointDetailsModal: React.FC<PointDetailsModalProps> = ({ isOpen, playerInFocus, onConfirm, onCancel, preselectedResult }) => {
  const [resultado, setResultado] = useState<string | undefined>();
  const [golpe, setGolpe] = useState<string | undefined>();
  const [efeito, setEfeito] = useState<string | undefined>();
  const [direcao, setDirecao] = useState<string | undefined>();
  const [erroDetalhe, setErroDetalhe] = useState<string | undefined>();

  const pointWinner = playerInFocus;

  // Sempre declare as variáveis derivadas ANTES dos useEffect que as usam
  const resultadosDisponiveis = useMemo(() => getResultados(), []);
  const golpesDisponiveis = useMemo(() => resultado ? getGolpes([resultado]) : [], [resultado]);
  const efeitosDisponiveis = useMemo(() => (resultado && golpe) ? getEfeitos([resultado], [golpe]) : [], [resultado, golpe]);
  // Ajuste: garantir que, se não houver efeito selecionado e houver efeito vazio na matriz, passe [''] para getDirecoes
  const efeitoParaDirecao = useMemo(() => efeito !== undefined ? efeito : (efeitosDisponiveis.length === 1 && (efeitosDisponiveis[0] === '' || efeitosDisponiveis[0] === '(Sem efeito)')) ? '' : undefined, [efeito, efeitosDisponiveis]);
  const direcoesDisponiveis = useMemo(() => (resultado && golpe && (efeitoParaDirecao !== undefined))
    ? getDirecoes([resultado], [golpe], [efeitoParaDirecao])
    : [], [resultado, golpe, efeitoParaDirecao]);

  useEffect(() => {
    if (isOpen) {
      setResultado(preselectedResult);
      setGolpe(undefined);
      setEfeito(undefined);
      setDirecao(undefined);
      setErroDetalhe(undefined);
    }
  }, [isOpen, preselectedResult]);

  // Avanço automático para efeito único ("(Sem efeito)")
  useEffect(() => {
    if (
      golpe && efeitosDisponiveis.length === 1 && (efeitosDisponiveis[0] === '' || efeitosDisponiveis[0] === '(Sem efeito)') && efeito !== (efeitosDisponiveis[0] || '')
    ) {
      setEfeito(efeitosDisponiveis[0] || '');
    }
  }, [golpe, efeitosDisponiveis, efeito]);

  // Avanço automático para etapa de erro em EF/ENF
  useEffect(() => {
    if (
      resultado && (resultado.startsWith('Erro')) && golpe && (efeito || efeitosDisponiveis.length === 0)
    ) {
      if (!erroDetalhe) {
        setErroDetalhe(''); // pode ser substituído por lógica de seleção automática se necessário
      }
    }
  }, [resultado, golpe, efeito, efeitosDisponiveis, erroDetalhe]);

  const handleConfirm = () => {
    // Permite confirmar o ponto mesmo sem todos os detalhes preenchidos
    // Se não houver resultado ou golpe, usa valores padrão mínimos
    const finalResultado = resultado || 'Winner';
    const finalGolpe = golpe || 'Forehand - FH';
    const finalEfeito = efeito || '';
    const finalDirecao = direcao || '';
    const finalErro = erroDetalhe || '';

    // Determinar quem executou o golpe: para Winner, o vencedor; para erros, o perdedor
    const opponent: Player = pointWinner === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    const shotPlayer: Player = finalResultado === 'Winner' ? pointWinner : opponent;

    const item: Partial<PointDetails> = {
      result: {
        winner: pointWinner,
        type: finalResultado === 'Winner' ? 'WINNER' : (finalResultado.includes('não Forçado') ? 'UNFORCED_ERROR' : 'FORCED_ERROR'),
        finalShot: finalGolpe as any
      },
      shotPlayer: shotPlayer,
      rally: { ballExchanges: 1 },
      timestamp: Date.now()
    };
    onConfirm(item, pointWinner);
  };

  // ...existing code...



  if (!isOpen) return null;

  return (
    <div className="point-details-modal-overlay" onClick={onCancel}>
      <div className="point-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎾 Detalhes do Ponto</h3>
          <div className="winner-display">
            Ponto para: <strong>{pointWinner === 'PLAYER_1' ? 'Jogador 1' : 'Jogador 2'}</strong>
          </div>
        </div>
        <div className="modal-content">
          <div className="section">
            <h4>Resultado</h4>
            <div className="button-group">
              {resultadosDisponiveis.map((r) => (
                <button
                  key={r}
                  className={resultado === r ? 'active' : ''}
                  onClick={() => { setResultado(r); setGolpe(undefined); setEfeito(undefined); setDirecao(undefined); }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {resultado && (
            <div className="section">
              <h4>Golpe</h4>
              <div className="button-group">
                {golpesDisponiveis.map((g) => (
                  <button
                    key={g}
                    className={golpe === g ? 'active' : ''}
                    onClick={() => {
                      setGolpe(g);
                      setEfeito(undefined);
                      setDirecao(undefined);
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Só exibe etapa de efeito se houver mais de uma opção ou se não for só '(Sem efeito)' */}
          {golpe && efeitosDisponiveis.length > 1 && (
            <div className="section">
              <h4>Efeito</h4>
              <div className="button-group">
                {efeitosDisponiveis.map((e) => (
                  <button 
                    key={e} 
                    className={efeito === e ? 'active' : ''} 
                    onClick={() => { setEfeito(e); setDirecao(undefined); }}
                  >
                    {e || '(Sem efeito)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {golpe && (efeito || efeitosDisponiveis.length === 0 || (efeitosDisponiveis.length === 1 && (efeitosDisponiveis[0] === '' || efeitosDisponiveis[0] === '(Sem efeito)'))) && direcoesDisponiveis.length > 0 && (
            <div className="section">
              <h4>Direção</h4>
              <div className="button-group">
                {direcoesDisponiveis.map((d) => (
                  <button key={d} className={direcao === d ? 'active' : ''} onClick={() => setDirecao(d)}>{d}</button>
                ))}
              </div>
            </div>
          )}
          {/* Etapa de erro para EF/ENF (não para Winner) */}
          {resultado && resultado !== 'Winner' && golpe && (efeito || efeitosDisponiveis.length === 0 || (efeitosDisponiveis.length === 1 && (efeitosDisponiveis[0] === '' || efeitosDisponiveis[0] === '(Sem efeito)'))) && (direcao || direcoesDisponiveis.length === 0) && (
            <div className="section">
              <h4>Erro</h4>
              <div className="button-group">
                {/* Opções de erro */}
                {['Rede', 'Fora'].map((erro) => (
                  <button key={erro} className={erroDetalhe === erro ? 'active' : ''} onClick={() => setErroDetalhe(erro)}>{erro}</button>
                ))}
              </div>
            </div>
          )}


        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onCancel}>Cancelar</button>
          <button 
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={false}
          >
            Confirmar Ponto
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointDetailsModal;
