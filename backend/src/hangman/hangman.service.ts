import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { ScoresService } from '../scores/scores.service';
import { GameHistoryService } from '../game-history/game-history.service';
import { MakeGuessDto } from './dto/make-guess.dto';
import { SaveResultDto } from './dto/save-result.dto';

export type HangmanStatus = 'playing' | 'won' | 'lost';

export interface HangmanGame {
  id: string;
  maskedWord: string[];
  guessedLetters: string[];
  wrongGuesses: string[];
  wrongCount: number;
  maxWrong: number;
  status: HangmanStatus;
  word?: string; // revealed only when game is over
}

interface HangmanSession {
  id: string;
  word: string;
  guessedLetters: string[];
  wrongGuesses: string[];
  status: HangmanStatus;
}

const MAX_WRONG = 6;

const WORD_LIST = [
  // English
  'apple', 'banana', 'computer', 'elephant', 'guitar', 'mountain', 'ocean',
  'piano', 'rainbow', 'tiger', 'umbrella', 'violin', 'window', 'zebra',
  'adventure', 'butterfly', 'chocolate', 'diamond', 'flower', 'garden',
  'hospital', 'island', 'jungle', 'kitchen', 'library', 'notebook', 'orange',
  'penguin', 'rocket', 'sandwich', 'telephone', 'waterfall', 'dragon',
  'castle', 'wizard', 'forest', 'crystal', 'thunder', 'shadow', 'warrior',
  'phoenix', 'legend', 'mystery', 'journey', 'horizon', 'galaxy', 'volcano',
  'tornado', 'dolphin', 'lantern', 'captain', 'compass', 'silence',
  // Spanish (no accent marks)
  'agua', 'barco', 'caballo', 'ciudad', 'elefante', 'familia', 'gato',
  'historia', 'libro', 'madera', 'noche', 'paloma', 'queso', 'tierra',
  'viento', 'zapato', 'mesa', 'silla', 'perro', 'luna', 'playa', 'reloj',
  'camino', 'calle', 'fuego', 'lluvia', 'planeta', 'estrella', 'corazon',
  'cancion', 'jardin', 'arbol', 'nacion', 'leccion', 'limon', 'salmon',
];

@Injectable()
export class HangmanService {
  private sessions = new Map<string, HangmanSession>();

  constructor(
    private readonly gamesService: GamesService,
    private readonly scoresService: ScoresService,
    private readonly gameHistoryService: GameHistoryService,
  ) {}

  createGame(): HangmanGame {
    const id = crypto.randomUUID();
    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    const session: HangmanSession = {
      id,
      word,
      guessedLetters: [],
      wrongGuesses: [],
      status: 'playing',
    };
    this.sessions.set(id, session);
    return this.toPublic(session);
  }

  makeGuess(sessionId: string, dto: MakeGuessDto): HangmanGame {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException('Game session not found');
    if (session.status !== 'playing') throw new BadRequestException('Game is already over');

    const letter = dto.letter.toLowerCase();
    if (!/^[a-z]$/.test(letter)) throw new BadRequestException('Invalid letter');
    if (session.guessedLetters.includes(letter)) throw new BadRequestException('Letter already guessed');

    session.guessedLetters.push(letter);

    if (!session.word.includes(letter)) {
      session.wrongGuesses.push(letter);
    }

    if (session.wrongGuesses.length >= MAX_WRONG) {
      session.status = 'lost';
    } else if (session.word.split('').every((l) => session.guessedLetters.includes(l))) {
      session.status = 'won';
    }

    return this.toPublic(session);
  }

  async saveResult(sessionId: string, dto: SaveResultDto): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException('Game session not found');

    let game = await this.gamesService.findByName('Hangman');
    if (!game) {
      game = await this.gamesService.create({
        name: 'Hangman',
        description: 'Guess the hidden word one letter at a time before the man is hanged.',
      });
    }

    await this.gameHistoryService.create({
      userId: dto.userId,
      gameId: game.id,
      result: dto.result,
      boardState: dto.boardState,
    });

    if (dto.result === 'win') {
      await this.scoresService.create({
        userId: dto.userId,
        gameId: game.id,
        score: 1,
      });
    }

    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): HangmanGame {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException('Game session not found');
    return this.toPublic(session);
  }

  private toPublic(session: HangmanSession): HangmanGame {
    const maskedWord = session.word
      .split('')
      .map((letter) => (session.guessedLetters.includes(letter) ? letter : '_'));
    return {
      id: session.id,
      maskedWord,
      guessedLetters: session.guessedLetters,
      wrongGuesses: session.wrongGuesses,
      wrongCount: session.wrongGuesses.length,
      maxWrong: MAX_WRONG,
      status: session.status,
      ...(session.status !== 'playing' && { word: session.word }),
    };
  }
}
