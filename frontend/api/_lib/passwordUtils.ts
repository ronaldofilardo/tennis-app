// frontend/api/_lib/passwordUtils.ts
// Utilitários de senha compartilhados entre handlers de auth, clubs e admin.

import { hashPassword, verifyPassword } from '../../src/services/authService.js';

export { hashPassword, verifyPassword };

/**
 * Deriva a senha padrão de um atleta a partir da data de nascimento.
 * Prioridade:
 *   1. birthDate no formato ISO (YYYY-MM-DD) → "DDMMAAAA"
 *   2. birthDate como objeto Date → "DDMMAAAA"
 *   3. cpf fornecido → primeiros 8 dígitos
 *   4. fallback → "12345678"
 */
export function derivarSenha(
  birthDate: string | null | undefined,
  cleanCpf: string | null | undefined,
): string {
  if (birthDate) {
    let dd: string | undefined, mm: string | undefined, yyyy: string | undefined;
    if (typeof birthDate === 'string' && birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = birthDate.split('-');
      dd = String(day).padStart(2, '0');
      mm = String(month).padStart(2, '0');
      yyyy = year;
    } else {
      const d = new Date(birthDate);
      if (!isNaN(d.getTime())) {
        dd = String(d.getUTCDate()).padStart(2, '0');
        mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        yyyy = String(d.getUTCFullYear());
      }
    }
    if (dd && mm && yyyy) {
      return `${dd}${mm}${yyyy}`;
    }
  }
  return cleanCpf ? cleanCpf.substring(0, 8) : '12345678';
}
