const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

async function main() {
  const svc = await import('../src/services/authService.js');
  try {
    const result = await svc.loginUser({ email: 'play@email.com', password: '123' });
    console.log('LOGIN OK:', JSON.stringify(result.user, null, 2));
  } catch (err) {
    console.error('LOGIN ERROR:', err.message);
  }
}

main().catch((e) => console.error(e));
