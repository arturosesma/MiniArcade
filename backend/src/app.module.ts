import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { ScoresModule } from './scores/scores.module';
import { GameHistoryModule } from './game-history/game-history.module';
import { TicTacToeModule } from './tic-tac-toe/tic-tac-toe.module';
import { ConnectFourModule } from './connect-four/connect-four.module';
import { HangmanModule } from './hangman/hangman.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', 'root'),
        database: configService.get<string>('DB_DATABASE', 'games_db'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    UsersModule,
    GamesModule,
    ScoresModule,
    GameHistoryModule,
    TicTacToeModule,
    ConnectFourModule,
    HangmanModule,
  ],
})
export class AppModule {}
