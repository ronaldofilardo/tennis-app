// pointFlowRules.ts
// Fonte de verdade derivada estritamente do arquivo fluxotosystem.txt.
// PREMISSA: nenhuma possibilidade omitida, nenhuma criada fora do arquivo.
// v6: golpe_esp depende de golpe+efeito (não de contexto); flat/Smash sem golpe_esp;
//     topspin→[lob,bate-pronto]; slice→[lob,drop]; volley→todos 4.
//     rede|winner (AMBOS vencedores) → 3 direções.
//     devolvedor|passada|erro-nao-forcado → Smash adicionado.
//     sacador|fundo|winner → slice válido (era incorretamente removido).
// Estrutura: vencedor|situacao|tipo|subtipo1|subtipo2|golpe|efeito|direcao|golpe_esp

import type {
  RallyVencedor,
  RallySituacao,
  RallyTipo,
  RallyGolpe,
  RallyEfeito,
  RallyDirecao,
  RallyGolpeEsp,
  RallySubtipo1,
  RallySubtipo2,
} from "./types";

// Situacoes validas (iguais para ambos os vencedores)
export const ALL_SITUACOES: RallySituacao[] = [
  "devolucao",
  "fundo",
  "passada",
  "rede",
];

export function getValidSituacoes(): RallySituacao[] {
  return ALL_SITUACOES;
}

// Tipos validos por vencedor + situacao
// sacador|devolucao  -> SOMENTE erro-forcado, erro-nao-forcado (sem winner)
// devolvedor|devolucao -> SOMENTE winner (sem erro)
export function getValidTipos(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
): RallyTipo[] {
  if (situacao === "devolucao") {
    return vencedor === "sacador"
      ? ["erro-nao-forcado", "erro-forcado"]
      : ["winner"];
  }
  return ["erro-nao-forcado", "erro-forcado", "winner"];
}

// Subtipo1 (PassingShot / ServeReturn)
// APENAS: sacador | rede | erro-forcado ou erro-nao-forcado
export function requiresSubtipo1(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
): boolean {
  return vencedor === "sacador" && situacao === "rede" && tipo !== "winner";
}

// Efeito (topspin/slice/flat)
// NAO requerido em:
//   *qualquer*|passada|erro-* — golpes de voleio/smash sem efeito (sacador e devolvedor)
//   *qualquer*|rede|winner    — golpes de voleio/smash sem efeito (sacador e devolvedor)
export function requiresEfeito(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
): boolean {
  if (situacao === "passada" && tipo !== "winner") return false;
  if (situacao === "rede" && tipo === "winner") return false;
  return true;
}

export function getValidSubtipo1(): RallySubtipo1[] {
  return ["PassingShot", "ServeReturn"];
}

// Subtipo2 (Out / Net)
// REGRA: winner → nunca; sacador|passada → só se golpe=VBH ou VFH (Smash não tem sub2)
// Quando golpe não informado (fluxo golpe-first antes de selecionar golpe) → false provisório
export function requiresSubtipo2(
  _vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
  golpe?: RallyGolpe,
): boolean {
  if (tipo === "winner") return false;
  if (situacao === "passada") {
    // Para passada (sacador e devolvedor): VBH/VFH têm Out/Net; Smash não tem sub2
    if (!golpe) return false;
    return golpe === "VBH" || golpe === "VFH";
  }
  return true;
}

export function getValidSubtipo2(): RallySubtipo2[] {
  return ["Out", "Net"];
}

// Golpes validos por vencedor + situacao + tipo
export function getValidGolpes(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
): RallyGolpe[] {
  const isErro = tipo !== "winner";

  if (vencedor === "sacador") {
    if (situacao === "passada")
      return isErro ? ["VFH", "VBH", "Smash"] : ["FH", "BH"];
    if (situacao === "rede")
      return isErro ? ["FH", "BH"] : ["VFH", "VBH", "Smash"];
    return ["FH", "BH"]; // fundo | devolucao
  }

  // devolvedor
  if (situacao === "passada") {
    if (!isErro) return ["FH", "BH"];
    // erro-forcado: VFH, VBH; erro-nao-forcado: VFH, VBH, Smash (conforme fluxotosystem.txt)
    return tipo === "erro-nao-forcado"
      ? ["VFH", "VBH", "Smash"]
      : ["VFH", "VBH"];
  }
  if (situacao === "rede")
    return isErro ? ["FH", "BH"] : ["VFH", "VBH", "Smash"];
  return ["FH", "BH"]; // fundo | devolucao
}

// Efeitos validos: sempre topspin, slice, flat para todos os contextos do arquivo
export function getValidEfeitos(): RallyEfeito[] {
  return ["topspin", "slice", "flat"];
}

// Direcoes validas
// REGRA UNIVERSAL: efeito=slice -> sempre 3 direcoes (sem inside-in/out)
// passada|erro (qualquer vencedor)   -> cruzada, paralela, centro (sem inside)
// devolvedor|rede|winner             -> cruzada, paralela, centro (VBH/VFH/Smash sem inside)
// todos os outros sem slice           -> cruzada, paralela, centro, inside-in, inside-out
export function getValidDirecoes(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
  efeito?: RallyEfeito | "",
): RallyDirecao[] {
  if (efeito === "slice") {
    return ["cruzada", "paralela", "centro"];
  }
  if (situacao === "passada" && tipo !== "winner") {
    return ["cruzada", "paralela", "centro"];
  }
  // rede|winner (qualquer vencedor): VBH/VFH/Smash não têm inside-in/out
  if (situacao === "rede" && tipo === "winner") {
    return ["cruzada", "paralela", "centro"];
  }
  return ["cruzada", "paralela", "centro", "inside-in", "inside-out"];
}

// Golpes especiais validos — regra derivada do fluxotosystem.txt por golpe+efeito:
//  golpe ausente ou Smash             → [] (sem golpe_esp)
//  sem efeito (VBH/VFH = voleio)      → [lob, drop, bate-pronto, swingvolley]
//  efeito=flat                        → [] (sem golpe_esp)
//  efeito=topspin                     → [lob, bate-pronto]
//  efeito=slice                       → [lob, drop]
export function getValidGolpeEsp(
  golpe: RallyGolpe | undefined,
  efeito: RallyEfeito | undefined,
): RallyGolpeEsp[] {
  if (!golpe) return [];
  if (golpe === "Smash") return []; // Smash: sem golpe_esp
  if (!efeito) return ["lob", "drop", "swingvolley", "bate-pronto"]; // Voleio (VBH/VFH)
  if (efeito === "flat") return []; // flat: sem golpe_esp
  if (efeito === "topspin") return ["lob", "bate-pronto"]; // topspin: lob, bate-pronto
  if (efeito === "slice") return ["lob", "drop"]; // slice: lob, drop
  return [];
}

// Labels de exibicao
export const SITUACAO_LABELS: Record<RallySituacao, string> = {
  passada: "Passada",
  rede: "Rede",
  fundo: "Fundo de Quadra",
  devolucao: "Devolução de Saque",
};

export const TIPO_LABELS: Record<RallyTipo, string> = {
  winner: "Winner",
  "erro-forcado": "Erro Forçado",
  "erro-nao-forcado": "Erro Não Forçado",
};

export const SUBTIPO1_LABELS: Record<RallySubtipo1, string> = {
  PassingShot: "Passing Shot",
  ServeReturn: "Devolução de Saque",
};

export const SUBTIPO2_LABELS: Record<RallySubtipo2, string> = {
  Out: "Fora (Out)",
  Net: "Na Rede (Net)",
};

export const GOLPE_LABELS: Record<RallyGolpe, string> = {
  BH: "Backhand (BH)",
  FH: "Forehand (FH)",
  VBH: "Voleio BH",
  VFH: "Voleio FH",
  Smash: "Smash",
};

export const EFEITO_LABELS: Record<RallyEfeito, string> = {
  topspin: "Topspin",
  slice: "Slice",
  flat: "Flat",
};

export const DIRECAO_LABELS: Record<RallyDirecao, string> = {
  cruzada: "Cruzada",
  paralela: "Paralela",
  centro: "Centro",
  "inside-in": "Inside-in",
  "inside-out": "Inside-out",
};

export const GOLPE_ESP_LABELS: Record<RallyGolpeEsp, string> = {
  lob: "Lob",
  drop: "Drop Shot",
  "bate-pronto": "Bate-pronto",
  swingvolley: "Swing Volley",
};
