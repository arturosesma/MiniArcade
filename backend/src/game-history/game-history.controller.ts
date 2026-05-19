import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { GameHistoryService } from './game-history.service';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';

@Controller('game-history')
export class GameHistoryController {
  constructor(private readonly gameHistoryService: GameHistoryService) {}

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.gameHistoryService.findByUser(userId);
  }

  @Get('game/:gameId')
  findByGame(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.gameHistoryService.findByGame(gameId);
  }

  @Post()
  create(@Body() dto: CreateGameHistoryDto) {
    return this.gameHistoryService.create(dto);
  }
}
