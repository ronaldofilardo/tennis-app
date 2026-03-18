// Script temporário para resetar senha do atleta para o formato DDMMYYYY
const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.development"),
});

const prisma = new PrismaClient();

async function resetPassword() {
  const { hashPassword } = await import("../src/services/authService.js");

  // CPF do atleta = identificador de login
  const cpfLogin = "73077585049";
  const user = await prisma.user.findUnique({ where: { email: cpfLogin } });
  if (!user) {
    console.log("Usuário não encontrado com CPF", cpfLogin);
    return;
  }
  console.log("Usuário encontrado:", user.name, "| login:", user.email);

  // Nova senha: 24101974 (data 24/10/1974 no formato DDMMYYYY)
  const novaSenha = "24101974";
  const passwordHash = await hashPassword(novaSenha);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  console.log("Senha atualizada para:", novaSenha);
}

resetPassword()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
