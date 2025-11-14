// Script para analisar a matriz e extrair combinações válidas
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

console.log("=== ANÁLISE DA MATRIZ DE DADOS ===\n");

// Extrair todos os valores únicos
const resultados = [...new Set(matrizData.map((item) => item.Resultado))];
const golpes = [...new Set(matrizData.map((item) => item.Golpe))];
const efeitos = [...new Set(matrizData.map((item) => item.Efeito))];
const direcoes = [...new Set(matrizData.map((item) => item.Direcao))];

console.log("RESULTADOS disponíveis:");
resultados.forEach((r) => console.log(`- ${r}`));

console.log("\nGOLPES disponíveis:");
golpes.forEach((g) => console.log(`- ${g}`));

console.log("\nEFEITOS disponíveis:");
efeitos.forEach((e) => console.log(`- "${e}"`));

console.log("\nDIREÇÕES disponíveis:");
direcoes.forEach((d) => console.log(`- ${d}`));

console.log("\n=== COMBINAÇÕES POR GOLPE ===\n");

// Analisar combinações por golpe
golpes.forEach((golpe) => {
  const itensGolpe = matrizData.filter((item) => item.Golpe === golpe);
  const efeitosGolpe = [...new Set(itensGolpe.map((item) => item.Efeito))];
  const direcoesGolpe = [...new Set(itensGolpe.map((item) => item.Direcao))];

  console.log(`${golpe}:`);
  console.log(`  Efeitos: [${efeitosGolpe.map((e) => `"${e}"`).join(", ")}]`);
  console.log(`  Direções: [${direcoesGolpe.join(", ")}]`);
  console.log("");
});

console.log("\n=== PADRÕES IDENTIFICADOS ===\n");

// Identificar padrões específicos
const voleios = golpes.filter((g) => g.includes("Voleio"));
const swingvolleys = golpes.filter((g) => g.includes("Swingvolley"));
const dropShots = golpes.filter((g) => g.includes("Drop shot"));
const dropVolleys = golpes.filter((g) => g.includes("Drop volley"));
const forehands = golpes.filter((g) => g === "Forehand - FH");
const backhands = golpes.filter((g) => g === "Backhand - BH");
const smash = golpes.filter((g) => g === "Smash - SM");

console.log("Voleios (Efeito vazio):");
voleios.forEach((v) => {
  const itensVoleio = matrizData.filter((item) => item.Golpe === v);
  const direcoesVoleio = [...new Set(itensVoleio.map((item) => item.Direcao))];
  console.log(`  ${v}: [${direcoesVoleio.join(", ")}]`);
});

console.log("\nGolpes com Inside In/Out:");
const golpesComInside = golpes.filter((golpe) => {
  const itensGolpe = matrizData.filter((item) => item.Golpe === golpe);
  const direcoesGolpe = [...new Set(itensGolpe.map((item) => item.Direcao))];
  return (
    direcoesGolpe.includes("Inside In") || direcoesGolpe.includes("Inside Out")
  );
});
golpesComInside.forEach((g) => console.log(`  - ${g}`));

console.log("\nGolpes SEM Inside In/Out:");
const golpesSemInside = golpes.filter((golpe) => {
  const itensGolpe = matrizData.filter((item) => item.Golpe === golpe);
  const direcoesGolpe = [...new Set(itensGolpe.map((item) => item.Direcao))];
  return (
    !direcoesGolpe.includes("Inside In") &&
    !direcoesGolpe.includes("Inside Out")
  );
});
golpesSemInside.forEach((g) => console.log(`  - ${g}`));
