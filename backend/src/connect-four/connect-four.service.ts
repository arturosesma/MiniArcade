import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { ScoresService } from '../scores/scores.service';
import { GameHistoryService } from '../game-history/game-history.service';
import { DropPieceDto } from './dto/drop-piece.dto';
import { SaveResultDto } from './dto/save-result.dto';

export interface ConnectFourSession {
  id: string;
  board: (string | null)[];
  currentPlayer: 'R' | 'Y';
  winner: string | null;
  winningCells: number[];
  isDraw: boolean;
}

const ROWS = 6;
const COLS = 7;

function idx(row: number, col: number): number {
  return row * COLS + col;
}

@Injectable()
export class ConnectFourService {
  private sessions = new Map<string, ConnectFourSession>();

  constructor(
    private readonly gamesService: GamesService,
    private readonly scoresService: ScoresService,
    private readonly gameHistoryService: GameHistoryService,
  ) {}

  createGame(): ConnectFourSession {
    const id = crypto.randomUUID();
    const session: ConnectFourSession = {
      id,
      board: Array(ROWS * COLS).fill(null),
      currentPlayer: 'R',
      winner: null,
      winningCells: [],
      isDraw: false,
    };
    this.sessions.set(id, session);
    return session;
  }

  dropPiece(sessionId: string, dto: DropPieceDto): ConnectFourSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException('Game session not found');
    if (session.winner || session.isDraw) throw new BadRequestException('Game is already over');
    if (session.currentPlayer !== dto.player) throw new BadRequestException('Not your turn');
    if (dto.column < 0 || dto.column >= COLS) throw new BadRequestException('Invalid column');

    let landRow = -1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (session.board[idx(row, dto.column)] === null) {
        landRow = row;
        break;
      }
    }
    if (landRow === -1) throw new BadRequestException('Column is full');

    session.board[idx(landRow, dto.column)] = dto.player;

    const winResult = this.checkWinner(session.board, landRow, dto.column);
    if (winResult) {
      session.winner = winResult.winner;
      session.winningCells = winResult.cells;
    } else if (session.board.every((cell) => cell !== null)) {
      session.isDraw = true;
    } else {
      session.currentPlayer = dto.player === 'R' ? 'Y' : 'R';
    }

    return session;
  }

  checkWinner(
    board: (string | null)[],
    row: number,
    col: number,
  ): { winner: string; cells: number[] } | null {
    const player = board[idx(row, col)];
    if (!player) return null;

    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dr, dc] of directions) {
      const cells = [idx(row, col)];

      for (let d = 1; d <= 3; d++) {
        const r = row + dr * d;
        const c = col + dc * d;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[idx(r, c)] === player) {
          cells.push(idx(r, c));
        } else break;
      }

      for (let d = 1; d <= 3; d++) {
        const r = row - dr * d;
        const c = col - dc * d;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[idx(r, c)] === player) {
          cells.push(idx(r, c));
        } else break;
      }

      if (cells.length >= 4) return { winner: player, cells };
    }

    return null;
  }

  async saveResult(_sessionId: string, dto: SaveResultDto): Promise<void> {
    let game = await this.gamesService.findByName('Connect Four');
    if (!game) {
      game = await this.gamesService.create({
        name: 'Connect Four',
        description: 'Drop pieces to connect four in a row on a 6×7 grid.',
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
  }

  getSession(sessionId: string): ConnectFourSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException('Game session not found');
    return session;
  }
}
