// Script para sanitizar matriz.json: remove duplicados, ordena por id e salva limpo
import fs from "fs";

const file = "./frontend/src/data/matriz.json";
const raw = fs.readFileSync(file, "utf-8");
let data = JSON.parse(raw);

// Remove duplicados por id
const seen = new Set();
const sanitized = data.filter((item) => {
  if (seen.has(item.id)) return false;
  seen.add(item.id);
  return true;
});

// Ordena por id
sanitized.sort((a, b) => a.id - b.id);

// Salva de volta
fs.writeFileSync(file, JSON.stringify(sanitized, null, 2), "utf-8");

console.log(`Sanitização concluída: ${sanitized.length} itens únicos.`);
