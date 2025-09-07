import type { GameState } from './mahjong';

// 表示房间中玩家的详细信息
export interface PlayerInRoom {
  id: string; // socket.id
  userId: string;
  name: string;
  isConnected: boolean;
}

// 房间的完整状态，由服务器下发
export interface Room {
  id: string; // 之前是 roomId
  name: string;
  hostUserId: string; // 之前是 hostId
  players: PlayerInRoom[]; // 使用更详细的类型
  gameState: GameState;
}