import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Game } from '../games/game.entity';

export type GameResult = 'win' | 'loss' | 'draw';

@Entity('game_history')
export class GameHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.gameHistories)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  gameId: number;

  @ManyToOne(() => Game, (game) => game.gameHistories)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column({ type: 'varchar', length: 10 })
  result: GameResult;

  @Column({ type: 'json' })
  boardState: (string | null)[];

  @CreateDateColumn()
  createdAt: Date;
}
