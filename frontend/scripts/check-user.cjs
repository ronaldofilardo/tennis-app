// Script: buscar usuário e resetar senha
const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.development"),
});

const prisma = new PrismaClient();

async function run() {
  // Buscar por CPF
  const users = await prisma.user.findMany({
    where: { email: { contains: "73077" } },
    select: { id: true, email: true, name: true },
  });
  console.log("Usuários com 73077 no email:", JSON.stringify(users, null, 2));

  if (users.length === 0) {
    // listar todos os users para ver o que existe
    const all = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
      take: 20,
    });
    console.log("Todos os usuários:", JSON.stringify(all, null, 2));
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
