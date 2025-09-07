import type { GameSettings } from './mahjong';

// 用于游戏历史记录的玩家信息子类型
export interface ArchivePlayer {
  userId: string;
  name: string;
  finalScore: number;
}

// 完整的游戏归档数据接口
export interface GameArchive {
  id: string;
  endedAt: number;
  hostUserId: string;
  players: ArchivePlayer[];
  gameHistory: {
    round: number;
    events: any[]; // 根据 GameEvent 类型，但保持 any 以便未来扩展
    finalScores: { [userId: string]: number };
  }[];
  settings: GameSettings;
}