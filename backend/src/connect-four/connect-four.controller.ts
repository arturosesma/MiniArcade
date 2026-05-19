import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ConnectFourService } from './connect-four.service';
import { DropPieceDto } from './dto/drop-piece.dto';
import { SaveResultDto } from './dto/save-result.dto';

@Controller('connect-four')
export class ConnectFourController {
  constructor(private readonly connectFourService: ConnectFourService) {}

  @Post('games')
  createGame() {
    return this.connectFourService.createGame();
  }

  @Get('games/:id')
  getSession(@Param('id') id: string) {
    return this.connectFourService.getSession(id);
  }

  @Post('games/:id/drop')
  dropPiece(@Param('id') id: string, @Body() dto: DropPieceDto) {
    return this.connectFourService.dropPiece(id, dto);
  }

  @Post('games/:id/save')
  saveResult(@Param('id') id: string, @Body() dto: SaveResultDto) {
    return this.connectFourService.saveResult(id, dto);
  }
}
