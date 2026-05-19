import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameHistory } from './game-history.entity';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';

@Injectable()
export class GameHistoryService {
  constructor(
    @InjectRepository(GameHistory)
    private readonly gameHistoryRepository: Repository<GameHistory>,
  ) {}

  findByUser(userId: number): Promise<GameHistory[]> {
    return this.gameHistoryRepository.find({
      where: { userId },
      relations: ['game'],
      order: { createdAt: 'DESC' },
    });
  }

  findByGame(gameId: number): Promise<GameHistory[]> {
    return this.gameHistoryRepository.find({
      where: { gameId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  create(dto: CreateGameHistoryDto): Promise<GameHistory> {
    const entry = this.gameHistoryRepository.create(dto);
    return this.gameHistoryRepository.save(entry);
  }
}
