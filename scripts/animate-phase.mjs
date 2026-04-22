#!/usr/bin/env node
/**
 * animate-phase.mjs — Fase 3: /animate
 * 1. Remover transition: all → propriedades específicas
 * 2. Normalizar easing curves (Emil Kowalski)
 * 3. Adicionar prefers-reduced-motion guards
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../frontend/src");

// Transição cleanup
const transitionCleanups = [
  // transition: all → específicas
  {
    old: /transition:\s*all\s+(?:0\.15s|150ms)(?:\s+[\w\-(),.]+)?;/g,
    new: "transition: background-color var(--transition-fast) var(--ease-in-out), border-color var(--transition-fast) var(--ease-in-out), color var(--transition-fast) var(--ease-in-out), transform var(--transition-fast) var(--ease-in-out);",
  },
  {
    old: /transition:\s*all\s+(?:0\.2s|200ms)(?:\s+[\w\-(),.]+)?;/g,
    new: "transition: background-color var(--transition-normal) var(--ease-in-out), border-color var(--transition-normal) var(--ease-in-out), color var(--transition-normal) var(--ease-in-out), transform var(--transition-normal) var(--ease-in-out);",
  },
  {
    old: /transition:\s*all\s+(?:0\.3s|300ms)(?:\s+[\w\-(),.]+)?;/g,
    new: "transition: background-color var(--transition-slow) var(--ease-in-out), border-color var(--transition-slow) var(--ease-in-out), color var(--transition-slow) var(--ease-in-out), transform var(--transition-slow) var(--ease-in-out);",
  },
];

function walkDir(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (
      stat.isDirectory() &&
      !item.startsWith(".") &&
      item !== "node_modules"
    ) {
      files.push(...walkDir(fullPath));
    } else if (stat.isFile() && item.endsWith(".css")) {
      files.push(fullPath);
    }
  }

  return files;
}

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let changes = 0;
  const original = content;

  // Aplicar limpeza de transições
  for (const { old, new: newValue } of transitionCleanups) {
    const newContent = content.replace(old, newValue);
    if (newContent !== content) {
      changes += (content.match(old) || []).length;
      content = newContent;
    }
  }

  // Adicionar prefers-reduced-motion se houver @keyframes ou transition
  if (
    /@keyframes|animation:|transition:/.test(content) &&
    !/@media\s*\(\s*prefers-reduced-motion/.test(content)
  ) {
    // Encontrar se há animação/transição
    const hasAnimation = /@keyframes|animation:|transition:/.test(content);

    if (hasAnimation && !content.includes("@media (prefers-reduced-motion")) {
      // Adicionar guard no final do arquivo
      const guard = `\n/* ── Accessibility: Respect motion preferences ────────────── */\n@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n  }\n}\n`;

      content += guard;
      changes++;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    return changes;
  }

  return 0;
}

// Main
console.log("🎬 Animate Phase — Fase 3: Motion Refinement\n");

const cssFiles = walkDir(srcDir);
console.log(`📄 Encontrados ${cssFiles.length} arquivos CSS\n`);

let totalChanges = 0;
const results = [];

for (const file of cssFiles) {
  const changes = updateFile(file);
  if (changes > 0) {
    results.push({ file: path.relative(srcDir, file), changes });
    totalChanges += changes;
  }
}

console.log(`✅ ${results.length} arquivos modificados:`);
for (const { file, changes } of results.slice(0, 10)) {
  console.log(`  • ${file} (+${changes} melhorias)`);
}
if (results.length > 10) {
  console.log(`  ... e mais ${results.length - 10} arquivos`);
}

console.log(
  `\n📊 Total: ${totalChanges} melhorias de acessibilidade aplicadas`,
);
console.log("\n✨ Fase 3 concluída. Próximo: Fase 4 (Polish)");
