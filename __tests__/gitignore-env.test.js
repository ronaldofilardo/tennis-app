// __tests__/gitignore-env.test.js
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Configuração .gitignore para arquivos .env", () => {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  let gitignoreContent;

  beforeAll(() => {
    gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
  });

  describe("Arquivos .env ignorados", () => {
    it("deve ignorar .env", () => {
      expect(gitignoreContent).toContain(".env");
    });

    it("deve ignorar .env.local", () => {
      expect(gitignoreContent).toContain(".env.local");
    });

    it("deve ignorar .env.development.local", () => {
      expect(gitignoreContent).toContain(".env.development.local");
    });

    it("deve ignorar .env.test.local", () => {
      expect(gitignoreContent).toContain(".env.test.local");
    });

    it("deve ignorar .env.production.local", () => {
      expect(gitignoreContent).toContain(".env.production.local");
    });
  });

  describe("Arquivos .env do backend", () => {
    it("deve ignorar backend/.env", () => {
      expect(gitignoreContent).toContain("backend/.env");
    });

    it("deve ignorar backend/.env.local", () => {
      expect(gitignoreContent).toContain("backend/.env.local");
    });

    it("deve ignorar backend/.env.test", () => {
      expect(gitignoreContent).toContain("backend/.env.test");
    });

    it("deve ignorar backend/.env.test.local", () => {
      expect(gitignoreContent).toContain("backend/.env.test.local");
    });
  });

  describe("Exceções no .gitignore", () => {
    it("deve manter .env.example", () => {
      expect(gitignoreContent).toContain("!.env.example");
    });
  });
});
