import { describe, it, expect } from "vitest";
import { VisibleMatchesQuerySchema } from "./validationSchemas.js";

describe("VisibleMatchesQuerySchema", () => {
  it("aceita email válido e role opcional", () => {
    const data = { email: "user@email.com", role: "player" };
    const result = VisibleMatchesQuerySchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.email).toBe("user@email.com");
    expect(result.data.role).toBe("player");
  });

  it("aceita apenas email", () => {
    const data = { email: "user@email.com" };
    const result = VisibleMatchesQuerySchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.email).toBe("user@email.com");
    expect(result.data.role).toBeUndefined();
  });

  it("aceita apenas role", () => {
    const data = { role: "admin" };
    const result = VisibleMatchesQuerySchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.role).toBe("admin");
    expect(result.data.email).toBeUndefined();
  });

  it("rejeita email inválido", () => {
    const result = VisibleMatchesQuerySchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita chaves não reconhecidas", () => {
    const result = VisibleMatchesQuerySchema.safeParse({
      email: "user@email.com",
      foo: "bar",
    });
    expect(result.success).toBe(false);
  });
});
