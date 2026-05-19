const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  try {
    // Verifica se o usuário já existe
    const existing = await prisma.user.findUnique({
      where: { email: 'play@email.com' },
    });

    if (existing) {
      console.log('✅ Usuário play@email.com já existe');
      return;
    }

    // Cria o hash da senha
    const hashedPassword = await hashPassword('123');

    // Cria novo usuário
    const user = await prisma.user.create({
      data: {
        email: 'play@email.com',
        name: 'Player',
        passwordHash: hashedPassword,
        platformRole: 'MEMBER',
        isActive: true,
      },
    });

    console.log('✅ Usuário criado com sucesso:');
    console.log(`Email: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log(`Senha: 123`);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
