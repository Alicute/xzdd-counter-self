export interface User {
  id: string;
  username: string;
  createdAt: number;
  currentRoomId: string | null;
}