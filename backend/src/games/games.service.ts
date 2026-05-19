import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './game.entity';
import { CreateGameDto } from './dto/create-game.dto';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly gamesRepository: Repository<Game>,
  ) {}

  findAll(): Promise<Game[]> {
    return this.gamesRepository.find();
  }

  async findOne(id: number): Promise<Game> {
    const game = await this.gamesRepository.findOneBy({ id });
    if (!game) throw new NotFoundException(`Game #${id} not found`);
    return game;
  }

  async findByName(name: string): Promise<Game | null> {
    return this.gamesRepository.findOneBy({ name });
  }

  create(dto: CreateGameDto): Promise<Game> {
    const game = this.gamesRepository.create(dto);
    return this.gamesRepository.save(game);
  }
}
