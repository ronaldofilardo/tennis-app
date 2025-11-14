// Script para verificar quais golpes têm direção Centro
import fs from "fs";
import path from "path";

const matrizPath = path.join(
  process.cwd(),
  "frontend",
  "src",
  "data",
  "matriz.json"
);
const matrizData = JSON.parse(fs.readFileSync(matrizPath, "utf8"));

console.log('=== GOLPES COM DIREÇÃO "CENTRO" ===\n');

const itensComCentro = matrizData.filter((item) => item.Direcao === "Centro");

console.log(`Total de itens com direção "Centro": ${itensComCentro.length}\n`);

// Agrupar por golpe
const golpesCentro = {};
itensComCentro.forEach((item) => {
  if (!golpesCentro[item.Golpe]) {
    golpesCentro[item.Golpe] = [];
  }
  golpesCentro[item.Golpe].push({
    resultado: item.Resultado,
    efeito: item.Efeito,
  });
});

Object.keys(golpesCentro).forEach((golpe) => {
  console.log(`${golpe}:`);
  golpesCentro[golpe].forEach((item) => {
    console.log(`  - ${item.resultado} | Efeito: "${item.efeito}"`);
  });
  console.log("");
});
