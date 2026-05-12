#!/usr/bin/env node
/**
 * colorize-all.mjs — Automatiza substituição de cores hardcoded por tokens CSS
 * Fase 1: /colorize — Unificar toda a paleta de cores
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../frontend/src");

// Mapeamento de cores hardcoded → tokens
const colorMappings = [
  // Overlays e backgrounds translúcidos
  {
    old: /rgba\(\s*0,\s*0,\s*0,\s*0\.82\s*\)/g,
    new: "var(--clr-overlay-dark)",
  },
  {
    old: /rgba\(\s*255,\s*255,\s*255,\s*0\.06\s*\)/g,
    new: "var(--clr-surface-light)",
  },
  {
    old: /rgba\(\s*255,\s*255,\s*255,\s*0\.04\s*\)/g,
    new: "var(--clr-surface-lighter)",
  },

  // Borders
  {
    old: /rgba\(\s*255,\s*255,\s*255,\s*0\.12\s*\)/g,
    new: "var(--clr-border-light)",
  },
  {
    old: /rgba\(\s*255,\s*255,\s*255,\s*0\.1\s*\)/g,
    new: "var(--clr-border-light)",
  },
  {
    old: /rgba\(\s*255,\s*255,\s*255,\s*0\.08\s*\)/g,
    new: "var(--clr-border-light)",
  },
  {
    old: /rgba\(\s*255,\s*255,\s*255,\s*0\.07\s*\)/g,
    new: "var(--clr-border)",
  },
  {
    old: /rgba\(\s*255,\s*255,\s*255,\s*0\.05\s*\)/g,
    new: "var(--clr-border-lighter)",
  },
  {
    old: /rgba\(\s*255,\s*255,\s*255,\s*0\.25\s*\)/g,
    new: "var(--clr-border)",
  },

  // Yellow/Gold accent
  {
    old: /rgba\(\s*234,\s*179,\s*8,\s*0\.4\s*\)/g,
    new: "var(--clr-yellow-hover)",
  },
  {
    old: /rgba\(\s*234,\s*179,\s*8,\s*0\.12\s*\)/g,
    new: "var(--clr-yellow-light)",
  },
  {
    old: /rgba\(\s*234,\s*179,\s*8,\s*0\.06\s*\)/g,
    new: "var(--clr-yellow-faint)",
  },
  { old: /var\(--accent-gold,\s*#eab308\)/g, new: "var(--clr-yellow)" },

  // Error colors
  { old: /#ef4444/g, new: "var(--clr-error)" },

  // Easing & animation
  { old: /ease-out/g, new: "var(--ease-out)" },
  { old: /ease-in-out/g, new: "var(--ease-in-out)" },
  {
    old: /cubic-bezier\(\s*0\.4,\s*0,\s*0\.2,\s*1\s*\)/g,
    new: "var(--ease-in-out)",
  },
];

// Transition cleanup
const transitionCleanups = [
  {
    old: /transition:\s*all\s*0\.15s/g,
    new: "transition: all var(--transition-fast)",
  },
  {
    old: /transition:\s*all\s*0\.2s/g,
    new: "transition: all var(--transition-normal)",
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

function colorizeFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let changes = 0;
  const original = content;

  // Aplicar mapeamentos de cor
  for (const { old, new: newValue } of colorMappings) {
    const newContent = content.replace(old, newValue);
    if (newContent !== content) {
      changes += (content.match(old) || []).length;
      content = newContent;
    }
  }

  // Aplicar limpeza de transições
  for (const { old, new: newValue } of transitionCleanups) {
    const newContent = content.replace(old, newValue);
    if (newContent !== content) {
      changes += (content.match(old) || []).length;
      content = newContent;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    return changes;
  }

  return 0;
}

// Main
console.log("🎨 Colorize All — Aplicando tokens CSS em massa...\n");

const cssFiles = walkDir(srcDir);
console.log(`📄 Encontrados ${cssFiles.length} arquivos CSS\n`);

let totalChanges = 0;
const results = [];

for (const file of cssFiles) {
  const changes = colorizeFile(file);
  if (changes > 0) {
    results.push({ file: path.relative(srcDir, file), changes });
    totalChanges += changes;
  }
}

console.log(`✅ ${results.length} arquivos modificados:`);
for (const { file, changes } of results) {
  console.log(`  • ${file} (+${changes} substituições)`);
}

console.log(`\n📊 Total: ${totalChanges} substituições aplicadas`);
console.log(
  "\n🔍 Próximo passo: execute 'node scripts/audit-ux.mjs' para validar redução",
);
