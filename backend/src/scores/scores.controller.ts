import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { CreateScoreDto } from './dto/create-score.dto';

@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get()
  findAll() {
    return this.scoresService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.scoresService.findByUser(userId);
  }

  @Get('game/:gameId')
  findByGame(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.scoresService.findByGame(gameId);
  }

  @Post()
  create(@Body() dto: CreateScoreDto) {
    return this.scoresService.create(dto);
  }
}
