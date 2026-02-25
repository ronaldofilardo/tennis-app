// Mock de 4 jogadores (id, email, displayName, senha curta)
export interface PlayerMock {
  id: string;
  email: string;
  name: string;
  password: string;
}

export const MOCK_PLAYERS: PlayerMock[] = [
  { id: "play1", email: "play1@email.com", name: "Play 1", password: "123" },
  { id: "play2", email: "play2@email.com", name: "Play 2", password: "123" },
  { id: "play3", email: "play3@email.com", name: "Play 3", password: "123" },
  { id: "play4", email: "play4@email.com", name: "Play 4", password: "123" },
];

/**
 * Resolve o nome de exibição de um jogador a partir de um id, e-mail ou nome livre.
 * Ordem de resolução:
 *   1. Busca por id (ex: "play1")
 *   2. Busca por email (ex: "play1@email.com")
 *   3. Retorna o valor bruto (já é um nome legível)
 */
export function resolvePlayerName(
  value: string,
  players: PlayerMock[] = MOCK_PLAYERS,
): string {
  if (!value) return value;
  const byId = players.find((p) => p.id === value);
  if (byId) return byId.name;
  const byEmail = players.find((p) => p.email === value);
  if (byEmail) return byEmail.name;
  // Se parece com e-mail, pega a parte antes do @
  if (value.includes("@")) return value.split("@")[0];
  return value;
}

export default MOCK_PLAYERS;
