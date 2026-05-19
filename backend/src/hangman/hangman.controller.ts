import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { HangmanService } from './hangman.service';
import { MakeGuessDto } from './dto/make-guess.dto';
import { SaveResultDto } from './dto/save-result.dto';

@Controller('hangman')
export class HangmanController {
  constructor(private readonly hangmanService: HangmanService) {}

  @Post('games')
  createGame() {
    return this.hangmanService.createGame();
  }

  @Get('games/:id')
  getSession(@Param('id') id: string) {
    return this.hangmanService.getSession(id);
  }

  @Post('games/:id/guess')
  makeGuess(@Param('id') id: string, @Body() dto: MakeGuessDto) {
    return this.hangmanService.makeGuess(id, dto);
  }

  @Post('games/:id/save')
  saveResult(@Param('id') id: string, @Body() dto: SaveResultDto) {
    return this.hangmanService.saveResult(id, dto);
  }
}
