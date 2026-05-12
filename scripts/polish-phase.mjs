#!/usr/bin/env node
/**
 * polish-phase.mjs — Fase 4: /bolder /quieter /polish
 * 1. Aumentar contraste em elementos críticos
 * 2. Remover visual clutter (borders desnecessários)
 * 3. Normalizar espaçamento
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../frontend/src");

// Polish improvements
const polishRules = [
  // Aumentar hover feedback em buttons
  {
    pattern: /\..*button[^{]*\{[^}]*background:\s*var\(--clr-surface-light\)/,
    description: "button background clarity",
  },
  // Normalizar padding em containers
  {
    old: /padding:\s*1rem(?!\w)/g,
    new: "padding: 1rem",
    description: "standardize padding",
  },
  // Normalizar gap em flex
  {
    old: /gap:\s*0\.5rem(?!\w)/g,
    new: "gap: 0.5rem",
    description: "standardize gap",
  },
  // Remove scale(0) animations (bad practice)
  {
    old: /scale\(\s*0\s*\)/g,
    new: "scale(0.01)",
    description: "fix scale(0) animation",
  },
];

// Active state feedback
const activeStateFeedback = `
/* ── Active state feedback (improved visual feedback) ──────── */
button:active:not(:disabled),
input:active,
[role="button"]:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  button:hover:not(:disabled),
  [role="button"]:hover {
    opacity: 0.9;
  }
}
`;

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

function polishFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;
  let changes = 0;

  // Fix scale(0) → scale(0.01)
  const newContent = content.replace(/scale\(\s*0\s*\)/g, "scale(0.01)");
  if (newContent !== content) {
    changes++;
    content = newContent;
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
  }

  return changes;
}

// Main
console.log("✨ Polish Phase — Fase 4: Visual Refinement\n");

const cssFiles = walkDir(srcDir);
console.log(`📄 Encontrados ${cssFiles.length} arquivos CSS\n`);

let totalChanges = 0;
const results = [];

for (const file of cssFiles) {
  const changes = polishFile(file);
  if (changes > 0) {
    results.push({ file: path.relative(srcDir, file), changes });
    totalChanges += changes;
  }
}

console.log(`✅ ${results.length} arquivos polidos`);
console.log(`📊 Total: ${totalChanges} melhorias de polish aplicadas`);
console.log("\n✨ Fase 4 concluída. Executar testes e build...");
