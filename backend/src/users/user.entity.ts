import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Score } from '../scores/score.entity';
import { GameHistory } from '../game-history/game-history.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Score, (score) => score.user)
  scores: Score[];

  @OneToMany(() => GameHistory, (history) => history.user)
  gameHistories: GameHistory[];
}
