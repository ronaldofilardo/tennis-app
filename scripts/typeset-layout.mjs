#!/usr/bin/env node
/**
 * typeset-layout.mjs — Fase 2: /typeset + /layout
 * 1. Converter font-size px → rem/clamp
 * 2. Converter widths/heights fixos → responsive
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../frontend/src");

// Font-size conversions: px → rem (base 16px)
const fontSizeConversions = [
  // Small text
  { old: /font-size:\s*0\.7rem/g, new: "font-size: var(--font-scale-sm)" },
  { old: /font-size:\s*0\.72rem/g, new: "font-size: var(--font-scale-sm)" },
  { old: /font-size:\s*0\.75rem/g, new: "font-size: var(--font-scale-sm)" },

  // Body text
  { old: /font-size:\s*0\.85rem/g, new: "font-size: var(--font-scale-body)" },
  { old: /font-size:\s*0\.875rem/g, new: "font-size: var(--font-scale-body)" },
  { old: /font-size:\s*1rem/g, new: "font-size: var(--font-scale-body)" },

  // Headings
  { old: /font-size:\s*1\.15rem/g, new: "font-size: var(--font-scale-h3)" },
  { old: /font-size:\s*1\.25rem/g, new: "font-size: var(--font-scale-h3)" },
  { old: /font-size:\s*1\.5rem/g, new: "font-size: var(--font-scale-h2)" },
  { old: /font-size:\s*1\.75rem/g, new: "font-size: var(--font-scale-h1)" },
  { old: /font-size:\s*2rem/g, new: "font-size: var(--font-scale-h1)" },
];

// Width conversions: px fixo → clamp
const widthConversions = [
  { old: /width:\s*560px/g, new: "width: clamp(320px, 90vw, 560px)" },
  { old: /max-width:\s*560px/g, new: "max-width: clamp(320px, 90vw, 560px)" },
  { old: /width:\s*520px/g, new: "width: clamp(280px, 85vw, 520px)" },
  { old: /max-width:\s*520px/g, new: "max-width: clamp(280px, 85vw, 520px)" },
  { old: /width:\s*480px/g, new: "width: clamp(260px, 80vw, 480px)" },
  { old: /width:\s*450px/g, new: "width: clamp(240px, 75vw, 450px)" },
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

function updateFile(filePath, conversions) {
  let content = fs.readFileSync(filePath, "utf-8");
  let changes = 0;
  const original = content;

  for (const { old, new: newValue } of conversions) {
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
console.log(
  "🎨 Typeset + Layout — Fase 2: Hierarquia tipográfica + Responsividade\n",
);

const cssFiles = walkDir(srcDir);
console.log(`📄 Encontrados ${cssFiles.length} arquivos CSS\n`);

let totalChanges = 0;
const results = [];

for (const file of cssFiles) {
  let changes = 0;
  changes += updateFile(file, fontSizeConversions);
  changes += updateFile(file, widthConversions);

  if (changes > 0) {
    results.push({ file: path.relative(srcDir, file), changes });
    totalChanges += changes;
  }
}

console.log(`✅ ${results.length} arquivos modificados:`);
for (const { file, changes } of results.slice(0, 10)) {
  console.log(`  • ${file} (+${changes} substituições)`);
}
if (results.length > 10) {
  console.log(`  ... e mais ${results.length - 10} arquivos`);
}

console.log(`\n📊 Total: ${totalChanges} substituições aplicadas`);
console.log("\n✨ Fase 2 concluída. Próximo: Fase 3 (Animate)");
