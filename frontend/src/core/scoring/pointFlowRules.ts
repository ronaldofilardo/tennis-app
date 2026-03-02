// pointFlowRules.ts
// Fonte de verdade derivada estritamente do arquivo fluxotosystem.txt.
// PREMISSA: nenhuma possibilidade omitida, nenhuma criada fora do arquivo.
// v7: requiresSubtipo2 diferencia sacador|passada (nunca sub2) de devolvedor|passada (sempre sub2).
//     getValidGolpes: devolvedor|passada|erro-forcado inclui Smash (igual ao erro-nao-forcado).
//     getValidGolpeEsp: contextual por vencedor+situacao+tipo; topspin varia radicalmente;
//     voleio devolvedor → sem lob; voleio sacador → com lob.
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
// REGRA: winner → nunca
// sacador|passada|Smash → sem sub2 (fluxotosystem.txt: subtipo2 vazio)
// devolvedor|passada|Smash → tem sub2 Out/Net (fluxotosystem.txt: subtipo2 Out|Net)
// passada|VBH|VFH (ambos vencedores) → tem sub2
// Quando golpe não informado → false provisório
export function requiresSubtipo2(
  vencedor: RallyVencedor,
  situacao: RallySituacao,
  tipo: RallyTipo,
  golpe?: RallyGolpe,
): boolean {
  if (tipo === "winner") return false;
  if (situacao === "passada") {
    if (!golpe) return false;
    if (golpe === "VBH" || golpe === "VFH") return true;
    // devolvedor|passada|Smash: tem sub2 Out/Net (fluxotosystem.txt linhas 706-711)
    if (golpe === "Smash" && vencedor === "devolvedor") return true;
    return false;
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
    // erro-forcado e erro-nao-forcado: VFH, VBH, Smash (IDs 617-700)
    return ["VFH", "VBH", "Smash"];
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
// todos os outros sem slice           -> cruzada, paralela, centro, inside-out, inside-in
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
  return ["cruzada", "paralela", "centro", "inside-out", "inside-in"];
}

// Golpes especiais validos — regra derivada do fluxotosystem.txt por golpe+efeito+contexto:
//  golpe ausente ou Smash → [] (sem golpe_esp)
//  flat                   → [] (sem golpe_esp)
//  slice                  → [lob, drop]
//  VBH/VFH (sem efeito)   → devolvedor: [drop, bate-pronto, swingvolley]
//                           sacador:    [lob, drop, bate-pronto, swingvolley]
//  topspin (contextual):
//    devolucao (ambos)              → [lob]
//    devolvedor|fundo|winner        → []
//    sacador|fundo|erro*            → [lob, drop, bate-pronto]
//    devolvedor|rede|erro*          → [lob]
//    resto (passada|winner, sacador|fundo|winner, sacador|rede|erro*...) → [lob, bate-pronto]
export function getValidGolpeEsp(
  golpe: RallyGolpe | undefined,
  efeito: RallyEfeito | undefined,
  vencedor?: RallyVencedor,
  situacao?: RallySituacao,
  tipo?: RallyTipo,
): RallyGolpeEsp[] {
  if (!golpe) return [];
  if (golpe === "Smash") return [];
  // VBH/VFH (voleio) — sem efeito
  if (!efeito) {
    // devolvedor|rede|winner e devolvedor|passada|erro*: sem lob (IDs 617-688, 701-721)
    if (vencedor === "devolvedor")
      return ["drop", "bate-pronto", "swingvolley"];
    // sacador|rede|winner e sacador|passada|erro*: com lob (IDs 1104-1181)
    return ["lob", "drop", "bate-pronto", "swingvolley"];
  }
  if (efeito === "flat") return [];
  if (efeito === "slice") return ["lob", "drop"];
  if (efeito === "topspin") {
    // devolucao (ambos os vencedores): apenas [lob] (IDs 427-466, 1060-1069)
    if (situacao === "devolucao") return ["lob"];
    // devolvedor|fundo|winner: sem golpe_esp (IDs 860-869)
    if (vencedor === "devolvedor" && situacao === "fundo" && tipo === "winner")
      return [];
    // sacador|fundo|erro*: [lob, drop, bate-pronto] (IDs 219-278)
    if (vencedor === "sacador" && situacao === "fundo" && tipo !== "winner")
      return ["lob", "drop", "bate-pronto"];
    // devolvedor|rede|erro*: [lob] apenas (IDs 722-761)
    if (vencedor === "devolvedor" && situacao === "rede") return ["lob"];
    // sacador|fundo|winner, sacador|rede|erro*, passada|winner (ambos): [lob, bate-pronto]
    return ["lob", "bate-pronto"];
  }
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
