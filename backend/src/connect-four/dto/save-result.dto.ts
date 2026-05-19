import { GameResult } from '../../game-history/game-history.entity';

export class SaveResultDto {
  userId: number;
  result: GameResult;
  boardState: (string | null)[];
}
