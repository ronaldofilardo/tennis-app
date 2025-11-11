#!/usr/bin/env node

/**
 * Script para atualizar mocks de testes conforme mudanças na API
 * Executar após mudanças significativas na API do backend
 */

const fs = require("fs");
const path = require("path");

console.log("🔄 Atualizando mocks de testes...");

// Caminhos dos arquivos de teste
const testFiles = [
  "src/__tests__/integration.test.jsx",
  "src/__tests__/regression.test.jsx",
  "src/contexts/__tests__/MatchesContext.integration.test.tsx",
];

// Função para atualizar estrutura de match mockada
function updateMatchMock(match) {
  const updatedMatch = { ...match };

  // Garantir campos obrigatórios
  if (!updatedMatch.apontadorEmail) {
    updatedMatch.apontadorEmail = "test@test.com";
  }

  if (!updatedMatch.playersEmails) {
    updatedMatch.playersEmails = ["test@test.com"];
  }

  // Atualizar timestamps se necessário
  if (updatedMatch.matchState?.startedAt) {
    // Manter timestamps relativos
  }

  return updatedMatch;
}

// Função para atualizar mocks em arquivo
function updateMocksInFile(filePath) {
  const fullPath = path.join(__dirname, "..", filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return;
  }

  console.log(`📝 Processando: ${filePath}`);

  let content = fs.readFileSync(fullPath, "utf8");
  let updated = false;

  // Procurar por objetos mockBackend.matches
  const matchesRegex = /mockBackend\.matches\s*=\s*\[([\s\S]*?)\]/g;
  const matches = content.match(matchesRegex);

  if (matches) {
    matches.forEach((matchBlock) => {
      try {
        // Extrair array de matches
        const arrayMatch = matchBlock.match(/\[([\s\S]*)\]/);
        if (arrayMatch) {
          const matchesArray = JSON.parse(
            arrayMatch[1].replace(
              /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
              '$1"$2":'
            )
          );
          const updatedMatches = matchesArray.map(updateMatchMock);

          const newMatchBlock = `mockBackend.matches = ${JSON.stringify(
            updatedMatches,
            null,
            2
          )}`;
          content = content.replace(matchBlock, newMatchBlock);
          updated = true;
        }
      } catch (error) {
        console.log(
          `⚠️  Erro ao processar matches em ${filePath}:`,
          error.message
        );
      }
    });
  }

  if (updated) {
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`✅ Atualizado: ${filePath}`);
  } else {
    console.log(`ℹ️  Nenhum update necessário: ${filePath}`);
  }
}

// Executar atualização
testFiles.forEach(updateMocksInFile);

console.log("🎉 Atualização de mocks concluída!");
console.log("\n📋 Recomendações:");
console.log("1. Execute os testes: npm run test:regression");
console.log("2. Verifique se todos os testes passam");
console.log("3. Faça commit das mudanças nos mocks");
console.log("4. Atualize este script conforme novas estruturas de API");
