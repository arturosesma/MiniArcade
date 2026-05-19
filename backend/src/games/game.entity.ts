import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Score } from '../scores/score.entity';
import { GameHistory } from '../game-history/game-history.entity';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => Score, (score) => score.game)
  scores: Score[];

  @OneToMany(() => GameHistory, (history) => history.game)
  gameHistories: GameHistory[];
}
