// pointFlowRules.ts
// Fonte de verdade derivada estritamente do arquivo fluxotosystem.txt.
// PREMISSA: nenhuma possibilidade omitida, nenhuma criada fora do arquivo.
// 3522 registros validados (UTF-16 LE) — arquivo atualizado.
// Mudancas v2: tipo usa hifens (erro-forcado, erro-nao-forcado);
//              efeito e' vazio em sacador|passada|erro-* e sacador|rede|winner.
// Estrutura: id|vencedor|situacao|tipo|subtipo1|subtipo2|golpe|efeito|direcao|golpe_esp

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
//   sacador|passada|erro-forcado ou erro-nao-forcado — golpes de voleio/smash sem efeito
//   sacador|rede|winner                              — golpes de voleio/smash sem efeito
export function requiresEfeito(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
): boolean {
  if (vencedor === "sacador") {
    if (situacao === "passada" && tipo !== "winner") return false;
    if (situacao === "rede" && tipo === "winner") return false;
  }
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

// Efeitos validos (idem em todos os 4026 registros)
export function getValidEfeitos(): RallyEfeito[] {
  return ["topspin", "slice", "flat"];
}

// Direcoes validas
// sacador|passada|erro -> cruzada, paralela, centro (sem inside)
// todos os outros      -> cruzada, paralela, centro, inside-in, inside-out
export function getValidDirecoes(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
): RallyDirecao[] {
  if (vencedor === "sacador" && situacao === "passada" && tipo !== "winner") {
    return ["cruzada", "paralela", "centro"];
  }
  return ["cruzada", "paralela", "centro", "inside-in", "inside-out"];
}

// Golpes especiais validos
// Regras exatas do arquivo (3522 registros):
//
//  drop,lob apenas (2):
//    sacador|devolucao|erro-forcado
//    sacador|devolucao|erro-nao-forcado
//    devolvedor|devolucao|winner
//
//  bate-pronto,drop,lob (sem swingvolley, 3):
//    *qualquer*|rede|erro-forcado   (sacador com sub1+sub2, devolvedor com sub2)
//    *qualquer*|rede|erro-nao-forcado
//    devolvedor|fundo|erro-forcado ou erro-nao-forcado
//
//  bate-pronto,drop,lob,swingvolley (todos, 4): todos os outros
//    winner em passada/rede/fundo (qualquer vencedor)
//    sacador|passada|erro-* (golpes de voleio/smash)
//    sacador|fundo|erro-*
//    devolvedor|passada|erro-*
export function getValidGolpeEsp(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
): RallyGolpeEsp[] {
  if (situacao === "devolucao") {
    return ["drop", "lob"];
  }

  if (tipo !== "winner") {
    // rede: qualquer vencedor, qualquer erro -> bate-pronto,drop,lob
    if (situacao === "rede") return ["bate-pronto", "drop", "lob"];
    // fundo devolvedor: erro -> bate-pronto,drop,lob
    if (situacao === "fundo" && vencedor === "devolvedor")
      return ["bate-pronto", "drop", "lob"];
    // fundo sacador / passada sacador / passada devolvedor: erro -> todos 4
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
