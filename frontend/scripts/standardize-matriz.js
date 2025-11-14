// Script para padronizar nomenclatura e adicionar entradas faltantes na matriz.json
import fs from "fs";

const file = "./src/data/matriz.json";
const raw = fs.readFileSync(file, "utf-8");
let data = JSON.parse(raw);

// Padronizar nomenclatura
data.forEach((item) => {
  if (item.Direcao === "Inside in") item.Direcao = "Inside In";
  if (item.Direcao === "Inside out") item.Direcao = "Inside Out";
  if (item.erro === "fora") item.erro = "Fora";
  if (item.erro === "rede") item.erro = "Rede";
});

// Adicionar novas entradas para Drop shot - FH
const newEntries = [
  // Winner
  {
    Resultado: "Winner",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Cruzada",
  },
  {
    Resultado: "Winner",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Paralela",
  },
  {
    Resultado: "Winner",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Inside Out",
  },
  {
    Resultado: "Winner",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Inside In",
  },
  // ENF fora
  {
    Resultado: "Erro não Forçado - ENF",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Cruzada",
    erro: "Fora",
  },
  {
    Resultado: "Erro não Forçado - ENF",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Paralela",
    erro: "Fora",
  },
  {
    Resultado: "Erro não Forçado - ENF",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Inside Out",
    erro: "Fora",
  },
  {
    Resultado: "Erro não Forçado - ENF",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Inside In",
    erro: "Fora",
  },
  // ENF rede
  {
    Resultado: "Erro não Forçado - ENF",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Cruzada",
    erro: "Rede",
  },
  {
    Resultado: "Erro não Forçado - ENF",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Paralela",
    erro: "Rede",
  },
  {
    Resultado: "Erro não Forçado - ENF",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Inside Out",
    erro: "Rede",
  },
  {
    Resultado: "Erro não Forçado - ENF",
    Golpe: "Drop shot - FH",
    Efeito: "",
    Direcao: "Inside In",
    erro: "Rede",
  },
];

// Adicionar ids
let maxId = Math.max(...data.map((item) => item.id));
newEntries.forEach((entry, index) => {
  entry.id = maxId + index + 1;
});

// Adicionar ao data
data.push(...newEntries);

// Salva de volta
fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");

console.log(`Padronização e adição concluídas: ${data.length} itens.`);
