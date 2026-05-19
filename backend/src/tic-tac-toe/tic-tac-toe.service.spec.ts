import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicTacToeService } from './tic-tac-toe.service';
import { GamesService } from '../games/games.service';
import { ScoresService } from '../scores/scores.service';
import { GameHistoryService } from '../game-history/game-history.service';

const mockGamesService = { findByName: jest.fn(), create: jest.fn() };
const mockScoresService = { create: jest.fn() };
const mockGameHistoryService = { create: jest.fn() };

describe('TicTacToeService', () => {
  let service: TicTacToeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicTacToeService,
        { provide: GamesService, useValue: mockGamesService },
        { provide: ScoresService, useValue: mockScoresService },
        { provide: GameHistoryService, useValue: mockGameHistoryService },
      ],
    }).compile();

    service = module.get<TicTacToeService>(TicTacToeService);
    jest.clearAllMocks();
  });

  describe('createGame', () => {
    it('returns a fresh board with 9 empty cells', () => {
      const game = service.createGame();
      expect(game.board).toHaveLength(9);
      expect(game.board.every((c) => c === null)).toBe(true);
    });

    it('starts with player X and no winner', () => {
      const game = service.createGame();
      expect(game.currentPlayer).toBe('X');
      expect(game.winner).toBeNull();
      expect(game.isDraw).toBe(false);
    });

    it('generates a unique id each time', () => {
      const a = service.createGame();
      const b = service.createGame();
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('makeMove', () => {
    it('places a piece and switches the active player', () => {
      const { id } = service.createGame();
      const updated = service.makeMove(id, { position: 4, player: 'X' });
      expect(updated.board[4]).toBe('X');
      expect(updated.currentPlayer).toBe('O');
    });

    it('throws NotFoundException for an unknown session', () => {
      expect(() =>
        service.makeMove('bad-id', { position: 0, player: 'X' }),
      ).toThrow(NotFoundException);
    });

    it('throws when position is already taken', () => {
      const { id } = service.createGame();
      service.makeMove(id, { position: 0, player: 'X' });
      expect(() =>
        service.makeMove(id, { position: 0, player: 'O' }),
      ).toThrow(BadRequestException);
    });

    it('throws when it is not the player turn', () => {
      const { id } = service.createGame();
      expect(() =>
        service.makeMove(id, { position: 0, player: 'O' }),
      ).toThrow(BadRequestException);
    });

    it('throws for a position outside 0-8', () => {
      const { id } = service.createGame();
      expect(() =>
        service.makeMove(id, { position: 9, player: 'X' }),
      ).toThrow(BadRequestException);
    });

    it('detects a horizontal win on the first row', () => {
      const { id } = service.createGame();
      // X: 0,1,2 — O: 3,4
      service.makeMove(id, { position: 0, player: 'X' });
      service.makeMove(id, { position: 3, player: 'O' });
      service.makeMove(id, { position: 1, player: 'X' });
      service.makeMove(id, { position: 4, player: 'O' });
      const result = service.makeMove(id, { position: 2, player: 'X' });
      expect(result.winner).toBe('X');
    });

    it('detects a draw when all cells are filled with no winner', () => {
      const { id } = service.createGame();
      // Board: X O X / O O X / X X O  — no line of three
      const moves: Array<{ position: number; player: 'X' | 'O' }> = [
        { position: 0, player: 'X' },
        { position: 1, player: 'O' },
        { position: 2, player: 'X' },
        { position: 3, player: 'O' },
        { position: 5, player: 'X' },
        { position: 4, player: 'O' },
        { position: 6, player: 'X' },
        { position: 8, player: 'O' },
        { position: 7, player: 'X' },
      ];
      let result = service.createGame(); // placeholder
      for (const move of moves) {
        result = service.makeMove(id, move);
      }
      expect(result.isDraw).toBe(true);
      expect(result.winner).toBeNull();
    });

    it('throws when the game is already over', () => {
      const { id } = service.createGame();
      service.makeMove(id, { position: 0, player: 'X' });
      service.makeMove(id, { position: 3, player: 'O' });
      service.makeMove(id, { position: 1, player: 'X' });
      service.makeMove(id, { position: 4, player: 'O' });
      service.makeMove(id, { position: 2, player: 'X' }); // X wins
      expect(() =>
        service.makeMove(id, { position: 5, player: 'O' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('checkWinner', () => {
    it('detects a vertical win', () => {
      const board = ['X', null, null, 'X', null, null, 'X', null, null];
      expect(service.checkWinner(board)).toBe('X');
    });

    it('detects a main-diagonal win', () => {
      const board = ['O', null, null, null, 'O', null, null, null, 'O'];
      expect(service.checkWinner(board)).toBe('O');
    });

    it('detects an anti-diagonal win', () => {
      const board = [null, null, 'X', null, 'X', null, 'X', null, null];
      expect(service.checkWinner(board)).toBe('X');
    });

    it('returns null when there is no winner', () => {
      expect(service.checkWinner(Array(9).fill(null))).toBeNull();
    });

    it('returns null for a partial board with no winner', () => {
      const board = ['X', 'O', null, null, null, null, null, null, null];
      expect(service.checkWinner(board)).toBeNull();
    });
  });

  describe('saveResult', () => {
    it('creates a game record and a history entry', async () => {
      const { id } = service.createGame();
      const fakeGame = { id: 1, name: 'Tic Tac Toe' };
      mockGamesService.findByName.mockResolvedValue(null);
      mockGamesService.create.mockResolvedValue(fakeGame);
      mockGameHistoryService.create.mockResolvedValue({});
      mockScoresService.create.mockResolvedValue({});

      await service.saveResult(id, {
        userId: 42,
        result: 'win',
        boardState: Array(9).fill(null),
      });

      expect(mockGamesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Tic Tac Toe' }),
      );
      expect(mockGameHistoryService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42, result: 'win' }),
      );
      expect(mockScoresService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42, score: 1 }),
      );
    });

    it('reuses an existing game record when it already exists', async () => {
      const { id } = service.createGame();
      const existingGame = { id: 7, name: 'Tic Tac Toe' };
      mockGamesService.findByName.mockResolvedValue(existingGame);
      mockGameHistoryService.create.mockResolvedValue({});
      mockScoresService.create.mockResolvedValue({});

      await service.saveResult(id, {
        userId: 1,
        result: 'draw',
        boardState: Array(9).fill(null),
      });

      expect(mockGamesService.create).not.toHaveBeenCalled();
      expect(mockScoresService.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown session', async () => {
      await expect(
        service.saveResult('unknown', { userId: 1, result: 'win', boardState: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
