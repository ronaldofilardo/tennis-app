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
  console.log('🔑 Updating password for play@email.com to: 123\n');

  const hash = await hashPassword('123');
  console.log('Generated hash:', hash);

  const updated = await prisma.user.update({
    where: { email: 'play@email.com' },
    data: { passwordHash: hash },
    select: { id: true, email: true, isActive: true },
  });

  console.log('\n✅ User updated:', updated);
  console.log('\n📝 You can now login with:');
  console.log('   Email: play@email.com');
  console.log('   Password: 123');

  await prisma.$disconnect();
}

main().catch(console.error);
