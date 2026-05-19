import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from './score.entity';
import { CreateScoreDto } from './dto/create-score.dto';

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(Score)
    private readonly scoresRepository: Repository<Score>,
  ) {}

  findAll(): Promise<Score[]> {
    return this.scoresRepository.find({ relations: ['user', 'game'] });
  }

  findByUser(userId: number): Promise<Score[]> {
    return this.scoresRepository.find({
      where: { userId },
      relations: ['game'],
      order: { createdAt: 'DESC' },
    });
  }

  findByGame(gameId: number): Promise<Score[]> {
    return this.scoresRepository.find({
      where: { gameId },
      relations: ['user'],
      order: { score: 'DESC' },
    });
  }

  create(dto: CreateScoreDto): Promise<Score> {
    const score = this.scoresRepository.create(dto);
    return this.scoresRepository.save(score);
  }
}
