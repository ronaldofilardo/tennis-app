// tests/validationSchemas.test.ts
// Testes unitários para validationSchemas.js
// Cobre a função emailOrCpf() e os schemas MatchCreateSchema / VisibleMatchesQuerySchema

import { describe, it, expect } from "vitest";

// Importa diretamente do módulo JS (sem transpile)
// Usa dynamic import para isolar do ambiente de testes
let MatchCreateSchema: any;
let VisibleMatchesQuerySchema: any;
let emailOrCpfValidator: (val: string) => boolean;

// Bootstrap síncrono via require (CJS)
// O vitest resolve .js com transformação
import * as schemas from "../src/services/validationSchemas.js";

// ── Helpers ──────────────────────────────────────────────────────────────
const basePayload = {
  sportType: "Tênis",
  format: "BEST_OF_3",
  players: { p1: "Jogador 1", p2: "Jogador 2" },
};

function parseEmailOrCpf(val: string): { success: boolean; error?: string } {
  const result = (schemas as any).MatchCreateSchema.safeParse({
    ...basePayload,
    apontadorEmail: val,
  });
  if (result.success) return { success: true };
  const apontadorError = result.error?.issues?.find((i: any) =>
    i.path.includes("apontadorEmail"),
  );
  // Se o erro não é de apontadorEmail, o schema rejeitou por outra razão
  if (!apontadorError) return { success: false, error: "schema error" };
  return { success: false, error: apontadorError?.message };
}

// ── Testes emailOrCpf ─────────────────────────────────────────────────────

describe("validationSchemas — emailOrCpf()", () => {
  it("aceita um email válido", () => {
    expect(parseEmailOrCpf("jogador@clube.com.br").success).toBe(true);
  });

  it("aceita um CPF com exatamente 11 dígitos", () => {
    expect(parseEmailOrCpf("73077585049").success).toBe(true);
  });

  it("aceita outro CPF válido com 11 dígitos", () => {
    expect(parseEmailOrCpf("97593515010").success).toBe(true);
  });

  it("rejeita CPF com menos de 11 dígitos", () => {
    const r = parseEmailOrCpf("1234567890");
    expect(r.success).toBe(false);
  });

  it("rejeita CPF com mais de 11 dígitos", () => {
    const r = parseEmailOrCpf("123456789012");
    expect(r.success).toBe(false);
  });

  it("rejeita string vazia", () => {
    const r = parseEmailOrCpf("");
    expect(r.success).toBe(false);
  });

  it("rejeita email malformado (sem @)", () => {
    const r = parseEmailOrCpf("notanemail");
    expect(r.success).toBe(false);
  });

  it("rejeita email malformado (sem domínio)", () => {
    const r = parseEmailOrCpf("user@");
    expect(r.success).toBe(false);
  });
});

// ── Testes MatchCreateSchema ──────────────────────────────────────────────

describe("validationSchemas — MatchCreateSchema completo", () => {
  it("aceita payload válido com email", () => {
    const r = (schemas as any).MatchCreateSchema.safeParse({
      ...basePayload,
      apontadorEmail: "ref@clube.com",
    });
    expect(r.success).toBe(true);
  });

  it("aceita payload válido com CPF como apontadorEmail", () => {
    const r = (schemas as any).MatchCreateSchema.safeParse({
      ...basePayload,
      apontadorEmail: "12345678901",
    });
    expect(r.success).toBe(true);
  });

  it("aceita payload sem apontadorEmail (campo opcional)", () => {
    const r = (schemas as any).MatchCreateSchema.safeParse(basePayload);
    expect(r.success).toBe(true);
  });

  it("rejeita quando apontadorEmail é string inválida", () => {
    const r = (schemas as any).MatchCreateSchema.safeParse({
      ...basePayload,
      apontadorEmail: "nao-e-cpf-nem-email",
    });
    expect(r.success).toBe(false);
  });
});
