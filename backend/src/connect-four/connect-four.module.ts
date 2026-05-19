import { Module } from '@nestjs/common';
import { ConnectFourService } from './connect-four.service';
import { ConnectFourController } from './connect-four.controller';
import { GamesModule } from '../games/games.module';
import { ScoresModule } from '../scores/scores.module';
import { GameHistoryModule } from '../game-history/game-history.module';

@Module({
  imports: [GamesModule, ScoresModule, GameHistoryModule],
  controllers: [ConnectFourController],
  providers: [ConnectFourService],
})
export class ConnectFourModule {}
