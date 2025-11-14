// Script para deduplicar matriz.json mantendo apenas a primeira ocorrência de cada combinação Resultado+Golpe+Efeito+Direcao
const fs = require("fs");
const path = require("path");

const matrizPath = path.join(__dirname, "matriz.json");
const matriz = JSON.parse(fs.readFileSync(matrizPath, "utf-8"));

const seen = new Set();
const deduped = [];

for (const item of matriz) {
  const key = `${item.Resultado}|${item.Golpe}|${item.Efeito}|${item.Direcao}`;
  if (!seen.has(key)) {
    seen.add(key);
    deduped.push(item);
  }
}

fs.writeFileSync(matrizPath, JSON.stringify(deduped, null, 2));
console.log(
  `Removidos ${matriz.length - deduped.length} duplicados. Total final: ${
    deduped.length
  }`
);
