import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Game } from '../games/game.entity';

@Entity('scores')
export class Score {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.scores)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  gameId: number;

  @ManyToOne(() => Game, (game) => game.scores)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column()
  score: number;

  @CreateDateColumn()
  createdAt: Date;
}
