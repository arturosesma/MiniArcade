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
  findByUsername: (username: string) =>
    request<User>(`/users/username/${encodeURIComponent(username)}`),
  getOrCreate: async (username: string): Promise<User> => {
    try {
      return await usersApi.findByUsername(username);
    } catch {
      return await usersApi.create(username, `${username}@games.local`);
    }
  },
};

export interface ConnectFourSession {
  id: string;
  board: (string | null)[];
  currentPlayer: 'R' | 'Y';
  winner: string | null;
  winningCells: number[];
  isDraw: boolean;
}

export const connectFourApi = {
  createGame: () => request<ConnectFourSession>('/connect-four/games', { method: 'POST' }),
  dropPiece: (id: string, column: number, player: 'R' | 'Y') =>
    request<ConnectFourSession>(`/connect-four/games/${id}/drop`, {
      method: 'POST',
      body: JSON.stringify({ column, player }),
    }),
  saveResult: (id: string, userId: number, result: 'win' | 'loss' | 'draw', boardState: (string | null)[]) =>
    request<void>(`/connect-four/games/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ userId, result, boardState }),
    }),
};

export interface HangmanGame {
  id: string;
  maskedWord: string[];
  guessedLetters: string[];
  wrongGuesses: string[];
  wrongCount: number;
  maxWrong: number;
  status: 'playing' | 'won' | 'lost';
  word?: string;
}

export const hangmanApi = {
  createGame: () => request<HangmanGame>('/hangman/games', { method: 'POST' }),
  makeGuess: (id: string, letter: string) =>
    request<HangmanGame>(`/hangman/games/${id}/guess`, {
      method: 'POST',
      body: JSON.stringify({ letter }),
    }),
  saveResult: (id: string, userId: number, result: 'win' | 'loss' | 'draw', boardState: (string | null)[]) =>
    request<void>(`/hangman/games/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ userId, result, boardState }),
    }),
};

export const scoresApi = {
  getByGame: (gameId: number) => request<unknown[]>(`/scores/game/${gameId}`),
  getByUser: (userId: number) => request<unknown[]>(`/scores/user/${userId}`),
};
