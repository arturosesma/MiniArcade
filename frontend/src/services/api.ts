const BASE = 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export interface TicTacToeSession {
  id: string;
  board: (string | null)[];
  currentPlayer: 'X' | 'O';
  winner: string | null;
  isDraw: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export const ticTacToeApi = {
  createGame: () => request<TicTacToeSession>('/tic-tac-toe/games', { method: 'POST' }),
  makeMove: (id: string, position: number, player: 'X' | 'O') =>
    request<TicTacToeSession>(`/tic-tac-toe/games/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ position, player }),
    }),
  saveResult: (id: string, userId: number, result: 'win' | 'loss' | 'draw', boardState: (string | null)[]) =>
    request<void>(`/tic-tac-toe/games/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ userId, result, boardState }),
    }),
};

export const usersApi = {
  getAll: () => request<User[]>('/users'),
  create: (username: string, email: string) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify({ username, email }) }),
};

export const scoresApi = {
  getByGame: (gameId: number) => request<unknown[]>(`/scores/game/${gameId}`),
  getByUser: (userId: number) => request<unknown[]>(`/scores/user/${userId}`),
};
