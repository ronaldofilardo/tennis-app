import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import Dashboard from "../pages/Dashboard";
import { AuthProvider } from "../contexts/AuthContext";
import { MatchesProvider } from "../contexts/MatchesContext";
import { NavigationProvider } from "../contexts/NavigationContext";

// Mock useParams hook
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn().mockReturnValue({ matchId: 'test-match' })
  };
});

// Mock TennisScoring
vi.mock("../core/scoring/TennisScoring", async () => {
  const actual = await vi.importActual("../core/scoring/TennisScoring");
  return {
    ...actual,
    TennisScoring: class MockTennisScoring extends actual.TennisScoring {
      enableSync() {
        this.syncEnabled = true;
        this.matchId = null;
      }
      disableSync() {
        this.syncEnabled = false;
        this.matchId = null;
      }
      syncState() {
        return Promise.resolve(true);
      }
    },
  };
});

// Mock API
vi.mock("../config/api", () => ({
  API_URL: "http://localhost:3000/api",
}));

global.fetch = vi.fn();

beforeEach(() => {
  global.fetch.mockClear();
  global.fetch.mockImplementation((url) => {
    if (url.includes("/matches/visible")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }
    if (url.includes("/matches")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }
    return Promise.reject(new Error(`URL não mockada: ${url}`));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <NavigationProvider>
          <MatchesProvider>{component}</MatchesProvider>
        </NavigationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("Testes de Integração - Básicos", () => {
  it("deve renderizar Dashboard com sucesso", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Minhas Partidas")).toBeInTheDocument();
  });
});
