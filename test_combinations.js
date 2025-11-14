// Script para testar combinações específicas na matriz
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

console.log("=== TESTE DE COMBINAÇÕES ESPECÍFICAS ===\n");

// Testar combinação dos testes que falharam: Erro forçado - EF + Forehand - FH
console.log("1. Erro forçado - EF + Forehand - FH:");
const efComForehand = matrizData.filter(
  (item) =>
    item.Resultado === "Erro forçado - EF" && item.Golpe === "Forehand - FH"
);
console.log("   Itens encontrados:", efComForehand.length);
if (efComForehand.length > 0) {
  const efeitos = [...new Set(efComForehand.map((item) => item.Efeito))];
  console.log("   Efeitos disponíveis:", efeitos);

  // Para cada efeito, ver as direções
  efeitos.forEach((efeito) => {
    const itensComEfeito = efComForehand.filter(
      (item) => item.Efeito === efeito
    );
    const direcoes = [...new Set(itensComEfeito.map((item) => item.Direcao))];
    console.log(`   Efeito "${efeito}" -> Direções: [${direcoes.join(", ")}]`);
  });
}

console.log('\n2. Verificar se "Centro" existe para Forehand em erros:');
const forehandComCentro = matrizData.filter(
  (item) =>
    item.Resultado.includes("Erro") &&
    item.Golpe === "Forehand - FH" &&
    item.Direcao === "Centro"
);
console.log("   Itens com Centro:", forehandComCentro.length);
if (forehandComCentro.length > 0) {
  forehandComCentro.forEach((item) => {
    console.log(`   - ${item.Resultado} | ${item.Efeito} | ${item.Direcao}`);
  });
} else {
  console.log(
    '   RESULTADO: Forehand NÃO tem direção "Centro" para erros na matriz'
  );
}

console.log("\n3. Verificar quais direções o Forehand TEM para erros:");
const forehandErros = matrizData.filter(
  (item) => item.Resultado.includes("Erro") && item.Golpe === "Forehand - FH"
);
const direcoesForehands = [
  ...new Set(forehandErros.map((item) => item.Direcao)),
];
console.log(
  "   Direções disponíveis para Forehand em erros:",
  direcoesForehands
);

console.log("\n4. Verificar combinação Winner + Forehand - FH:");
const winnerForehand = matrizData.filter(
  (item) => item.Resultado === "Winner" && item.Golpe === "Forehand - FH"
);
console.log("   Itens Winner+Forehand:", winnerForehand.length);
if (winnerForehand.length > 0) {
  const efeitosWinner = [...new Set(winnerForehand.map((item) => item.Efeito))];
  const direcoesWinner = [
    ...new Set(winnerForehand.map((item) => item.Direcao)),
  ];
  console.log("   Efeitos:", efeitosWinner);
  console.log("   Direções:", direcoesWinner);
}
