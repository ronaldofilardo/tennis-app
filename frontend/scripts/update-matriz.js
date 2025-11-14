// Script para atualizar matriz.json com a coluna 'erro' conforme especificações
import fs from "fs";

const file = "./src/data/matriz.json";
const raw = fs.readFileSync(file, "utf-8");
let data = JSON.parse(raw);

const newData = [];
let id = 1;

for (const item of data) {
  if (item.Resultado === "Winner") {
    newData.push({ ...item, id });
    id++;
  } else {
    // Para erros forçados e não forçados
    const isCentro = item.Direcao === "Centro";
    if (isCentro) {
      newData.push({ ...item, id, erro: "rede" });
      id++;
    } else {
      newData.push({ ...item, id, erro: "rede" });
      id++;
      newData.push({ ...item, id, erro: "fora" });
      id++;
    }
  }
}

// Salva de volta
fs.writeFileSync(file, JSON.stringify(newData, null, 2), "utf-8");

console.log(`Atualização concluída: ${newData.length} itens.`);
