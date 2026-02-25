// pointFlowRules.ts
// Fonte de verdade derivada estritamente do arquivo fluxotosystem.txt.
// PREMISSA: nenhuma possibilidade omitida, nenhuma criada fora do arquivo.
// 2413 registros validados (UTF-16 LE) — arquivo atualizado.
// Mudancas v5: devolvedor|rede|winner -> 3 direcoes (VBH/VFH/Smash nao tem inside-in/out).
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
  "passada",
  "rede",
  "fundo",
  "devolucao",
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
      ? ["erro-forcado", "erro-nao-forcado"]
      : ["winner"];
  }
  return ["winner", "erro-forcado", "erro-nao-forcado"];
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
// Requerido em qualquer erro, EXCETO sacador|passada|erro (sem sub2 no arquivo)
export function requiresSubtipo2(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
): boolean {
  if (tipo === "winner") return false;
  if (vencedor === "sacador" && situacao === "passada") return false;
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
      return isErro ? ["VBH", "VFH", "Smash"] : ["BH", "FH"];
    if (situacao === "rede")
      return isErro ? ["BH", "FH"] : ["VBH", "VFH", "Smash"];
    return ["BH", "FH"]; // fundo | devolucao
  }

  // devolvedor
  if (situacao === "passada") return isErro ? ["VBH", "VFH"] : ["BH", "FH"]; // erro: sem Smash
  if (situacao === "rede")
    return isErro ? ["BH", "FH"] : ["VBH", "VFH", "Smash"];
  return ["BH", "FH"]; // fundo | devolucao
}

// Efeitos validos por contexto.
// sacador|fundo|winner -> topspin, flat (sem slice, conforme fluxotosystem.txt)
// todos os outros      -> topspin, slice, flat
export function getValidEfeitos(
  vencedor?: RallyVencedor,
  situacao?: RallySituacao,
  tipo?: RallyTipo,
): RallyEfeito[] {
  if (vencedor === "sacador" && situacao === "fundo" && tipo === "winner") {
    return ["topspin", "flat"];
  }
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
  if (vencedor === "devolvedor" && situacao === "rede" && tipo === "winner") {
    return ["cruzada", "paralela", "centro"];
  }
  return ["cruzada", "paralela", "centro", "inside-in", "inside-out"];
}

// Golpes especiais validos
// REGRA UNIVERSAL: efeito=slice -> sempre [drop, lob] (sem bate-pronto/swingvolley)
//
// Com efeito != slice, regras por contexto do arquivo (2413 registros):
//  drop,lob apenas:
//    devolucao (qualquer)
//    sacador|fundo|erro-*
//
//  bate-pronto,drop,lob (sem swingvolley):
//    *qualquer*|rede|erro-*
//
//  bate-pronto,drop,lob,swingvolley (todos):
//    todos os winners fora de devolucao
//    passada|erro (qualquer vencedor)
//    devolvedor|fundo|erro-*
export function getValidGolpeEsp(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
  efeito?: RallyEfeito | "",
): RallyGolpeEsp[] {
  // Regra universal: slice -> drop e lob apenas
  if (efeito === "slice") {
    return ["drop", "lob"];
  }

  if (situacao === "devolucao") {
    return ["drop", "lob"];
  }

  if (tipo !== "winner") {
    // rede + erro (qualquer vencedor) -> bate-pronto, drop, lob
    if (situacao === "rede") return ["bate-pronto", "drop", "lob"];
    // sacador|fundo|erro -> drop, lob (sem bate-pronto/swingvolley)
    if (situacao === "fundo" && vencedor === "sacador") return ["drop", "lob"];
    // devolvedor|fundo|erro e passada|erro (ambos) -> todos 4
  }

  return ["bate-pronto", "drop", "lob", "swingvolley"];
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
