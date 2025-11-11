// frontend/src/components/PointDetailsModal.tsx (Versão Avançada com 4 etapas)

import React, { useState, useEffect } from 'react';
import type { Player } from '../core/scoring/types';
import type { MatrizItem } from '../data/matrizData';
// Removidas importações não utilizadas - modal usa apenas opções hardcoded
// import { getResultados, getGolpes, getEfeitos, getDirecoes } from '../core/scoring/matrizUtils';
import './PointDetailsModal.css';

interface PointDetailsModalProps {
   isOpen: boolean;
   playerInFocus: Player;
   onConfirm: (details: Partial<MatrizItem>, winner: Player) => void;
   onCancel: () => void;
   preselectedResult?: string;
 }

const PointDetailsModal: React.FC<PointDetailsModalProps> = ({ isOpen, playerInFocus, onConfirm, onCancel, preselectedResult }) => {
  const [resultado, setResultado] = useState<string | undefined>();
  const [golpe, setGolpe] = useState<string | undefined>();
  const [efeito, setEfeito] = useState<string | undefined>();
  const [direcao, setDirecao] = useState<string | undefined>();

  const pointWinner = playerInFocus;

  useEffect(() => {
    if (isOpen) {
      setResultado(preselectedResult);
      setGolpe(undefined);
      setEfeito(undefined);
      setDirecao(undefined);
    }
  }, [isOpen, preselectedResult]); // Restaurado preselectedResult para garantir que mudanças sejam refletidas

  const handleConfirm = () => {
    if (!resultado) return;

    const efeitoFinal = devePularEfeito ? (golpe.includes('Voleio') ? '' : 'Cortado') : efeito;

    const item: Partial<MatrizItem> = {
      Resultado: resultado,
      Golpe: golpe,
      Efeito: efeitoFinal,
      Direcao: direcao
    };
    onConfirm(item, pointWinner);
  };

  // Opções fixas para garantir que sempre estejam presentes - alinhadas com matriz.txt
  const golpesFixos = [
    'Forehand - FH', 'Backhand - BH', 'Voleio Forehand - VFH', 'Voleio Backhand - VBH',
    'Smash - SM', 'Swingvolley - FH', 'Swingvolley - BH', 'Drop volley - FH', 'Drop volley - BH',
    'Drop shot - FH', 'Drop shot - BH'
  ];
  const efeitosFixos = ['Chapado', 'Top spin', 'Cortado'];
  const direcoesFixas = ['Centro', 'Cruzada', 'Inside In', 'Inside Out', 'Paralela'];

  const resultadosFixos = ['Erro forçado - EF', 'Erro não Forçado - ENF', 'Winner'];

  // Sempre mostrar as opções fixas de golpes
  const golpesDisponiveis = golpesFixos;

  // Para alguns golpes, o efeito é fixo (sempre "Cortado" ou "")
  const devePularEfeito = golpe && (
    golpe.includes('Forehand') ||
    golpe.includes('Backhand') ||
    golpe.includes('Drop volley') ||
    golpe.includes('Voleio') ||
    golpe.includes('Swingvolley') ||
    golpe.includes('Drop shot')
  );

  // Sempre mostrar as 3 opções fixas de efeitos se não for para pular efeito
  const efeitosDisponiveis = (golpe && !devePularEfeito) ? efeitosFixos : [];

  // Sempre mostrar as direções fixas conforme o tipo de golpe
  const direcoesDisponiveis = (() => {
    if (!efeito && !devePularEfeito) return [];
    if (devePularEfeito && !golpe) return [];
    const efeitoAtual = devePularEfeito ? 'Cortado' : efeito;
    if (!efeitoAtual || !resultado || !golpe) return [];

    // Voleios: apenas Cruzada, Paralela, Centro
   if (golpe.includes('Voleio') || golpe.includes('Drop volley') || golpe.includes('Drop shot') || golpe === 'Smash - SM') {
      return ['Cruzada', 'Paralela', 'Centro'];
    }
    // Demais golpes: todas as direções
    return direcoesFixas;
  })();

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
              {resultadosFixos.map((r) => (
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

          {golpe && !devePularEfeito && (
            <div className="section">
              <h4>Efeito</h4>
              <div className="button-group">
                {efeitosDisponiveis.map((e) => (
                  <button key={e} className={efeito === e ? 'active' : ''} onClick={() => { setEfeito(e); setDirecao(undefined); }}>{e}</button>
                ))}
              </div>
            </div>
          )}

          {((efeito && !devePularEfeito) || (golpe && devePularEfeito)) && (
            <div className="section">
              <h4>Direção</h4>
              <div className="button-group">
                {direcoesDisponiveis.map((d) => (
                  <button key={d} className={direcao === d ? 'active' : ''} onClick={() => setDirecao(d)}>{d}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onCancel}>Cancelar</button>
          <button className="confirm-btn" onClick={handleConfirm} disabled={!resultado}>
            Confirmar Ponto
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointDetailsModal;
