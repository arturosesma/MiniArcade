import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { ScoresService } from '../scores/scores.service';
import { GameHistoryService } from '../game-history/game-history.service';
import { MakeMoveDto } from './dto/make-move.dto';
import { SaveResultDto } from './dto/save-result.dto';

export interface TicTacToeSession {
  id: string;
  board: (string | null)[];
  currentPlayer: 'X' | 'O';
  winner: string | null;
  isDraw: boolean;
}

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

@Injectable()
export class TicTacToeService {
  private sessions = new Map<string, TicTacToeSession>();

  constructor(
    private readonly gamesService: GamesService,
    private readonly scoresService: ScoresService,
    private readonly gameHistoryService: GameHistoryService,
  ) {}

  createGame(): TicTacToeSession {
    const id = crypto.randomUUID();
    const session: TicTacToeSession = {
      id,
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      isDraw: false,
    };
    this.sessions.set(id, session);
    return session;
  }

  makeMove(sessionId: string, dto: MakeMoveDto): TicTacToeSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException('Game session not found');
    if (session.winner || session.isDraw) throw new BadRequestException('Game is already over');
    if (session.currentPlayer !== dto.player) throw new BadRequestException('Not your turn');
    if (dto.position < 0 || dto.position > 8) throw new BadRequestException('Invalid position');
    if (session.board[dto.position] !== null) throw new BadRequestException('Position already taken');

    session.board[dto.position] = dto.player;
    session.winner = this.checkWinner(session.board);

    if (!session.winner) {
      if (session.board.every((cell) => cell !== null)) {
        session.isDraw = true;
      } else {
        session.currentPlayer = dto.player === 'X' ? 'O' : 'X';
      }
    }

    return session;
  }

  checkWinner(board: (string | null)[]): string | null {
    for (const [a, b, c] of WINNING_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  async saveResult(sessionId: string, dto: SaveResultDto): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException('Game session not found');

    let game = await this.gamesService.findByName('Tic Tac Toe');
    if (!game) {
      game = await this.gamesService.create({
        name: 'Tic Tac Toe',
        description: 'Classic two-player game on a 3x3 grid.',
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

  getSession(sessionId: string): TicTacToeSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException('Game session not found');
    return session;
  }
}
