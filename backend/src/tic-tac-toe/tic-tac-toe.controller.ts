import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { TicTacToeService } from './tic-tac-toe.service';
import { MakeMoveDto } from './dto/make-move.dto';
import { SaveResultDto } from './dto/save-result.dto';

@Controller('tic-tac-toe')
export class TicTacToeController {
  constructor(private readonly ticTacToeService: TicTacToeService) {}

  @Post('games')
  createGame() {
    return this.ticTacToeService.createGame();
  }

  @Get('games/:id')
  getSession(@Param('id') id: string) {
    return this.ticTacToeService.getSession(id);
  }

  @Post('games/:id/move')
  makeMove(@Param('id') id: string, @Body() dto: MakeMoveDto) {
    return this.ticTacToeService.makeMove(id, dto);
  }

  @Post('games/:id/save')
  saveResult(@Param('id') id: string, @Body() dto: SaveResultDto) {
    return this.ticTacToeService.saveResult(id, dto);
  }
}
