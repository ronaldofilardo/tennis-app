const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

const p = new PrismaClient();
p.user
  .findUnique({
    where: { email: 'play@email.com' },
    select: { id: true, email: true, isActive: true, passwordHash: true },
  })
  .then((u) => {
    if (!u) {
      console.log('USER NOT FOUND');
    } else {
      console.log('id:', u.id);
      console.log('email:', u.email);
      console.log('isActive:', u.isActive);
      const hash = u.passwordHash || '';
      const parts = hash.split(':');
      console.log(
        'hash format:',
        parts.length === 2 ? 'salt:hash (scrypt OK)' : 'UNKNOWN (' + parts.length + ' parts)',
      );
      console.log('hash prefix (20):', hash.substring(0, 20) + '...');
    }
    return p.$disconnect();
  })
  .catch((e) => {
    console.error('ERROR:', e.message);
    return p.$disconnect();
  });
