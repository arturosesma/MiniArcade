import { GameResult } from '../game-history.entity';

export class CreateGameHistoryDto {
  userId: number;
  gameId: number;
  result: GameResult;
  boardState: (string | null)[];
}
