// frontend/src/types/athlete.ts
// === AREA 1: Modelagem de Dados — Preparação para Multi-tenancy ===
// Desacoplamento de identidade: Player deixa de ser apenas string (nome)
// e passa a ser um objeto com id, name, clubId.

/**
 * Representa um atleta/jogador no sistema.
 * Preparado para busca centralizada e perfis únicos.
 *
 * Hoje: id é gerado no frontend, clubId é opcional.
 * Futuro (White Label): id vem do backend centralizado,
 * clubId identifica o clube/tenant do atleta.
 */
export interface Athlete {
  id: string;
  name: string;
  email?: string;
  clubId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Estado normalizado de atletas para o store.
 * Em vez de aninhar dados dentro da partida,
 * atletas são entidades separadas referenciadas por ID.
 */
export interface AthletesState {
  byId: Record<string, Athlete>;
  allIds: string[];
}

/**
 * Referência a um atleta dentro de uma partida.
 * A partida armazena apenas os IDs; os dados completos vêm do store de atletas.
 */
export interface MatchPlayers {
  p1: {
    athleteId: string;
    /** Nome de exibição (cache para evitar lookup constante) */
    displayName: string;
  };
  p2: {
    athleteId: string;
    displayName: string;
  };
}

// === Funções utilitárias ===

let nextGeneratedId = 0;

/**
 * Gera um ID temporário para atletas criados localmente.
 * Futuro: será substituído pelo ID do backend centralizado.
 */
export function generateLocalAthleteId(): string {
  nextGeneratedId++;
  return `local_${Date.now()}_${nextGeneratedId}`;
}

/**
 * Cria um Athlete a partir de um nome simples (migração gradual).
 * Permite que código legado que usa strings continue funcionando.
 */
export function createAthleteFromName(name: string, email?: string): Athlete {
  return {
    id: generateLocalAthleteId(),
    name,
    email,
    clubId: undefined,
    metadata: {},
    tags: [],
  };
}

/**
 * Cria um AthletesState inicial a partir de dois nomes de jogadores.
 * Ponte entre o formato antigo { p1: string, p2: string } e o novo modelo.
 */
export function createAthletesStateFromNames(
  p1Name: string,
  p2Name: string,
  p1Email?: string,
  p2Email?: string,
): { athletesState: AthletesState; matchPlayers: MatchPlayers } {
  const p1 = createAthleteFromName(p1Name, p1Email);
  const p2 = createAthleteFromName(p2Name, p2Email);

  return {
    athletesState: {
      byId: {
        [p1.id]: p1,
        [p2.id]: p2,
      },
      allIds: [p1.id, p2.id],
    },
    matchPlayers: {
      p1: { athleteId: p1.id, displayName: p1.name },
      p2: { athleteId: p2.id, displayName: p2.name },
    },
  };
}

/**
 * Converte MatchPlayers de volta para o formato legado { p1: string, p2: string }.
 * Usado para compatibilidade com APIs e componentes que ainda usam o formato antigo.
 */
export function matchPlayersToLegacy(players: MatchPlayers): {
  p1: string;
  p2: string;
} {
  return {
    p1: players.p1.displayName,
    p2: players.p2.displayName,
  };
}

/**
 * Converte o formato legado { p1: string, p2: string } para MatchPlayers.
 */
export function legacyToMatchPlayers(legacy: {
  p1: string;
  p2: string;
}): MatchPlayers {
  return {
    p1: { athleteId: generateLocalAthleteId(), displayName: legacy.p1 },
    p2: { athleteId: generateLocalAthleteId(), displayName: legacy.p2 },
  };
}

/**
 * Busca um atleta pelo ID no estado normalizado.
 */
export function getAthleteById(
  state: AthletesState,
  id: string,
): Athlete | undefined {
  return state.byId[id];
}

/**
 * Adiciona ou atualiza um atleta no estado normalizado.
 * Retorna um novo estado (imutável).
 */
export function upsertAthlete(
  state: AthletesState,
  athlete: Athlete,
): AthletesState {
  const isNew = !state.byId[athlete.id];
  return {
    byId: {
      ...state.byId,
      [athlete.id]: athlete,
    },
    allIds: isNew ? [...state.allIds, athlete.id] : state.allIds,
  };
}
