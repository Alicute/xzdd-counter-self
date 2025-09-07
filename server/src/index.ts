import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { createRoom, joinRoom, getRoom, leaveRoom, updateGameState, updateRoom, goToNextRound, endGameAndDeleteRoom, getLobbyInfo, handlePlayerDisconnect } from './services/roomManager';
import { GameEvent } from './types/mahjong';
import { applyEventToPlayers } from './utils/mahjongCalculator';
import { initDb, findUserByUsername, createUser, findUserById } from './services/db';
import crypto from 'crypto';

const app = express();
const server = http.createServer(app);

// 初始化 Socket.IO，并配置 CORS
// 允许来自 Vite 开发服务器 (默认端口 5173) 和生产环境的请求
const io = new Server(server, {
  cors: {
    origin: "*", // 暂时允许所有来源，后续可以收紧为前端地址
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('Mahjong Counter Server is running!');
});

// 监听 WebSocket 连接
io.on('connection', (socket) => {
  console.log(`🔌 A user connected: ${socket.id}`);

  // 监听登录或注册事件
  socket.on('loginOrRegister', async ({ username }: { username: string }, callback) => {
    try {
      if (!username || username.trim().length < 2) {
        return callback({ error: '用户名至少需要2个字符' });
      }

      let user = await findUserByUsername(username);

      if (!user) {
        const userId = crypto.randomUUID();
        user = await createUser(userId, username);
        console.log(`👤 New user created: ${username} (${userId})`);
      } else {
        console.log(`👋 User logged in: ${username} (${user.id})`);
      }
      
      // 使用 callback 返回用户信息
      callback({ user });

    } catch (error) {
      console.error('Login or register error:', error);
      callback({ error: '服务器内部错误' });
    }
  });

  // 监听用户认证事件（用于自动重连）
  socket.on('authenticate', async ({ userId }: { userId: string }, callback) => {
    try {
      const user = await findUserById(userId);
      if (!user) {
        return callback({ error: '用户不存在' });
      }

      // **架构重构**: 不再信任客户端发送的 roomId，唯一信任数据库中的 currentRoomId
      const effectiveRoomId = user.currentRoomId;

      if (effectiveRoomId) {
        const room = await getRoom(effectiveRoomId);
        if (room) {
          // 检查用户是否确实是这个房间的成员
          let playerInRoom = false;
          const updatedPlayers = room.players.map(p => {
            if (p.userId === userId) {
              playerInRoom = true;
              // 在 roomManager 的 joinRoom 中已经处理了 isConnected，这里只需更新 socket.id
              // 但为了保险起见，我们在 authenticate 中也明确设置
              return { ...p, id: socket.id, isConnected: true };
            }
            return p;
          });

          if (playerInRoom) {
            const updatedRoom = { ...room, players: updatedPlayers };
            // hostUserId 是永久的，在重连时不需要更新
            await updateRoom(updatedRoom);

            (socket as any).roomId = room.id;
            socket.join(room.id);
            socket.leave('lobby');

            console.log(`🔄 User ${user.username} reconnected to room ${room.id} using database ID`);
            
            // **修复核心**：当用户重连成功后，向房间内的所有客户端广播最新的房间状态
            // 这会通知所有人（包括重连者自己）该玩家已上线
            io.to(room.id).emit('roomStateUpdate', updatedRoom);
            
            return callback({ user, room: updatedRoom });
          }
        }
      }

      // 如果没有任何有效房间，或用户不属于该房间，则进入大厅
      socket.join('lobby');
      return callback({ user, room: null });
    } catch (error) {
      console.error('Authentication error:', error);
      callback({ error: '服务器内部错误' });
    }
  });

  // 监听创建房间事件
  socket.on('createRoom', async ({ userId, username }: { userId: string, username: string }) => {
    try {
      const player = { id: socket.id, userId, name: username, totalScore: 0, currentRoundScore: 0 };
      const room = await createRoom(player);
      (socket as any).roomId = room.id; // 将 id 存储在 socket 实例上
      socket.join(room.id);
      socket.leave('lobby'); // 创建房间后离开大厅
      
      // 通知创建者房间已创建成功
      socket.emit('roomStateUpdate', room);
      console.log(`✨ User ${username} (${userId}) created and joined room ${room.id}`);
    } catch (error: any) {
      console.error(`[ERROR] Creating room for ${username}:`, error);
      socket.emit('error', '创建房间时发生服务器错误');
    }
  });

  // 监听加入房间事件
  socket.on('joinRoom', async ({ roomId, userId, username }: { roomId: string, userId: string, username: string }) => {
    try {
      const roomToJoin = await getRoom(roomId);
      if (!roomToJoin) {
        socket.emit('error', '房间不存在或已解散');
        return;
      }

      const player = { id: socket.id, userId, name: username, totalScore: 0, currentRoundScore: 0 };
      const result = await joinRoom(roomId, player);

      if (result.error) {
        socket.emit('error', result.error);
        return;
      }

      if (result.room) {
        (socket as any).roomId = roomId; // 将 roomId 存储在 socket 实例上
        socket.join(roomId);
        socket.leave('lobby'); // 加入房间后离开大厅
        
        // 向房间内的所有客户端广播最新的房间状态
        io.to(roomId).emit('roomStateUpdate', result.room);
        console.log(`👍 User ${username} (${userId}) joined room ${roomId}`);
      }
    } catch (error: any) {
      console.error(`[ERROR] Joining room ${roomId} for ${username}:`, error);
      socket.emit('error', '加入房间时发生服务器错误');
    }
  });

  // 监听进入大厅事件
  socket.on('enterLobby', () => {
    console.log(`🏛️ User ${socket.id} entered lobby`);
    socket.join('lobby');
  });

  // 监听离开大厅事件
  socket.on('leaveLobby', () => {
    console.log(`🚪 User ${socket.id} left lobby`);
    socket.leave('lobby');
  });

  // 监听断开连接事件
  socket.on('disconnect', async () => {
    console.log(`👋 A user disconnected: ${socket.id}`);
    socket.leave('lobby'); // 确保断连时离开大厅
    const roomId = (socket as any).roomId;
    if (roomId) {
      // 使用新的断连处理逻辑，只标记玩家为离线
      const updatedRoom = await handlePlayerDisconnect(socket.id, roomId);
      if (updatedRoom) {
        // 广播更新后的房间状态给房间内的其他玩家
        io.to(roomId).emit('roomStateUpdate', updatedRoom);
        console.log(`📢 Room ${roomId} state updated due to player disconnect.`);
      }
    }
  });

  // 监听开始游戏事件
  socket.on('startGame', async ({ roomId }: { roomId: string }) => {
    try {
      const room = await getRoom(roomId);
      if (!room) {
        return socket.emit('error', '房间不存在');
      }

      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.userId) {
        return socket.emit('error', '未找到有效的玩家信息');
      }

      // **核心重构**: 使用 userId 进行权限判断
      if (player.userId === room.hostUserId) {
        const newGameState = {
          ...room.gameState,
          players: room.players
            .filter(p => p.userId) // 确保玩家有 userId
            .map(p => ({
              id: p.userId!, // 使用非空断言，因为已经过滤
              name: p.name,
              totalScore: 0,
              currentRoundScore: 0,
          })),
        };
        
        const updatedRoom = await updateGameState(roomId, newGameState);

        if(updatedRoom) {
          console.log(`🚀 Game started in room ${roomId}`);
          io.to(roomId).emit('roomStateUpdate', updatedRoom);
        }
      } else {
        socket.emit('error', '只有房主才能开始游戏');
      }
    } catch (error) {
      console.error(`[ERROR] Starting game in room ${roomId}:`, error);
      socket.emit('error', '开始游戏时发生服务器错误');
    }
  });

  // 监听添加游戏事件
  socket.on('addGameEvent', async ({ roomId, event }: { roomId: string, event: GameEvent }) => {
    const room = await getRoom(roomId);
    if (room) {
      // 1. 获取当前游戏状态
      const currentGameState = room.gameState;

      // 2. 应用事件，计算新的 players 状态
      const updatedPlayers = applyEventToPlayers(event, currentGameState.players);

      // 3. 更新游戏状态
      const updatedGameState = {
        ...currentGameState,
        players: updatedPlayers,
        currentRoundEvents: [...currentGameState.currentRoundEvents, event],
      };

      // 4. 保存并广播
      const updatedRoom = await updateGameState(roomId, updatedGameState);
      if (updatedRoom) {
        io.to(roomId).emit('roomStateUpdate', updatedRoom);
        console.log(`🎲 Event added in room ${roomId}: ${event.description}`);
      }
    }
  });

  // 监听进入下一局事件
  socket.on('nextRound', async ({ roomId }: { roomId: string }) => {
    try {
      const room = await getRoom(roomId);
      if (!room) {
        return socket.emit('error', '房间不存在');
      }
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.userId) {
        return socket.emit('error', '未找到有效的玩家信息');
      }

      if (player.userId === room.hostUserId) {
        const updatedRoom = await goToNextRound(roomId);
        if (updatedRoom) {
          io.to(roomId).emit('roomStateUpdate', updatedRoom);
          console.log(`⏩ Room ${roomId} advanced to round ${updatedRoom.gameState.currentRound}`);
        }
      } else {
        socket.emit('error', '只有房主才能操作进入下一局');
      }
    } catch (error) {
      console.error(`[ERROR] Advancing to next round in room ${roomId}:`, error);
      socket.emit('error', '进入下一局时发生服务器错误');
    }
  });

  // 监听结束游戏事件
  socket.on('endGame', async ({ roomId }: { roomId: string }) => {
    try {
      const room = await getRoom(roomId);
      if (!room) {
        return socket.emit('error', '房间不存在');
      }
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.userId) {
        return socket.emit('error', '未找到有效的玩家信息');
      }

      if (player.userId === room.hostUserId) {
        await endGameAndDeleteRoom(roomId);
        socket.to(roomId).emit('roomEnded', '房主已解散房间。');
        io.in(roomId).socketsLeave(roomId);
      } else {
        socket.emit('error', '只有房主才能结束游戏');
      }
    } catch (error) {
      console.error(`[ERROR] Ending game in room ${roomId}:`, error);
      socket.emit('error', '结束游戏时发生服务器错误');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
  initDb(); // 初始化数据库
});

// 定期向大厅广播房间列表
setInterval(async () => {
  try {
    const lobbyInfo = await getLobbyInfo();
    io.to('lobby').emit('lobbyUpdate', lobbyInfo);
  } catch (error) {
    console.error("Error broadcasting lobby info:", error);
  }
}, 5000); // 每 5 秒广播一次
