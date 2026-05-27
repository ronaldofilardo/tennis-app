// frontend/src/utils/codeGenerator.js - JavaScript port for Node.js serverless

export function generatePublicMatchCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = letters.charAt(Math.floor(Math.random() * 26));
  const length = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
