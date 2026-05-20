// frontend/api/_lib/validationUtils.ts
// Validadores compartilhados para dados de entrada

/**
 * Valida CPF com cálculo de dígitos verificadores
 *
 * @param cpf - CPF apenas com dígitos (11 caracteres)
 * @returns true se CPF válido (formato + dígitos verificadores)
 */
export function isValidCPF(cpf: string | null | undefined): boolean {
  if (!cpf) return false;

  // Remove caracteres não-dígitos
  const cleanCpf = cpf.replace(/\D/g, '').trim();

  // Deve ter exatamente 11 dígitos
  if (cleanCpf.length !== 11) return false;

  // Rejeita CPFs conhecidos como inválidos (todos os dígitos iguais)
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf[i], 10) * (10 - i);
  }
  let firstVerifier = 11 - (sum % 11);
  firstVerifier = firstVerifier >= 10 ? 0 : firstVerifier;

  if (parseInt(cleanCpf[9], 10) !== firstVerifier) return false;

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf[i], 10) * (11 - i);
  }
  let secondVerifier = 11 - (sum % 11);
  secondVerifier = secondVerifier >= 10 ? 0 : secondVerifier;

  return parseInt(cleanCpf[10], 10) === secondVerifier;
}

/**
 * Limpa e valida CPF
 *
 * @param cpf - CPF com ou sem formatação
 * @returns CPF limpo (apenas dígitos) se válido, null caso contrário
 */
export function cleanAndValidateCPF(cpf: string | null | undefined): string | null {
  if (!cpf) return null;

  const cleaned = cpf.replace(/\D/g, '').trim();

  if (isValidCPF(cleaned)) {
    return cleaned;
  }

  return null;
}
