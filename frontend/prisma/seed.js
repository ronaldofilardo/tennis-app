// frontend/prisma/seed.js
// Script para popular a base de dados com dados iniciais

import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import crypto from "crypto";

const prisma = new PrismaClient();

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * Hash de senha usando scrypt (compatível com authService.js)
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  try {
    // 1. Criar ou buscar admin
    const adminEmail = "ronaldofilardo@gmail.com";
    let admin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!admin) {
      const passwordHash = await hashPassword("5978rdf");
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Ronaldo Filardo",
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✅ Usuário admin criado: ${admin.email} (ID: ${admin.id})`);
    } else {
      console.log(`⚠️  Usuário admin já existe: ${admin.email}`);
    }

    // 2. Criar ou buscar clube padrão
    let defaultClub = await prisma.club.findUnique({
      where: { slug: "clube-teste" },
    });

    if (!defaultClub) {
      defaultClub = await prisma.club.create({
        data: {
          name: "Clube Teste",
          slug: "clube-teste",
          planType: "ENTERPRISE",
        },
      });
      console.log(
        `✅ Clube padrão criado: ${defaultClub.name} (ID: ${defaultClub.id})`,
      );
    } else {
      console.log(`⚠️  Clube padrão já existe: ${defaultClub.name}`);
    }

    // 3. Criar vinculação admin → clube com role ADMIN
    const existingMembership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: admin.id,
          clubId: defaultClub.id,
        },
      },
    });

    if (!existingMembership) {
      const membership = await prisma.clubMembership.create({
        data: {
          userId: admin.id,
          clubId: defaultClub.id,
          role: "ADMIN",
          status: "ACTIVE",
        },
      });
      console.log(
        `✅ Membership criado: ${admin.email} → ${defaultClub.name} (role: ADMIN)`,
      );
    } else {
      console.log(
        `⚠️  Membership já existe: ${admin.email} → ${defaultClub.name}`,
      );
    }

    // 4. Criar ou buscar gestor do clube
    const gestorEmail = "gestor@clubeteste.com";
    let gestor = await prisma.user.findUnique({
      where: { email: gestorEmail },
    });

    if (!gestor) {
      const passwordHash = await hashPassword("gestor123");
      gestor = await prisma.user.create({
        data: {
          email: gestorEmail,
          name: "Gestor Clube Teste",
          passwordHash,
          isActive: true,
        },
      });
      console.log(
        `✅ Usuário gestor criado: ${gestor.email} (ID: ${gestor.id})`,
      );
    } else {
      console.log(`⚠️  Usuário gestor já existe: ${gestor.email}`);
    }

    // 5. Criar vinculação gestor → clube com role GESTOR
    const extistingGestorMembership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: gestor.id,
          clubId: defaultClub.id,
        },
      },
    });

    if (!extistingGestorMembership) {
      const gestorlMembership = await prisma.clubMembership.create({
        data: {
          userId: gestor.id,
          clubId: defaultClub.id,
          role: "GESTOR",
          status: "ACTIVE",
        },
      });
      console.log(
        `✅ Membership criado: ${gestor.email} → ${defaultClub.name} (role: GESTOR)`,
      );
    } else {
      console.log(
        `⚠️  Membership gestor já existe: ${gestor.email} → ${defaultClub.name}`,
      );
    }

    // 6. Criar ou buscar atleta
    const athleteEmail = "play@email.com";
    let athlete = await prisma.user.findUnique({
      where: { email: athleteEmail },
    });

    if (!athlete) {
      const passwordHash = await hashPassword("123");
      athlete = await prisma.user.create({
        data: {
          email: athleteEmail,
          name: "Atleta Play",
          passwordHash,
          isActive: true,
        },
      });
      console.log(
        `✅ Usuário atleta criado: ${athlete.email} (ID: ${athlete.id})`,
      );
    } else {
      console.log(`⚠️  Usuário atleta já existe: ${athlete.email}`);
    }

    // 7. Criar vinculação atleta → clube com role ATHLETE
    const existingAthleteMembership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: athlete.id,
          clubId: defaultClub.id,
        },
      },
    });

    if (!existingAthleteMembership) {
      await prisma.clubMembership.create({
        data: {
          userId: athlete.id,
          clubId: defaultClub.id,
          role: "ATHLETE",
          status: "ACTIVE",
        },
      });
      console.log(
        `✅ Membership criado: ${athlete.email} → ${defaultClub.name} (role: ATHLETE)`,
      );
    } else {
      console.log(
        `⚠️  Membership atleta já existe: ${athlete.email} → ${defaultClub.name}`,
      );
    }

    // 8. Criar AthleteProfile para o atleta
    const existingProfile = await prisma.athleteProfile.findUnique({
      where: { userId: athlete.id },
    });

    if (!existingProfile) {
      await prisma.athleteProfile.create({
        data: {
          userId: athlete.id,
          name: "Atleta Play",
          nickname: "Play",
          category: "ADULTO",
          gender: "MALE",
          isPublic: true,
          clubId: defaultClub.id,
        },
      });
      console.log(`✅ AthleteProfile criado para ${athlete.email}`);
    } else {
      console.log(`⚠️  AthleteProfile já existe para ${athlete.email}`);
    }

    console.log("\n✨ Seed concluído com sucesso!");
    console.log(`\n📋 Dados criados/verificados:`);
    console.log(`   • Admin: ${admin.email} / 5978rdf`);
    console.log(`   • Gestor: ${gestor.email} / gestor123`);
    console.log(`   • Atleta: ${athlete.email} / 123`);
    console.log(`   • Clube: ${defaultClub.name}`);
    console.log(
      `   • CPF (nota): 87545772920 (armazenar em AthleteProfile se necessário)`,
    );
  } catch (error) {
    console.error("❌ Erro durante seed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
