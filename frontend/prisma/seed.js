// frontend/prisma/seed.js
// Script para popular a base de dados com dados iniciais

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import crypto from 'crypto';

const prisma = new PrismaClient();

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * Hash de senha usando scrypt (compatível com authService.js)
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  try {
    // Criar atleta único
    const athleteEmail = 'play@email.com';
    let athlete = await prisma.user.findUnique({
      where: { email: athleteEmail },
    });

    if (!athlete) {
      const passwordHash = await hashPassword('123');
      athlete = await prisma.user.create({
        data: {
          email: athleteEmail,
          name: 'Atleta Play',
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✅ Usuário atleta criado: ${athlete.email} (ID: ${athlete.id})`);
    } else {
      console.log(`⚠️  Usuário atleta já existe: ${athlete.email}`);
    }

    // Criar AthleteProfile para o atleta
    const existingProfile = await prisma.athleteProfile.findUnique({
      where: { userId: athlete.id },
    });

    if (!existingProfile) {
      await prisma.athleteProfile.create({
        data: {
          userId: athlete.id,
          name: 'Atleta Play',
          nickname: 'Play',
          category: 'ADULTO',
          gender: 'MALE',
          isPublic: true,
          cpf: '87545772920',
        },
      });
      console.log(`✅ AthleteProfile criado para ${athlete.email}`);
    } else {
      console.log(`⚠️  AthleteProfile já existe para ${athlete.email}`);
    }

    console.log('\n✨ Seed concluído com sucesso!');
    console.log(`\n📋 Usuário criado:`);
    console.log(`   • Atleta: ${athlete.email} / 123 (CPF: 87545772920)`);
  } catch (error) {
    console.error('❌ Erro durante seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
