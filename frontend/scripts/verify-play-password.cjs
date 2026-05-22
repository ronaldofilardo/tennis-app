const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

const p = new PrismaClient();

async function verifyPassword(password, storedHash) {
  // Match exact authService.js implementation: salt is passed as hex string (not Buffer)
  const [salt, hash] = storedHash.split(':');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex') === hash);
    });
  });
}

p.user
  .findUnique({
    where: { email: 'play@email.com' },
    select: { passwordHash: true },
  })
  .then(async (u) => {
    if (!u) {
      console.log('USER NOT FOUND');
      return;
    }
    const match = await verifyPassword('123', u.passwordHash);
    console.log('Password "123" matches hash:', match);
    return p.$disconnect();
  })
  .catch((e) => {
    console.error('ERROR:', e.message);
    return p.$disconnect();
  });
