// frontend/src/components/PointDetailsModal.tsx
import React, { useState, useEffect } from "react";
import type {
  Player,
  RallyDetails,
  RallyVencedor,
  RallySituacao,
  RallyTipo,
  RallyGolpe,
  RallyEfeito,
  RallyDirecao,
  RallyGolpeEsp,
  RallySubtipo1,
  RallySubtipo2,
} from "../core/scoring/types";
import {
  getValidSituacoes,
  getValidTipos,
  requiresSubtipo1,
  requiresSubtipo2,
  requiresEfeito,
  getValidSubtipo1,
  getValidSubtipo2,
  getValidGolpes,
  getValidEfeitos,
  getValidDirecoes,
  getValidGolpeEsp,
  SITUACAO_LABELS,
  TIPO_LABELS,
  SUBTIPO1_LABELS,
  SUBTIPO2_LABELS,
  GOLPE_LABELS,
  EFEITO_LABELS,
  DIRECAO_LABELS,
  GOLPE_ESP_LABELS,
} from "../core/scoring/pointFlowRules";
import "./PointDetailsModal.css";

interface PointDetailsModalProps {
  isOpen: boolean;
  playerWinner: Player;
  currentServer: Player;
  playerNames: { PLAYER_1: string; PLAYER_2: string };
  onConfirm: (details: RallyDetails | undefined) => void;
  onCancel: () => void;
}

interface Sel {
  situacao?: RallySituacao;
  tipo?: RallyTipo;
  sub1?: RallySubtipo1;
  sub2?: RallySubtipo2;
  golpe?: RallyGolpe;
  efeito?: RallyEfeito;
  direcao?: RallyDirecao;
  golpe_esp?: RallyGolpeEsp;
}

function BtnGroup<T extends string>({
  options,
  labels,
  selected,
  disabled,
  onSelect,
}: {
  options: T[];
  labels: Record<string, string>;
  selected: T | undefined;
  disabled: boolean;
  onSelect: (v: T) => void;
}) {
  if (!options.length) return null;
  return (
    <div className={`pd-btn-group${disabled ? " disabled" : ""}`}>
      {options.map((opt) => (
        <button
          key={opt}
          className={`pd-btn${selected === opt ? " active" : ""}`}
          disabled={disabled}
          onClick={() => onSelect(opt)}
          type="button"
        >
          {labels[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

const PointDetailsModal: React.FC<PointDetailsModalProps> = ({
  isOpen,
  playerWinner,
  currentServer,
  playerNames,
  onConfirm,
  onCancel,
}) => {
  const [sel, setSel] = useState<Sel>({});

  useEffect(() => {
    if (isOpen) setSel({});
  }, [isOpen, playerWinner]);

  if (!isOpen) return null;

  // Vencedor derivado automaticamente do botao clicado
  const vencedor: RallyVencedor =
    playerWinner === currentServer ? "sacador" : "devolvedor";
  const winnerName = playerNames[playerWinner];

  // Opcoes de cada campo derivadas das selecoes anteriores
  const situacaoOpts = getValidSituacoes();
  const tipoOpts = sel.situacao ? getValidTipos(vencedor, sel.situacao) : [];

  const needsSub1 =
    sel.situacao && sel.tipo
      ? requiresSubtipo1(vencedor, sel.situacao, sel.tipo)
      : false;
  const needsSub2 =
    sel.situacao && sel.tipo
      ? requiresSubtipo2(vencedor, sel.situacao, sel.tipo)
      : false;
  const needsEfeito =
    sel.situacao && sel.tipo
      ? requiresEfeito(vencedor, sel.situacao, sel.tipo)
      : true;

  // Sub1 desbloqueado apos tipo
  const sub1Opts = needsSub1 ? getValidSubtipo1() : [];
  // Sub2 desbloqueado apos sub1 (se necessario) ou apos tipo
  const sub2Ready = needsSub1 ? !!sel.sub1 : !!sel.tipo;
  const sub2Opts = needsSub2 && sub2Ready ? getValidSubtipo2() : [];

  // Subtipo completo: tudo necessario foi preenchido?
  const subtipoComplete =
    (!needsSub1 || !!sel.sub1) && (!needsSub2 || !!sel.sub2);

  const golpeReady = !!sel.tipo && subtipoComplete;
  const golpeOpts =
    golpeReady && sel.situacao && sel.tipo
      ? getValidGolpes(vencedor, sel.situacao, sel.tipo)
      : [];

  // Efeito: apenas quando requerido pelo arquivo (ex: voleio/smash não tem efeito)
  const efeitoOpts = needsEfeito && !!sel.golpe ? getValidEfeitos() : [];
  // Direção fica pronta após efeito (se requerido) ou após golpe (se efeito não requerido)
  const direcaoReady = needsEfeito ? !!sel.efeito : !!sel.golpe;
  const direcaoOpts =
    direcaoReady && sel.situacao && sel.tipo
      ? getValidDirecoes(vencedor, sel.situacao, sel.tipo)
      : [];
  const golpeEspOpts =
    !!sel.direcao && sel.situacao && sel.tipo
      ? getValidGolpeEsp(vencedor, sel.situacao, sel.tipo)
      : [];

  const isComplete =
    !!sel.situacao &&
    !!sel.tipo &&
    subtipoComplete &&
    !!sel.golpe &&
    (!needsEfeito || !!sel.efeito) &&
    !!sel.direcao &&
    !!sel.golpe_esp;

  // Atualiza selecao em cascata (campos posteriores sao resetados)
  function update<K extends keyof Sel>(field: K, value: Sel[K]) {
    setSel((prev) => {
      if (field === "situacao") return { situacao: value as RallySituacao };
      if (field === "tipo")
        return { situacao: prev.situacao, tipo: value as RallyTipo };
      if (field === "sub1")
        return {
          ...prev,
          sub1: value as RallySubtipo1,
          sub2: undefined,
          golpe: undefined,
          efeito: undefined,
          direcao: undefined,
          golpe_esp: undefined,
        };
      if (field === "sub2")
        return {
          ...prev,
          sub2: value as RallySubtipo2,
          golpe: undefined,
          efeito: undefined,
          direcao: undefined,
          golpe_esp: undefined,
        };
      if (field === "golpe")
        return {
          ...prev,
          golpe: value as RallyGolpe,
          efeito: undefined,
          direcao: undefined,
          golpe_esp: undefined,
        };
      if (field === "efeito")
        return {
          ...prev,
          efeito: value as RallyEfeito,
          direcao: undefined,
          golpe_esp: undefined,
        };
      if (field === "direcao")
        return {
          ...prev,
          direcao: value as RallyDirecao,
          golpe_esp: undefined,
        };
      return { ...prev, [field]: value };
    });
  }

  function handleConfirm() {
    if (!isComplete) return;
    const details: RallyDetails = {
      vencedor,
      situacao: sel.situacao!,
      tipo: sel.tipo!,
      golpe: sel.golpe!,
      efeito: sel.efeito!,
      direcao: sel.direcao!,
      golpe_esp: sel.golpe_esp!,
      ...(sel.sub1 ? { subtipo1: sel.sub1 } : {}),
      ...(sel.sub2 ? { subtipo2: sel.sub2 } : {}),
    };
    onConfirm(details);
  }

  let stepNum = 1;

  return (
    <div
      className="point-details-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="point-details-modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="pd-header">
          <h3>Detalhes do Ponto</h3>
          <span className={`pd-winner-badge ${vencedor}`}>
            {vencedor === "sacador" ? "🎾 Sacador" : "↩️ Devolvedor"} —{" "}
            {winnerName}
          </span>
        </div>

        {/* Body */}
        <div className="pd-body">
          {/* 1. Situacao */}
          <div className="pd-section">
            <div className="pd-section-label">
              {stepNum++}. Situação do Ponto
            </div>
            <BtnGroup
              options={situacaoOpts}
              labels={SITUACAO_LABELS}
              selected={sel.situacao}
              disabled={false}
              onSelect={(v) => update("situacao", v)}
            />
          </div>

          {/* 2. Tipo */}
          <div className={`pd-section${!sel.situacao ? " disabled" : ""}`}>
            <div className="pd-section-label">{stepNum++}. Resultado</div>
            <BtnGroup
              options={tipoOpts}
              labels={TIPO_LABELS}
              selected={sel.tipo}
              disabled={!sel.situacao}
              onSelect={(v) => update("tipo", v)}
            />
          </div>

          {/* 3. Subtipo1 - somente sacador|rede|erro */}
          {needsSub1 && (
            <div className={`pd-section${!sel.tipo ? " disabled" : ""}`}>
              <div className="pd-section-label">
                {stepNum++}. Tipo de Erro (Rede)
              </div>
              <BtnGroup
                options={sub1Opts}
                labels={SUBTIPO1_LABELS}
                selected={sel.sub1}
                disabled={!sel.tipo}
                onSelect={(v) => update("sub1", v)}
              />
            </div>
          )}

          {/* Subtipo2 - Out/Net - maioria dos erros */}
          {needsSub2 && (
            <div className={`pd-section${!sub2Ready ? " disabled" : ""}`}>
              <div className="pd-section-label">{stepNum++}. Onde Errou?</div>
              <BtnGroup
                options={sub2Opts}
                labels={SUBTIPO2_LABELS}
                selected={sel.sub2}
                disabled={!sub2Ready}
                onSelect={(v) => update("sub2", v)}
              />
            </div>
          )}

          {/* Golpe */}
          <div className={`pd-section${!golpeReady ? " disabled" : ""}`}>
            <div className="pd-section-label">{stepNum++}. Golpe</div>
            <BtnGroup
              options={golpeOpts}
              labels={GOLPE_LABELS}
              selected={sel.golpe}
              disabled={!golpeReady}
              onSelect={(v) => update("golpe", v)}
            />
          </div>

          {/* Efeito - apenas quando requerido (ex: não aparece para voleio/smash) */}
          {needsEfeito && (
            <div className={`pd-section${!sel.golpe ? " disabled" : ""}`}>
              <div className="pd-section-label">{stepNum++}. Efeito</div>
              <BtnGroup
                options={efeitoOpts}
                labels={EFEITO_LABELS}
                selected={sel.efeito}
                disabled={!sel.golpe}
                onSelect={(v) => update("efeito", v)}
              />
            </div>
          )}

          {/* Direcao */}
          <div className={`pd-section${!direcaoReady ? " disabled" : ""}`}>
            <div className="pd-section-label">{stepNum++}. Direção</div>
            <BtnGroup
              options={direcaoOpts}
              labels={DIRECAO_LABELS}
              selected={sel.direcao}
              disabled={!direcaoReady}
              onSelect={(v) => update("direcao", v)}
            />
          </div>

          {/* Golpe Especial */}
          <div className={`pd-section${!sel.direcao ? " disabled" : ""}`}>
            <div className="pd-section-label">{stepNum++}. Golpe Especial</div>
            <BtnGroup
              options={golpeEspOpts}
              labels={GOLPE_ESP_LABELS}
              selected={sel.golpe_esp}
              disabled={!sel.direcao}
              onSelect={(v) => update("golpe_esp", v)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pd-footer">
          <div className="pd-footer-row">
            <button
              className="pd-btn-confirm"
              disabled={!isComplete}
              onClick={handleConfirm}
              type="button"
            >
              Confirmar Ponto
            </button>
            <button
              className="pd-btn-skip"
              onClick={() => onConfirm(undefined)}
              type="button"
            >
              Pular
            </button>
          </div>
          <button className="pd-btn-cancel" onClick={onCancel} type="button">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointDetailsModal;
