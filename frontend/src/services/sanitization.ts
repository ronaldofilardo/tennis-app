// frontend/src/services/sanitization.ts
// === AREA 5: Sanitização de Dados de Entrada ===
// Validação estrita para dados de texto livre (direcao, golpe_esp, etc.)
// Previne SQL Injection, XSS e dados malformados em base centralizada.

/**
 * Remove tags HTML e scripts do texto.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Remove caracteres perigosos para SQL Injection.
 */
export function stripSqlInjection(input: string): string {
  // Remove padrões comuns de SQL injection
  return input
    .replace(/['";\\]/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|ALTER|EXEC|UNION|SELECT)\b/gi, "")
    .trim();
}

/**
 * Sanitiza uma string de entrada geral.
 * Remove HTML, scripts, e limita tamanho.
 */
export function sanitizeText(input: string, maxLength: number = 200): string {
  if (!input || typeof input !== "string") return "";

  let sanitized = stripHtml(input);
  sanitized = stripSqlInjection(sanitized);

  // Limita tamanho
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitiza um nome de jogador.
 * Permite letras, números, espaços, hifens e acentos (unicode).
 */
export function sanitizePlayerName(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove tudo exceto letras (unicode), números, espaços, hifens e pontos
  let sanitized = input.replace(/[^\p{L}\p{N}\s.\-']/gu, "").trim();

  // Limita a 100 caracteres
  if (sanitized.length > 100) {
    sanitized = sanitized.slice(0, 100);
  }

  return sanitized;
}

/**
 * Sanitiza um email.
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove espaços e caracteres não permitidos em emails
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@.\-_+]/g, "");
}

/**
 * Valida e sanitiza valores de enum (tipo seguro).
 * Usado para campos como `direcao`, `golpe`, `efeito` etc.
 * Aceita apenas valores dentro da whitelist.
 */
export function sanitizeEnum<T extends string>(
  input: string,
  allowedValues: readonly T[],
  defaultValue: T,
): T {
  if (!input || typeof input !== "string") return defaultValue;

  const trimmed = input.trim();
  if ((allowedValues as readonly string[]).includes(trimmed)) {
    return trimmed as T;
  }

  return defaultValue;
}

/**
 * Sanitiza dados de RallyDetails.
 * Valida contra os enums permitidos em types.ts.
 */
export function sanitizeRallyDetails(
  details: Record<string, unknown>,
): Record<string, unknown> {
  const ALLOWED_VENCEDOR = ["sacador", "devolvedor"] as const;
  const ALLOWED_SITUACAO = ["passada", "rede", "fundo", "devolucao"] as const;
  const ALLOWED_TIPO = ["winner", "erro-forcado", "erro-nao-forcado"] as const;
  const ALLOWED_SUBTIPO1 = ["PassingShot", "ServeReturn"] as const;
  const ALLOWED_SUBTIPO2 = ["Out", "Net"] as const;
  const ALLOWED_GOLPE = ["BH", "FH", "VBH", "VFH", "Smash"] as const;
  const ALLOWED_EFEITO = ["topspin", "slice", "flat"] as const;
  const ALLOWED_DIRECAO = [
    "cruzada",
    "paralela",
    "centro",
    "inside-in",
    "inside-out",
  ] as const;
  const ALLOWED_GOLPE_ESP = [
    "lob",
    "drop",
    "bate-pronto",
    "swingvolley",
  ] as const;

  return {
    vencedor: sanitizeEnum(
      String(details.vencedor || ""),
      ALLOWED_VENCEDOR,
      "sacador",
    ),
    situacao: sanitizeEnum(
      String(details.situacao || ""),
      ALLOWED_SITUACAO,
      "fundo",
    ),
    tipo: sanitizeEnum(String(details.tipo || ""), ALLOWED_TIPO, "winner"),
    subtipo1: details.subtipo1
      ? sanitizeEnum(String(details.subtipo1), ALLOWED_SUBTIPO1, "PassingShot")
      : undefined,
    subtipo2: details.subtipo2
      ? sanitizeEnum(String(details.subtipo2), ALLOWED_SUBTIPO2, "Out")
      : undefined,
    golpe: sanitizeEnum(String(details.golpe || ""), ALLOWED_GOLPE, "FH"),
    efeito: details.efeito
      ? sanitizeEnum(String(details.efeito), ALLOWED_EFEITO, "flat")
      : undefined,
    direcao: sanitizeEnum(
      String(details.direcao || ""),
      ALLOWED_DIRECAO,
      "cruzada",
    ),
    golpe_esp: details.golpe_esp
      ? sanitizeEnum(String(details.golpe_esp), ALLOWED_GOLPE_ESP, "lob")
      : undefined,
  };
}

/**
 * Sanitiza um objeto inteiro recursivamente.
 * Remove chaves perigosas e sanitiza valores string.
 */
export function sanitizeObject(
  obj: Record<string, unknown>,
  maxDepth: number = 5,
): Record<string, unknown> {
  if (maxDepth <= 0) return {};

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Ignora chaves suspeitas
    const sanitizedKey = key.replace(/[<>"';\\/]/g, "");
    if (sanitizedKey !== key) continue; // Pula chaves alteradas (suspeitas)

    if (typeof value === "string") {
      result[sanitizedKey] = sanitizeText(value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      result[sanitizedKey] = value;
    } else if (Array.isArray(value)) {
      result[sanitizedKey] = value.map((item) => {
        if (typeof item === "string") return sanitizeText(item);
        if (typeof item === "object" && item !== null) {
          return sanitizeObject(item as Record<string, unknown>, maxDepth - 1);
        }
        return item;
      });
    } else if (typeof value === "object" && value !== null) {
      result[sanitizedKey] = sanitizeObject(
        value as Record<string, unknown>,
        maxDepth - 1,
      );
    } else {
      result[sanitizedKey] = value;
    }
  }

  return result;
}

export default {
  sanitizeText,
  sanitizePlayerName,
  sanitizeEmail,
  sanitizeEnum,
  sanitizeRallyDetails,
  sanitizeObject,
  stripHtml,
  stripSqlInjection,
};
