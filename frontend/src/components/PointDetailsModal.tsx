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

  // Nova ordem para ERROS: situação → resultado → golpe → (sub1?) → (sub2/onde errou?) → ...
  // Para WINNER: winner nunca tem sub1/sub2, logo golpe fica na posição 3 também (inalterado)

  // Opções de cada campo derivadas das seleções anteriores
  const situacaoOpts = getValidSituacoes();
  const tipoOpts = sel.situacao ? getValidTipos(vencedor, sel.situacao) : [];

  // Golpe: disponível assim que o resultado for selecionado (erros e winner)
  const golpeReady = !!sel.tipo;
  const golpeOpts =
    golpeReady && sel.situacao && sel.tipo
      ? getValidGolpes(vencedor, sel.situacao, sel.tipo)
      : [];

  // Sub1/Sub2: aparecem DEPOIS do golpe (apenas em casos de erro)
  const needsSub1 =
    sel.situacao && sel.tipo
      ? requiresSubtipo1(vencedor, sel.situacao, sel.tipo)
      : false;
  // requiresSubtipo2 recebe golpe para decidir sub2 em passada (VBH/VFH sim, Smash não)
  const needsSub2 =
    sel.situacao && sel.tipo
      ? requiresSubtipo2(vencedor, sel.situacao, sel.tipo, sel.golpe)
      : false;

  const sub1Ready = !!sel.golpe;
  const sub1Opts = needsSub1 && sub1Ready ? getValidSubtipo1() : [];
  const sub2Ready = needsSub1 ? !!sel.sub1 : sub1Ready;
  const sub2Opts = needsSub2 && sub2Ready ? getValidSubtipo2() : [];

  const subtipoComplete =
    (!needsSub1 || !!sel.sub1) && (!needsSub2 || !!sel.sub2);

  // Efeito: após golpe + sub1/sub2 completos
  const needsEfeito =
    sel.situacao && sel.tipo
      ? requiresEfeito(vencedor, sel.situacao, sel.tipo)
      : false;
  const efeitoReady = !!sel.golpe && subtipoComplete;
  const efeitoOpts = needsEfeito && efeitoReady ? getValidEfeitos() : [];

  // Direção: após efeito (se necessário) ou após golpe+subtipo completos
  const direcaoReady =
    !!sel.golpe && subtipoComplete && (!needsEfeito || !!sel.efeito);
  const direcaoOpts =
    direcaoReady && sel.situacao && sel.tipo
      ? getValidDirecoes(vencedor, sel.situacao, sel.tipo, sel.efeito)
      : [];

  // Golpe especial: depende de golpe + efeito + contexto (vencedor, situacao, tipo)
  const golpeEspOpts = getValidGolpeEsp(
    sel.golpe,
    sel.efeito,
    vencedor,
    sel.situacao,
    sel.tipo,
  );

  // Confirmar fica disponível assim que 'golpe' for selecionado (registro parcial permitido)
  const isComplete = !!sel.golpe;

  // Cascata de reset: campos posteriores são limpos ao mudar campo anterior
  // Nova ordem para erros: situação → resultado → golpe → sub1 → sub2 → efeito → direção
  function update<K extends keyof Sel>(field: K, value: Sel[K]) {
    setSel((prev) => {
      if (field === "situacao") return { situacao: value as RallySituacao };
      if (field === "tipo")
        return { situacao: prev.situacao, tipo: value as RallyTipo };
      if (field === "golpe")
        // Golpe vem antes de sub1/sub2 para erros; reseta tudo que vem depois
        return {
          ...prev,
          golpe: value as RallyGolpe,
          sub1: undefined,
          sub2: undefined,
          efeito: undefined,
          direcao: undefined,
          golpe_esp: undefined,
        };
      if (field === "sub1")
        return {
          ...prev,
          sub1: value as RallySubtipo1,
          sub2: undefined,
          efeito: undefined,
          direcao: undefined,
          golpe_esp: undefined,
        };
      if (field === "sub2")
        return {
          ...prev,
          sub2: value as RallySubtipo2,
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
    const details = {
      vencedor,
      situacao: sel.situacao!,
      tipo: sel.tipo!,
      golpe: sel.golpe!,
      direcao: sel.direcao!,
      ...(sel.efeito ? { efeito: sel.efeito } : {}),
      ...(sel.golpe_esp ? { golpe_esp: sel.golpe_esp } : {}),
      ...(sel.sub1 ? { subtipo1: sel.sub1 } : {}),
      ...(sel.sub2 ? { subtipo2: sel.sub2 } : {}),
    } as import("../core/scoring/types").RallyDetails;
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
          {/* 1. Situacao — sempre */}
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

          {/* 2. Tipo — sempre */}
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

          {/* 3. Golpe — logo após resultado (erros E winner) */}
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

          {/* 4. Tipo de Erro (Rede) — sacador|rede|erro, após golpe */}
          {needsSub1 && (
            <div className={`pd-section${!sub1Ready ? " disabled" : ""}`}>
              <div className="pd-section-label">
                {stepNum++}. Tipo de Erro (Rede)
              </div>
              <BtnGroup
                options={sub1Opts}
                labels={SUBTIPO1_LABELS}
                selected={sel.sub1}
                disabled={!sub1Ready}
                onSelect={(v) => update("sub1", v)}
              />
            </div>
          )}

          {/* 4/5. Onde Errou? — Out/Net — apenas erros com VBH/VFH, após golpe */}
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

          {/* Efeito — apenas quando requerido */}
          {needsEfeito && (
            <div className={`pd-section${!efeitoReady ? " disabled" : ""}`}>
              <div className="pd-section-label">{stepNum++}. Efeito</div>
              <BtnGroup
                options={efeitoOpts}
                labels={EFEITO_LABELS}
                selected={sel.efeito}
                disabled={!efeitoReady}
                onSelect={(v) => update("efeito", v)}
              />
            </div>
          )}

          {/* Direção */}
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

          {/* Golpe Especial — omitido quando efeito=flat ou golpe=Smash (arquivo sem opções) */}
          {golpeEspOpts.length > 0 && (
            <div className={`pd-section${!sel.direcao ? " disabled" : ""}`}>
              <div className="pd-section-label">
                {stepNum++}. Golpe Especial
              </div>
              <BtnGroup
                options={golpeEspOpts}
                labels={GOLPE_ESP_LABELS}
                selected={sel.golpe_esp}
                disabled={!sel.direcao}
                onSelect={(v) => update("golpe_esp", v)}
              />
            </div>
          )}
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
