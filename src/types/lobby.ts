export interface LobbyRoomInfo {
  id: string; // **核心重构**: 字段重命名
  hostName: string;
  playerCount: number;
  isGameStarted: boolean;
}