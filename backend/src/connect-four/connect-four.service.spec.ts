import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConnectFourService } from './connect-four.service';
import { GamesService } from '../games/games.service';
import { ScoresService } from '../scores/scores.service';
import { GameHistoryService } from '../game-history/game-history.service';

const ROWS = 6;
const COLS = 7;

const mockGamesService = { findByName: jest.fn(), create: jest.fn() };
const mockScoresService = { create: jest.fn() };
const mockGameHistoryService = { create: jest.fn() };

describe('ConnectFourService', () => {
  let service: ConnectFourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectFourService,
        { provide: GamesService, useValue: mockGamesService },
        { provide: ScoresService, useValue: mockScoresService },
        { provide: GameHistoryService, useValue: mockGameHistoryService },
      ],
    }).compile();

    service = module.get<ConnectFourService>(ConnectFourService);
    jest.clearAllMocks();
  });

  describe('createGame', () => {
    it('returns a fresh 6×7 board with 42 empty cells', () => {
      const game = service.createGame();
      expect(game.board).toHaveLength(ROWS * COLS);
      expect(game.board.every((c) => c === null)).toBe(true);
    });

    it('starts with player R and no winner', () => {
      const game = service.createGame();
      expect(game.currentPlayer).toBe('R');
      expect(game.winner).toBeNull();
      expect(game.isDraw).toBe(false);
      expect(game.winningCells).toHaveLength(0);
    });
  });

  describe('dropPiece', () => {
    it('piece lands on the bottom row of an empty column', () => {
      const { id } = service.createGame();
      const result = service.dropPiece(id, { column: 0, player: 'R' });
      // Bottom row = row 5, col 0 → index 5*7+0 = 35
      expect(result.board[35]).toBe('R');
    });

    it('second piece in the same column stacks on top of the first', () => {
      const { id } = service.createGame();
      service.dropPiece(id, { column: 0, player: 'R' });
      const result = service.dropPiece(id, { column: 0, player: 'Y' });
      // row 4, col 0 → index 4*7+0 = 28
      expect(result.board[28]).toBe('Y');
    });

    it('switches the active player after each drop', () => {
      const { id } = service.createGame();
      const after = service.dropPiece(id, { column: 3, player: 'R' });
      expect(after.currentPlayer).toBe('Y');
    });

    it('throws when it is not the player turn', () => {
      const { id } = service.createGame();
      expect(() =>
        service.dropPiece(id, { column: 0, player: 'Y' }),
      ).toThrow(BadRequestException);
    });

    it('throws for a column index outside 0-6', () => {
      const { id } = service.createGame();
      expect(() =>
        service.dropPiece(id, { column: 7, player: 'R' }),
      ).toThrow(BadRequestException);
    });

    it('throws when the column is full', () => {
      const { id } = service.createGame();
      // Fill column 0 with alternating pieces (6 rows)
      const players: Array<'R' | 'Y'> = ['R', 'Y', 'R', 'Y', 'R', 'Y'];
      for (const player of players) {
        service.dropPiece(id, { column: 0, player });
      }
      expect(() =>
        service.dropPiece(id, { column: 0, player: 'R' }),
      ).toThrow(BadRequestException);
    });

    it('throws NotFoundException for an unknown session', () => {
      expect(() =>
        service.dropPiece('bad-id', { column: 0, player: 'R' }),
      ).toThrow(NotFoundException);
    });

    it('throws when the game is already over', () => {
      const { id } = service.createGame();
      // R wins horizontally in bottom row: cols 0-3
      service.dropPiece(id, { column: 0, player: 'R' });
      service.dropPiece(id, { column: 4, player: 'Y' });
      service.dropPiece(id, { column: 1, player: 'R' });
      service.dropPiece(id, { column: 5, player: 'Y' });
      service.dropPiece(id, { column: 2, player: 'R' });
      service.dropPiece(id, { column: 6, player: 'Y' });
      service.dropPiece(id, { column: 3, player: 'R' });
      expect(() =>
        service.dropPiece(id, { column: 0, player: 'Y' }),
      ).toThrow(BadRequestException);
    });

    it('detects a horizontal win and returns 4 winning cells', () => {
      const { id } = service.createGame();
      // R fills bottom row cols 0-3; Y plays cols 4-6
      service.dropPiece(id, { column: 0, player: 'R' });
      service.dropPiece(id, { column: 4, player: 'Y' });
      service.dropPiece(id, { column: 1, player: 'R' });
      service.dropPiece(id, { column: 5, player: 'Y' });
      service.dropPiece(id, { column: 2, player: 'R' });
      service.dropPiece(id, { column: 6, player: 'Y' });
      const result = service.dropPiece(id, { column: 3, player: 'R' });
      expect(result.winner).toBe('R');
      expect(result.winningCells).toHaveLength(4);
    });

    it('detects a vertical win and returns 4 winning cells', () => {
      const { id } = service.createGame();
      // R stacks 4 in column 0; Y plays column 1
      service.dropPiece(id, { column: 0, player: 'R' });
      service.dropPiece(id, { column: 1, player: 'Y' });
      service.dropPiece(id, { column: 0, player: 'R' });
      service.dropPiece(id, { column: 1, player: 'Y' });
      service.dropPiece(id, { column: 0, player: 'R' });
      service.dropPiece(id, { column: 1, player: 'Y' });
      const result = service.dropPiece(id, { column: 0, player: 'R' });
      expect(result.winner).toBe('R');
      expect(result.winningCells).toHaveLength(4);
    });
  });

  describe('checkWinner', () => {
    it('detects a diagonal win (top-left to bottom-right)', () => {
      const board = Array(ROWS * COLS).fill(null);
      // Y at (2,2), (3,3), (4,4), (5,5)
      board[2 * COLS + 2] = 'Y';
      board[3 * COLS + 3] = 'Y';
      board[4 * COLS + 4] = 'Y';
      board[5 * COLS + 5] = 'Y';
      const result = service.checkWinner(board, 5, 5);
      expect(result?.winner).toBe('Y');
      expect(result?.cells).toHaveLength(4);
    });

    it('detects an anti-diagonal win (top-right to bottom-left)', () => {
      const board = Array(ROWS * COLS).fill(null);
      // R at (2,4), (3,3), (4,2), (5,1)
      board[2 * COLS + 4] = 'R';
      board[3 * COLS + 3] = 'R';
      board[4 * COLS + 2] = 'R';
      board[5 * COLS + 1] = 'R';
      const result = service.checkWinner(board, 5, 1);
      expect(result?.winner).toBe('R');
      expect(result?.cells).toHaveLength(4);
    });

    it('returns null when there is no winner', () => {
      expect(service.checkWinner(Array(ROWS * COLS).fill(null), 0, 0)).toBeNull();
    });

    it('returns null when fewer than 4 are connected', () => {
      const board = Array(ROWS * COLS).fill(null);
      board[5 * COLS + 0] = 'R';
      board[5 * COLS + 1] = 'R';
      board[5 * COLS + 2] = 'R';
      const result = service.checkWinner(board, 5, 2);
      expect(result).toBeNull();
    });
  });

  describe('saveResult', () => {
    it('creates history and score for a win', async () => {
      const { id } = service.createGame();
      mockGamesService.findByName.mockResolvedValue(null);
      mockGamesService.create.mockResolvedValue({ id: 2, name: 'Connect Four' });
      mockGameHistoryService.create.mockResolvedValue({});
      mockScoresService.create.mockResolvedValue({});

      await service.saveResult(id, {
        userId: 10,
        result: 'win',
        boardState: Array(ROWS * COLS).fill(null),
      });

      expect(mockGameHistoryService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 10, result: 'win' }),
      );
      expect(mockScoresService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 10, score: 1 }),
      );
    });

    it('does not add a score for a draw', async () => {
      const { id } = service.createGame();
      mockGamesService.findByName.mockResolvedValue({ id: 2 });
      mockGameHistoryService.create.mockResolvedValue({});

      await service.saveResult(id, {
        userId: 5,
        result: 'draw',
        boardState: Array(ROWS * COLS).fill(null),
      });

      expect(mockScoresService.create).not.toHaveBeenCalled();
    });
  });
});
