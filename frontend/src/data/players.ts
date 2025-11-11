// Mock de 4 jogadores (id, email, displayName, senha curta)
export interface PlayerMock {
  id: string;
  email: string;
  name: string;
  password: string;
}

export const MOCK_PLAYERS: PlayerMock[] = [
  { id: 'play1', email: 'play1@email.com', name: 'Play 1', password: '123' },
  { id: 'play2', email: 'play2@email.com', name: 'Play 2', password: '123' },
  { id: 'play3', email: 'play3@email.com', name: 'Play 3', password: '123' },
  { id: 'play4', email: 'play4@email.com', name: 'Play 4', password: '123' },
];

export default MOCK_PLAYERS;
