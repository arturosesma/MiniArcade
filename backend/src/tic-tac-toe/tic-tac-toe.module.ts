import { Module } from '@nestjs/common';
import { TicTacToeService } from './tic-tac-toe.service';
import { TicTacToeController } from './tic-tac-toe.controller';
import { GamesModule } from '../games/games.module';
import { ScoresModule } from '../scores/scores.module';
import { GameHistoryModule } from '../game-history/game-history.module';

@Module({
  imports: [GamesModule, ScoresModule, GameHistoryModule],
  controllers: [TicTacToeController],
  providers: [TicTacToeService],
})
export class TicTacToeModule {}
