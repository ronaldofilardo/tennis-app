// tests/AthleteSearchInput.test.tsx
// Testes para o componente AthleteSearchInput
// Cobre a nova prop excludeUserId e o comportamento de busca

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Mock httpClient ────────────────────────────────────────────────────────
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("../src/config/httpClient", () => ({
  default: {
    get: mockGet,
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setAuthConfig: vi.fn(),
    setTenantConfig: vi.fn(),
    onUnauthorized: vi.fn(),
  },
}));

// ── Mock CSS ──────────────────────────────────────────────────────────────
vi.mock("../src/components/AthleteSearchInput.css", () => ({}));

import AthleteSearchInput from "../src/components/AthleteSearchInput";

// ── Helpers ───────────────────────────────────────────────────────────────
const mockAthletes = [
  { id: "a1", name: "Ana Silva", globalId: "G001" },
  { id: "a2", name: "Bruno Costa", globalId: "G002" },
];

function setupHttpMock(athletes = mockAthletes) {
  mockGet.mockResolvedValue({ data: { athletes } });
}

// ── Testes ────────────────────────────────────────────────────────────────

describe("AthleteSearchInput — busca básica", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHttpMock();
  });

  it("não chama a API para queries com menos de 2 caracteres", async () => {
    render(<AthleteSearchInput onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "A" } });
    // espera um tick de debounce
    await new Promise((r) => setTimeout(r, 350));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("chama a API com o termo de busca correto", async () => {
    render(<AthleteSearchInput onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Ana" },
    });
    await waitFor(() => expect(mockGet).toHaveBeenCalled(), {
      timeout: 1000,
    });
    const url: string = mockGet.mock.calls[0][0];
    expect(url).toContain("q=Ana");
    expect(url).toContain("/athletes");
  });

  it("exibe os resultados retornados pela API", async () => {
    render(<AthleteSearchInput onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Ana" },
    });
    await waitFor(
      () => expect(screen.getByText("Ana Silva")).toBeInTheDocument(),
      {
        timeout: 1000,
      },
    );
  });

  it("chama onSelect ao clicar em um resultado", async () => {
    const onSelect = vi.fn();
    render(<AthleteSearchInput onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Ana" },
    });
    await waitFor(
      () => expect(screen.getByText("Ana Silva")).toBeInTheDocument(),
      {
        timeout: 1000,
      },
    );
    fireEvent.click(screen.getByText("Ana Silva"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1" }),
    );
  });
});

describe("AthleteSearchInput — prop excludeUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHttpMock();
  });

  it("NÃO inclui excludeUserId na URL quando a prop não é fornecida", async () => {
    render(<AthleteSearchInput onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Bruno" },
    });
    await waitFor(() => expect(mockGet).toHaveBeenCalled(), {
      timeout: 1000,
    });
    const url: string = mockGet.mock.calls[0][0];
    expect(url).not.toContain("excludeUserId");
  });

  it("inclui excludeUserId na URL quando a prop é fornecida", async () => {
    render(
      <AthleteSearchInput onSelect={vi.fn()} excludeUserId="user-xyz-123" />,
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Bruno" },
    });
    await waitFor(() => expect(mockGet).toHaveBeenCalled(), {
      timeout: 1000,
    });
    const url: string = mockGet.mock.calls[0][0];
    expect(url).toContain("excludeUserId=user-xyz-123");
  });

  it("mantém o encodamento correto para IDs com caracteres especiais", async () => {
    render(
      <AthleteSearchInput onSelect={vi.fn()} excludeUserId="user@id+test" />,
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Ana" },
    });
    await waitFor(() => expect(mockGet).toHaveBeenCalled(), {
      timeout: 1000,
    });
    const url: string = mockGet.mock.calls[0][0];
    // encodeURIComponent("user@id+test") = "user%40id%2Btest"
    expect(url).toContain("excludeUserId=user%40id%2Btest");
  });
});
