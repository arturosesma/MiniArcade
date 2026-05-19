import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HangmanService } from './hangman.service';
import { GamesService } from '../games/games.service';
import { ScoresService } from '../scores/scores.service';
import { GameHistoryService } from '../game-history/game-history.service';

const mockGamesService = { findByName: jest.fn(), create: jest.fn() };
const mockScoresService = { create: jest.fn() };
const mockGameHistoryService = { create: jest.fn() };

describe('HangmanService', () => {
  let service: HangmanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HangmanService,
        { provide: GamesService, useValue: mockGamesService },
        { provide: ScoresService, useValue: mockScoresService },
        { provide: GameHistoryService, useValue: mockGameHistoryService },
      ],
    }).compile();

    service = module.get<HangmanService>(HangmanService);
    jest.clearAllMocks();
  });

  // Pin Math.random to 0 so the first word in the list ('apple') is always chosen
  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0));
  afterEach(() => jest.restoreAllMocks());

  describe('createGame', () => {
    it('returns a game with all letters masked', () => {
      const game = service.createGame();
      expect(game.maskedWord.every((c) => c === '_')).toBe(true);
    });

    it('starts in playing status with zero guesses', () => {
      const game = service.createGame();
      expect(game.status).toBe('playing');
      expect(game.wrongCount).toBe(0);
      expect(game.guessedLetters).toHaveLength(0);
    });

    it('does not reveal the word while playing', () => {
      const game = service.createGame();
      expect(game.word).toBeUndefined();
    });

    it('sets maxWrong to 6', () => {
      const game = service.createGame();
      expect(game.maxWrong).toBe(6);
    });
  });

  describe('makeGuess', () => {
    it('reveals a correct letter in the masked word', () => {
      const { id } = service.createGame(); // word = 'apple'
      const result = service.makeGuess(id, { letter: 'a' });
      expect(result.maskedWord[0]).toBe('a');
      expect(result.wrongCount).toBe(0);
    });

    it('reveals all occurrences of the letter at once', () => {
      const { id } = service.createGame(); // 'apple' has two p's
      const result = service.makeGuess(id, { letter: 'p' });
      expect(result.maskedWord[1]).toBe('p');
      expect(result.maskedWord[2]).toBe('p');
    });

    it('increments wrongCount for a wrong guess', () => {
      const { id } = service.createGame();
      const result = service.makeGuess(id, { letter: 'z' });
      expect(result.wrongCount).toBe(1);
      expect(result.wrongGuesses).toContain('z');
    });

    it('does not reveal masked letters for a wrong guess', () => {
      const { id } = service.createGame();
      const result = service.makeGuess(id, { letter: 'z' });
      expect(result.maskedWord.every((c) => c === '_')).toBe(true);
    });

    it('throws when guessing an already-guessed letter', () => {
      const { id } = service.createGame();
      service.makeGuess(id, { letter: 'a' });
      expect(() => service.makeGuess(id, { letter: 'a' })).toThrow(BadRequestException);
    });

    it('throws for characters that are not a-z', () => {
      const { id } = service.createGame();
      expect(() => service.makeGuess(id, { letter: '1' })).toThrow(BadRequestException);
      expect(() => service.makeGuess(id, { letter: 'aa' })).toThrow(BadRequestException);
    });

    it('throws NotFoundException for an unknown session', () => {
      expect(() =>
        service.makeGuess('unknown-id', { letter: 'a' }),
      ).toThrow(NotFoundException);
    });

    it('throws when the game is already over', () => {
      const { id } = service.createGame(); // 'apple'
      for (const l of ['z', 'x', 'w', 'v', 'u', 't']) {
        service.makeGuess(id, { letter: l }); // 6 wrong → lost
      }
      expect(() => service.makeGuess(id, { letter: 'a' })).toThrow(BadRequestException);
    });

    it('detects a win when all unique letters are guessed', () => {
      const { id } = service.createGame(); // 'apple' → a,p,l,e
      service.makeGuess(id, { letter: 'a' });
      service.makeGuess(id, { letter: 'p' });
      service.makeGuess(id, { letter: 'l' });
      const result = service.makeGuess(id, { letter: 'e' });
      expect(result.status).toBe('won');
      expect(result.maskedWord).toEqual(['a', 'p', 'p', 'l', 'e']);
    });

    it('reveals the word on a win', () => {
      const { id } = service.createGame();
      service.makeGuess(id, { letter: 'a' });
      service.makeGuess(id, { letter: 'p' });
      service.makeGuess(id, { letter: 'l' });
      const result = service.makeGuess(id, { letter: 'e' });
      expect(result.word).toBe('apple');
    });

    it('detects a loss after 6 wrong guesses', () => {
      const { id } = service.createGame();
      let result = service.createGame(); // placeholder
      for (const l of ['z', 'x', 'w', 'v', 'u', 't']) {
        result = service.makeGuess(id, { letter: l });
      }
      expect(result.status).toBe('lost');
      expect(result.wrongCount).toBe(6);
    });

    it('reveals the word on a loss', () => {
      const { id } = service.createGame();
      let result = service.createGame();
      for (const l of ['z', 'x', 'w', 'v', 'u', 't']) {
        result = service.makeGuess(id, { letter: l });
      }
      expect(result.word).toBe('apple');
    });
  });

  describe('saveResult', () => {
    it('creates a game record, history, and score for a win', async () => {
      const { id } = service.createGame();
      mockGamesService.findByName.mockResolvedValue(null);
      mockGamesService.create.mockResolvedValue({ id: 3, name: 'Hangman' });
      mockGameHistoryService.create.mockResolvedValue({});
      mockScoresService.create.mockResolvedValue({});

      await service.saveResult(id, {
        userId: 7,
        result: 'win',
        boardState: Array(5).fill(null),
      });

      expect(mockGamesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Hangman' }),
      );
      expect(mockGameHistoryService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, result: 'win' }),
      );
      expect(mockScoresService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, score: 1 }),
      );
    });

    it('does not add a score for a loss', async () => {
      const { id } = service.createGame();
      mockGamesService.findByName.mockResolvedValue({ id: 3 });
      mockGameHistoryService.create.mockResolvedValue({});

      await service.saveResult(id, {
        userId: 8,
        result: 'loss',
        boardState: Array(5).fill(null),
      });

      expect(mockScoresService.create).not.toHaveBeenCalled();
    });
  });
});
