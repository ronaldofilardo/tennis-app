// pointFlowRules.test.ts
// Valida TODOS os combos únicos derivados do fluxotosystem.txt (2413 registros, v5).
// PREMISSA: nenhuma possibilidade omitida, nenhuma criada fora do arquivo.
// v4: efeito=slice -> SEMPRE 3 direcoes e golpe_esp=[drop,lob] (regra universal).
// v5: devolvedor|rede|winner -> 3 direcoes (VBH/VFH/Smash sem inside-in/out).

import { describe, it, expect } from "vitest";
import {
  getValidTipos,
  getValidGolpes,
  getValidEfeitos,
  getValidDirecoes,
  getValidGolpeEsp,
  getValidSubtipo1,
  getValidSubtipo2,
  requiresSubtipo1,
  requiresSubtipo2,
  requiresEfeito,
  ALL_SITUACOES,
} from "./pointFlowRules";

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
const ALL5_DIRS = ["centro", "cruzada", "inside-in", "inside-out", "paralela"];
const ONLY3_DIRS = ["centro", "cruzada", "paralela"];
const ALL4_ESP = ["bate-pronto", "drop", "lob", "swingvolley"];
const NO_SW_ESP = ["bate-pronto", "drop", "lob"];
const DEVOLV_SACADOR_ESP = ["drop", "lob"];
const DEVOLV_DEVOLV_ESP = ["drop", "lob"];
const ALL3_EF = ["flat", "slice", "topspin"];

function sorted(arr: string[]) {
  return [...arr].sort();
}

// ────────────────────────────────────────────────────────────────
// getValidSituacoes
// ────────────────────────────────────────────────────────────────
describe("ALL_SITUACOES", () => {
  it("deve conter passada, rede, fundo, devolucao", () => {
    expect(sorted(ALL_SITUACOES)).toEqual([
      "devolucao",
      "fundo",
      "passada",
      "rede",
    ]);
  });
});

// ────────────────────────────────────────────────────────────────
// getValidTipos
// ────────────────────────────────────────────────────────────────
describe("getValidTipos", () => {
  it("sacador|devolucao → apenas erros (com hifens)", () => {
    expect(sorted(getValidTipos("sacador", "devolucao"))).toEqual([
      "erro-forcado",
      "erro-nao-forcado",
    ]);
  });

  it("devolvedor|devolucao → apenas winner", () => {
    expect(getValidTipos("devolvedor", "devolucao")).toEqual(["winner"]);
  });

  it.each([
    ["sacador", "passada"],
    ["sacador", "rede"],
    ["sacador", "fundo"],
    ["devolvedor", "passada"],
    ["devolvedor", "rede"],
    ["devolvedor", "fundo"],
  ] as const)('"%s|%s" → todos os três tipos', (v, s) => {
    expect(sorted(getValidTipos(v, s))).toEqual([
      "erro-forcado",
      "erro-nao-forcado",
      "winner",
    ]);
  });
});

// ────────────────────────────────────────────────────────────────
// requiresSubtipo1 / getValidSubtipo1
// ────────────────────────────────────────────────────────────────
describe("requiresSubtipo1", () => {
  it("sacador|rede|erro-forcado → true", () => {
    expect(requiresSubtipo1("sacador", "rede", "erro-forcado")).toBe(true);
  });
  it("sacador|rede|erro-nao-forcado → true", () => {
    expect(requiresSubtipo1("sacador", "rede", "erro-nao-forcado")).toBe(true);
  });
  it("sacador|rede|winner → false", () => {
    expect(requiresSubtipo1("sacador", "rede", "winner")).toBe(false);
  });
  it("devolvedor|rede|erro-forcado → false", () => {
    expect(requiresSubtipo1("devolvedor", "rede", "erro-forcado")).toBe(false);
  });
  it("sacador|passada|erro-forcado → false", () => {
    expect(requiresSubtipo1("sacador", "passada", "erro-forcado")).toBe(false);
  });

  it("getValidSubtipo1 → PassingShot e ServeReturn", () => {
    expect(sorted(getValidSubtipo1())).toEqual(["PassingShot", "ServeReturn"]);
  });
});

// ────────────────────────────────────────────────────────────────
// requiresSubtipo2 / getValidSubtipo2
// ────────────────────────────────────────────────────────────────
describe("requiresSubtipo2", () => {
  it("qualquer winner → false", () => {
    expect(requiresSubtipo2("sacador", "passada", "winner")).toBe(false);
    expect(requiresSubtipo2("devolvedor", "rede", "winner")).toBe(false);
  });
  it("sacador|passada|erro → false (arquivo não tem sub2)", () => {
    expect(requiresSubtipo2("sacador", "passada", "erro-forcado")).toBe(false);
    expect(requiresSubtipo2("sacador", "passada", "erro-nao-forcado")).toBe(
      false,
    );
  });
  it("devolvedor|passada|erro → true", () => {
    expect(requiresSubtipo2("devolvedor", "passada", "erro-forcado")).toBe(
      true,
    );
    expect(requiresSubtipo2("devolvedor", "passada", "erro-nao-forcado")).toBe(
      true,
    );
  });
  it("sacador|rede|erro → true", () => {
    expect(requiresSubtipo2("sacador", "rede", "erro-forcado")).toBe(true);
  });
  it("getValidSubtipo2 → Out e Net", () => {
    expect(sorted(getValidSubtipo2())).toEqual(["Net", "Out"]);
  });
});

// ────────────────────────────────────────────────────────────────
// requiresEfeito
// ────────────────────────────────────────────────────────────────
describe("requiresEfeito", () => {
  // Casos SEM efeito (golpes de voleio/smash)
  it("sacador|passada|erro-forcado → false (VBH/VFH/Smash sem efeito)", () => {
    expect(requiresEfeito("sacador", "passada", "erro-forcado")).toBe(false);
  });
  it("sacador|passada|erro-nao-forcado → false", () => {
    expect(requiresEfeito("sacador", "passada", "erro-nao-forcado")).toBe(
      false,
    );
  });
  it("sacador|rede|winner → false (VBH/VFH/Smash sem efeito)", () => {
    expect(requiresEfeito("sacador", "rede", "winner")).toBe(false);
  });

  // Casos COM efeito
  it("sacador|passada|winner → true", () => {
    expect(requiresEfeito("sacador", "passada", "winner")).toBe(true);
  });
  it("sacador|rede|erro-forcado → true", () => {
    expect(requiresEfeito("sacador", "rede", "erro-forcado")).toBe(true);
  });
  it("devolvedor|passada|winner → true", () => {
    expect(requiresEfeito("devolvedor", "passada", "winner")).toBe(true);
  });
  it("devolvedor|passada|erro-forcado → false (VBH/VFH sem efeito)", () => {
    expect(requiresEfeito("devolvedor", "passada", "erro-forcado")).toBe(false);
  });
  it("devolvedor|passada|erro-nao-forcado → false", () => {
    expect(requiresEfeito("devolvedor", "passada", "erro-nao-forcado")).toBe(
      false,
    );
  });
  it("devolvedor|rede|winner → false (Smash/VBH/VFH sem efeito)", () => {
    expect(requiresEfeito("devolvedor", "rede", "winner")).toBe(false);
  });
  it("devolvedor|devolucao|winner → true", () => {
    expect(requiresEfeito("devolvedor", "devolucao", "winner")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────
// getValidEfeitos
// ────────────────────────────────────────────────────────────────
describe("getValidEfeitos", () => {
  it("sem contexto → retorna flat, slice, topspin", () => {
    expect(sorted(getValidEfeitos())).toEqual(sorted(ALL3_EF));
  });
  it("sacador|fundo|winner → topspin, flat (sem slice)", () => {
    expect(sorted(getValidEfeitos("sacador", "fundo", "winner"))).toEqual(
      sorted(["flat", "topspin"]),
    );
  });
  it("sacador|rede|erro-forcado → flat, slice, topspin (todos)", () => {
    expect(sorted(getValidEfeitos("sacador", "rede", "erro-forcado"))).toEqual(
      sorted(ALL3_EF),
    );
  });
  it("devolvedor|fundo|winner → flat, slice, topspin (todos)", () => {
    expect(sorted(getValidEfeitos("devolvedor", "fundo", "winner"))).toEqual(
      sorted(ALL3_EF),
    );
  });
});

// ────────────────────────────────────────────────────────────────
// getValidGolpes — 37 combos do arquivo
// ────────────────────────────────────────────────────────────────
describe("getValidGolpes", () => {
  // sacador
  it("sacador|passada|winner → BH,FH", () => {
    expect(sorted(getValidGolpes("sacador", "passada", "winner"))).toEqual([
      "BH",
      "FH",
    ]);
  });
  it("sacador|passada|erro-forcado → VBH,VFH,Smash", () => {
    expect(
      sorted(getValidGolpes("sacador", "passada", "erro-forcado")),
    ).toEqual(["Smash", "VBH", "VFH"]);
  });
  it("sacador|passada|erro-nao-forcado → VBH,VFH,Smash", () => {
    expect(
      sorted(getValidGolpes("sacador", "passada", "erro-nao-forcado")),
    ).toEqual(["Smash", "VBH", "VFH"]);
  });
  it("sacador|rede|winner → VBH,VFH,Smash", () => {
    expect(sorted(getValidGolpes("sacador", "rede", "winner"))).toEqual([
      "Smash",
      "VBH",
      "VFH",
    ]);
  });
  it("sacador|rede|erro-forcado → BH,FH", () => {
    expect(sorted(getValidGolpes("sacador", "rede", "erro-forcado"))).toEqual([
      "BH",
      "FH",
    ]);
  });
  it("sacador|rede|erro-nao-forcado → BH,FH", () => {
    expect(
      sorted(getValidGolpes("sacador", "rede", "erro-nao-forcado")),
    ).toEqual(["BH", "FH"]);
  });
  it("sacador|fundo|winner → BH,FH", () => {
    expect(sorted(getValidGolpes("sacador", "fundo", "winner"))).toEqual([
      "BH",
      "FH",
    ]);
  });
  it("sacador|fundo|erro-forcado → BH,FH", () => {
    expect(sorted(getValidGolpes("sacador", "fundo", "erro-forcado"))).toEqual([
      "BH",
      "FH",
    ]);
  });
  it("sacador|devolucao|erro-forcado → BH,FH", () => {
    expect(
      sorted(getValidGolpes("sacador", "devolucao", "erro-forcado")),
    ).toEqual(["BH", "FH"]);
  });

  // devolvedor
  it("devolvedor|passada|winner → BH,FH", () => {
    expect(sorted(getValidGolpes("devolvedor", "passada", "winner"))).toEqual([
      "BH",
      "FH",
    ]);
  });
  it("devolvedor|passada|erro-forcado → VBH,VFH (sem Smash)", () => {
    expect(
      sorted(getValidGolpes("devolvedor", "passada", "erro-forcado")),
    ).toEqual(["VBH", "VFH"]);
  });
  it("devolvedor|passada|erro-nao-forcado → VBH,VFH", () => {
    expect(
      sorted(getValidGolpes("devolvedor", "passada", "erro-nao-forcado")),
    ).toEqual(["VBH", "VFH"]);
  });
  it("devolvedor|rede|winner → VBH,VFH,Smash", () => {
    expect(sorted(getValidGolpes("devolvedor", "rede", "winner"))).toEqual([
      "Smash",
      "VBH",
      "VFH",
    ]);
  });
  it("devolvedor|rede|erro-forcado → BH,FH", () => {
    expect(
      sorted(getValidGolpes("devolvedor", "rede", "erro-forcado")),
    ).toEqual(["BH", "FH"]);
  });
  it("devolvedor|fundo|winner → BH,FH", () => {
    expect(sorted(getValidGolpes("devolvedor", "fundo", "winner"))).toEqual([
      "BH",
      "FH",
    ]);
  });
  it("devolvedor|fundo|erro-forcado → BH,FH", () => {
    expect(
      sorted(getValidGolpes("devolvedor", "fundo", "erro-forcado")),
    ).toEqual(["BH", "FH"]);
  });
  it("devolvedor|devolucao|winner → BH,FH", () => {
    expect(sorted(getValidGolpes("devolvedor", "devolucao", "winner"))).toEqual(
      ["BH", "FH"],
    );
  });
});

// ────────────────────────────────────────────────────────────────
// getValidDirecoes
// ────────────────────────────────────────────────────────────────
describe("getValidDirecoes", () => {
  it("sacador|passada|erro-forcado → 3 direções (sem inside)", () => {
    expect(
      sorted(getValidDirecoes("sacador", "passada", "erro-forcado")),
    ).toEqual(sorted(ONLY3_DIRS));
  });
  it("sacador|passada|erro-nao-forcado → 3 direções", () => {
    expect(
      sorted(getValidDirecoes("sacador", "passada", "erro-nao-forcado")),
    ).toEqual(sorted(ONLY3_DIRS));
  });
  it("sacador|passada|winner → 5 direções", () => {
    expect(sorted(getValidDirecoes("sacador", "passada", "winner"))).toEqual(
      sorted(ALL5_DIRS),
    );
  });
  it("sacador|rede|winner → 5 direções", () => {
    expect(sorted(getValidDirecoes("sacador", "rede", "winner"))).toEqual(
      sorted(ALL5_DIRS),
    );
  });
  it("sacador|rede|erro-forcado → 5 direções", () => {
    expect(sorted(getValidDirecoes("sacador", "rede", "erro-forcado"))).toEqual(
      sorted(ALL5_DIRS),
    );
  });
  it("devolvedor|passada|erro-forcado → 3 direções (sem inside)", () => {
    expect(
      sorted(getValidDirecoes("devolvedor", "passada", "erro-forcado")),
    ).toEqual(sorted(ONLY3_DIRS));
  });
  it("devolvedor|passada|erro-nao-forcado → 3 direções (sem inside)", () => {
    expect(
      sorted(getValidDirecoes("devolvedor", "passada", "erro-nao-forcado")),
    ).toEqual(sorted(ONLY3_DIRS));
  });
  it("devolvedor|devolucao|winner → 5 direções", () => {
    expect(
      sorted(getValidDirecoes("devolvedor", "devolucao", "winner")),
    ).toEqual(sorted(ALL5_DIRS));
  });
  it("sacador|devolucao|erro-forcado → 5 direções", () => {
    expect(
      sorted(getValidDirecoes("sacador", "devolucao", "erro-forcado")),
    ).toEqual(sorted(ALL5_DIRS));
  });
  it("devolvedor|rede|winner → 3 direções (VBH/VFH/Smash sem inside-in/out)", () => {
    expect(sorted(getValidDirecoes("devolvedor", "rede", "winner"))).toEqual(
      sorted(ONLY3_DIRS),
    );
  });
  it("sacador|rede|winner → 5 direções (BH/FH com inside)", () => {
    expect(sorted(getValidDirecoes("sacador", "rede", "winner"))).toEqual(
      sorted(ALL5_DIRS),
    );
  });
});

// ────────────────────────────────────────────────────────────────
// getValidGolpeEsp — regras críticas do arquivo
// ────────────────────────────────────────────────────────────────
describe("getValidGolpeEsp", () => {
  // sacador|devolucao|erro-* → apenas drop,lob
  it("sacador|devolucao|erro-forcado → drop,lob", () => {
    expect(
      sorted(getValidGolpeEsp("sacador", "devolucao", "erro-forcado")),
    ).toEqual(sorted(DEVOLV_SACADOR_ESP));
  });
  it("sacador|devolucao|erro-nao-forcado → drop,lob", () => {
    expect(
      sorted(getValidGolpeEsp("sacador", "devolucao", "erro-nao-forcado")),
    ).toEqual(sorted(DEVOLV_SACADOR_ESP));
  });

  // devolvedor|devolucao|winner → drop,lob (sem swingvolley)
  it("devolvedor|devolucao|winner → drop,lob", () => {
    expect(
      sorted(getValidGolpeEsp("devolvedor", "devolucao", "winner")),
    ).toEqual(sorted(DEVOLV_DEVOLV_ESP));
  });

  // rede + qualquer erro (sacador e devolvedor) → bate-pronto,drop,lob (sem swingvolley)
  it("sacador|rede|erro-forcado → bate-pronto,drop,lob (sem swingvolley)", () => {
    expect(sorted(getValidGolpeEsp("sacador", "rede", "erro-forcado"))).toEqual(
      sorted(NO_SW_ESP),
    );
  });
  it("sacador|rede|erro-nao-forcado → bate-pronto,drop,lob", () => {
    expect(
      sorted(getValidGolpeEsp("sacador", "rede", "erro-nao-forcado")),
    ).toEqual(sorted(NO_SW_ESP));
  });
  it("devolvedor|rede|erro-forcado → bate-pronto,drop,lob", () => {
    expect(
      sorted(getValidGolpeEsp("devolvedor", "rede", "erro-forcado")),
    ).toEqual(sorted(NO_SW_ESP));
  });
  it("devolvedor|rede|erro-nao-forcado → bate-pronto,drop,lob", () => {
    expect(
      sorted(getValidGolpeEsp("devolvedor", "rede", "erro-nao-forcado")),
    ).toEqual(sorted(NO_SW_ESP));
  });

  // devolvedor|fundo|erro → todos 4 (conforme fluxotosystem.txt atualizado)
  it("devolvedor|fundo|erro-forcado → todos 4", () => {
    expect(
      sorted(getValidGolpeEsp("devolvedor", "fundo", "erro-forcado")),
    ).toEqual(sorted(ALL4_ESP));
  });
  it("devolvedor|fundo|erro-nao-forcado → todos 4", () => {
    expect(
      sorted(getValidGolpeEsp("devolvedor", "fundo", "erro-nao-forcado")),
    ).toEqual(sorted(ALL4_ESP));
  });

  // Todos os 4 (bate-pronto,drop,lob,swingvolley)
  it("sacador|passada|winner → todos 4", () => {
    expect(sorted(getValidGolpeEsp("sacador", "passada", "winner"))).toEqual(
      sorted(ALL4_ESP),
    );
  });
  it("sacador|passada|erro-forcado → todos 4 (golpe especial para smash/voleio)", () => {
    expect(
      sorted(getValidGolpeEsp("sacador", "passada", "erro-forcado")),
    ).toEqual(sorted(ALL4_ESP));
  });
  it("sacador|passada|erro-nao-forcado → todos 4", () => {
    expect(
      sorted(getValidGolpeEsp("sacador", "passada", "erro-nao-forcado")),
    ).toEqual(sorted(ALL4_ESP));
  });
  it("sacador|rede|winner → todos 4", () => {
    expect(sorted(getValidGolpeEsp("sacador", "rede", "winner"))).toEqual(
      sorted(ALL4_ESP),
    );
  });
  it("sacador|fundo|winner → todos 4", () => {
    expect(sorted(getValidGolpeEsp("sacador", "fundo", "winner"))).toEqual(
      sorted(ALL4_ESP),
    );
  });
  // sacador|fundo|erro → drop, lob (conforme fluxotosystem.txt atualizado)
  it("sacador|fundo|erro-forcado → drop, lob", () => {
    expect(
      sorted(getValidGolpeEsp("sacador", "fundo", "erro-forcado")),
    ).toEqual(sorted(["drop", "lob"]));
  });
  it("sacador|fundo|erro-nao-forcado → drop, lob", () => {
    expect(
      sorted(getValidGolpeEsp("sacador", "fundo", "erro-nao-forcado")),
    ).toEqual(sorted(["drop", "lob"]));
  });
  it("devolvedor|passada|winner → todos 4", () => {
    expect(sorted(getValidGolpeEsp("devolvedor", "passada", "winner"))).toEqual(
      sorted(ALL4_ESP),
    );
  });
  it("devolvedor|passada|erro-forcado → todos 4", () => {
    expect(
      sorted(getValidGolpeEsp("devolvedor", "passada", "erro-forcado")),
    ).toEqual(sorted(ALL4_ESP));
  });
  it("devolvedor|passada|erro-nao-forcado → todos 4", () => {
    expect(
      sorted(getValidGolpeEsp("devolvedor", "passada", "erro-nao-forcado")),
    ).toEqual(sorted(ALL4_ESP));
  });
  it("devolvedor|rede|winner → todos 4", () => {
    expect(sorted(getValidGolpeEsp("devolvedor", "rede", "winner"))).toEqual(
      sorted(ALL4_ESP),
    );
  });
  it("devolvedor|fundo|winner → todos 4", () => {
    expect(sorted(getValidGolpeEsp("devolvedor", "fundo", "winner"))).toEqual(
      sorted(ALL4_ESP),
    );
  });

  // rede winner nunca é 3 (apenas erros são 3)
  it("sacador|rede|winner NÃO deve ser 3 itens", () => {
    expect(getValidGolpeEsp("sacador", "rede", "winner")).toHaveLength(4);
  });
});

// ────────────────────────────────────────────────────────────────
// REGRA UNIVERSAL DO ARQUIVO: efeito=slice
// ────────────────────────────────────────────────────────────────
describe("regra universal slice — getValidDirecoes", () => {
  it.each([
    ["sacador", "rede", "erro-forcado"],
    ["sacador", "rede", "erro-nao-forcado"],
    ["sacador", "fundo", "erro-forcado"],
    ["sacador", "fundo", "erro-nao-forcado"],
    ["sacador", "devolucao", "erro-forcado"],
    ["sacador", "devolucao", "erro-nao-forcado"],
    ["sacador", "passada", "winner"],
    ["devolvedor", "rede", "erro-forcado"],
    ["devolvedor", "rede", "erro-nao-forcado"],
    ["devolvedor", "fundo", "erro-forcado"],
    ["devolvedor", "fundo", "erro-nao-forcado"],
    ["devolvedor", "fundo", "winner"],
    ["devolvedor", "passada", "winner"],
    ["devolvedor", "devolucao", "winner"],
  ] as const)('"slice" sempre retorna 3 direções em %s|%s|%s', (v, s, t) => {
    expect(sorted(getValidDirecoes(v, s, t, "slice"))).toEqual(
      sorted(ONLY3_DIRS),
    );
  });

  it("topspin em contexto que normalmente teria 5 dirs → 5 dirs", () => {
    expect(
      sorted(getValidDirecoes("sacador", "rede", "erro-forcado", "topspin")),
    ).toEqual(sorted(ALL5_DIRS));
  });

  it("flat em contexto que normalmente teria 5 dirs → 5 dirs", () => {
    expect(
      sorted(getValidDirecoes("devolvedor", "fundo", "winner", "flat")),
    ).toEqual(sorted(ALL5_DIRS));
  });

  it("sem efeito (voleio/smash) em passada|erro → ainda 3 dirs", () => {
    expect(
      sorted(getValidDirecoes("sacador", "passada", "erro-forcado", "")),
    ).toEqual(sorted(ONLY3_DIRS));
  });
});

describe("regra universal slice — getValidGolpeEsp", () => {
  it.each([
    ["sacador", "rede", "erro-forcado"],
    ["sacador", "rede", "erro-nao-forcado"],
    ["sacador", "fundo", "erro-forcado"],
    ["sacador", "fundo", "erro-nao-forcado"],
    ["sacador", "devolucao", "erro-forcado"],
    ["sacador", "devolucao", "erro-nao-forcado"],
    ["sacador", "passada", "winner"],
    ["devolvedor", "rede", "erro-forcado"],
    ["devolvedor", "rede", "erro-nao-forcado"],
    ["devolvedor", "fundo", "erro-forcado"],
    ["devolvedor", "fundo", "erro-nao-forcado"],
    ["devolvedor", "fundo", "winner"],
    ["devolvedor", "passada", "winner"],
    ["devolvedor", "devolucao", "winner"],
  ] as const)('"slice" sempre retorna [drop,lob] em %s|%s|%s', (v, s, t) => {
    expect(sorted(getValidGolpeEsp(v, s, t, "slice"))).toEqual(
      sorted(["drop", "lob"]),
    );
  });

  it("topspin em rede|erro não altera regra contextual (bate-pronto,drop,lob)", () => {
    expect(
      sorted(getValidGolpeEsp("sacador", "rede", "erro-forcado", "topspin")),
    ).toEqual(sorted(NO_SW_ESP));
  });

  it("flat em passada|winner retorna todos 4", () => {
    expect(
      sorted(getValidGolpeEsp("devolvedor", "passada", "winner", "flat")),
    ).toEqual(sorted(ALL4_ESP));
  });

  it("topspin em devolvedor|fundo|erro retorna todos 4", () => {
    expect(
      sorted(
        getValidGolpeEsp("devolvedor", "fundo", "erro-forcado", "topspin"),
      ),
    ).toEqual(sorted(ALL4_ESP));
  });
});
