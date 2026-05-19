import { Module } from '@nestjs/common';
import { HangmanService } from './hangman.service';
import { HangmanController } from './hangman.controller';
import { GamesModule } from '../games/games.module';
import { ScoresModule } from '../scores/scores.module';
import { GameHistoryModule } from '../game-history/game-history.module';

@Module({
  imports: [GamesModule, ScoresModule, GameHistoryModule],
  controllers: [HangmanController],
  providers: [HangmanService],
})
export class HangmanModule {}
