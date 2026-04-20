/**
 * Gerador de identificadores públicos curtos e legíveis para partidas
 * Facilita compartilhamento entre criador e anotador
 */

/**
 * Gera um código único, curto e legível para partidas
 * Formato: 6-8 caracteres alfanuméricos, sempre começando com letra
 * Exemplos: "TN42KX", "ABCD1234", "XYZ789"
 */
export function generatePublicMatchCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  let code = '';
  // Primeira letra (sempre letra para evitar confusão)
  code += letters.charAt(Math.floor(Math.random() * 26));

  // 5-7 caracteres aleatórios (total 6-8 caracteres)
  const length = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

/**
 * Valida formato de código público
 */
export function isValidPublicMatchCode(code: string): boolean {
  return /^[A-Z][A-Z0-9]{5,7}$/.test(code);
}
