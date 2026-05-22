import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'play@email.com' },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      isActive: true,
    },
  });

  console.log('User found:', user);

  if (!user) {
    console.log('\n❌ User not found. Creating...');

    const hash = await hashPassword('123');
    console.log('Created hash for password "123":', hash);

    const created = await prisma.user.create({
      data: {
        email: 'play@email.com',
        name: 'Atleta Play',
        passwordHash: hash,
        isActive: true,
      },
      select: { id: true, email: true, isActive: true },
    });

    console.log('User created:', created);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
