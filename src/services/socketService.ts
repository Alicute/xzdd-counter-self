import { io, Socket } from 'socket.io-client';
import type { Room } from '../types/room';
import type { GameArchive } from '../types/archive';
import type { GameSettings } from '../types/mahjong';
import type { User } from '../types/user';
import type { LobbyRoomInfo } from '../types/lobby';

const SERVER_URL = 'http://localhost:3001';

// 使用 'as any' 是因为 socket.io-client 的类型有时与 NodeJS 的 EventEmitter 冲突
const socket: Socket = io(SERVER_URL, {
  autoConnect: false, // 手动连接
} as any);

// 用于调试，监听所有事件
socket.onAny((event, ...args) => {
  console.log(`📡 a socket event was sent: ${event}`, args);
});

// 监听连接成功
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
});

// 监听连接错误
socket.on('connect_error', (err) => {
  console.error('❌ WebSocket connection error:', err.message);
});

// 监听断开连接
socket.on('disconnect', (reason) => {
  console.log(`🔌 Disconnected from WebSocket server: ${reason}`);
});

// 导出服务函数
export const socketService = {
  connect: () => {
    if (!socket.connected) {
      socket.connect();
    }
  },

  disconnect: () => {
    if (socket.connected) {
      socket.disconnect();
    }
  },

  getSocketId: (): string | null => {
    return socket.id ?? null;
  },

  isConnected: (): boolean => {
    return socket.connected;
  },

  onConnect: (callback: () => void) => {
    socket.on('connect', callback);
  },

  // 监听大厅信息更新
  onLobbyUpdate: (callback: (lobbyInfo: LobbyRoomInfo[]) => void) => {
    socket.on('lobbyUpdate', callback);
  },

  // 监听服务器的房间状态更新
  onRoomStateUpdate: (callback: (room: Room) => void) => {
    socket.on('roomStateUpdate', callback);
  },

  // 监听错误信息
  onError: (callback: (message: string) => void) => {
    socket.on('error', callback);
  },

  // 监听房主解散房间事件
  onRoomEnded: (callback: (message: string) => void) => {
    socket.on('roomEnded', callback);
  },

  // 监听被踢出房间事件
  onKicked: (callback: (message: string) => void) => {
    socket.on('kicked', callback);
  },

  // 移除与特定房间会话相关的监听器
  cleanupRoomListeners: () => {
    socket.off('roomStateUpdate');
    socket.off('error'); // error 消息通常与房间操作有关
    socket.off('roomEnded');
    socket.off('kicked');
    console.log('🧹 Cleaned up room-specific listeners');
  },

  // 移除监听器，防止内存泄漏
  cleanupListeners: () => {
    socket.off('roomStateUpdate');
    socket.off('error');
    socket.off('connect');
    socket.off('roomEnded');
    socket.off('kicked');
    socket.off('lobbyUpdate');
    console.log('🧹 Cleaned up listeners on app unmount');
  },

  // 单独清理大厅监听器
  cleanupLobbyListeners: () => {
    socket.off('lobbyUpdate');
  },
  // 登录或注册
  loginOrRegister: (username: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      socket.emit('loginOrRegister', { username }, (response: { user?: User; error?: string }) => {
        if (response.user) {
          resolve(response.user);
        } else {
          reject(new Error(response.error || 'Login failed'));
        }
      });
    });
  },

  // 验证用户身份并尝试重连房间
  authenticate: (userId: string): Promise<{ user: User; room: Room | null }> => {
    return new Promise((resolve, reject) => {
      // **架构重构**: 不再发送 roomId，服务器将从数据库中获取
      socket.emit('authenticate', { userId }, (response: { user?: User; room?: Room | null; error?: string }) => {
        if (response.user) {
          resolve({ user: response.user, room: response.room || null });
        } else {
          reject(new Error(response.error || 'Authentication failed'));
        }
      });
    });
  },

  // 发送创建房间的请求
  createRoom: (user: { userId: string; username: string }, settings: GameSettings) => {
    socket.emit('createRoom', { userId: user.userId, username: user.username, settings });
  },

  // 发送加入房间的请求
  joinRoom: (roomId: string, user: { userId: string; username: string }) => {
    socket.emit('joinRoom', { roomId, userId: user.userId, username: user.username });
  },
  
  // 发送开始游戏的请求
  startGame: (roomId: string) => {
    socket.emit('startGame', { roomId });
  },

  // 发送添加游戏事件的请求
  addGameEvent: (roomId: string, event: import('../types/mahjong').GameEvent) => {
    socket.emit('addGameEvent', { roomId, event });
  },


  // 发送进入下一局的请求
  nextRound: (roomId: string) => {
    socket.emit('nextRound', { roomId });
  },

  // 发送结束游戏的请求
  endGame: (roomId: string) => {
    socket.emit('endGame', { roomId });
  },

  // 发送结算游戏的请求
  settleGame: (roomId: string) => {
    socket.emit('settleGame', { roomId });
  },

  // 发送踢人请求
  kickPlayer: (roomId: string, targetUserId: string) => {
    socket.emit('kickPlayer', { roomId, targetUserId });
  },

  // 进入大厅
  enterLobby: () => {
    socket.emit('enterLobby');
  },

  // 离开大厅
  leaveLobby: () => {
    socket.emit('leaveLobby');
  },

  // 发送离开房间的请求
  leaveRoom: (roomId: string) => {
    socket.emit('leaveRoom', { roomId });
  },

  // 获取游戏历史记录
  getGameArchives: (): Promise<{ archives?: GameArchive[]; error?: string }> => {
    return new Promise((resolve) => {
      socket.emit('getGameArchives', (response: { archives?: GameArchive[]; error?: string }) => {
        resolve(response);
      });
    });
  },
};