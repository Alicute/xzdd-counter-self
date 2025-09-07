// roomManager.ts
// 负责管理所有游戏房间的逻辑
import { GameState } from '../types/mahjong';
import { getDefaultGameState } from '../utils/gameState';
import { getRoomFromDb, saveRoomToDb, deleteRoomFromDb, updateUserRoom, getAllRooms } from './db';
import { settleCurrentRound } from '../utils/mahjongCalculator';

// 玩家在大厅中等待时的信息
import { Player } from '../types/mahjong';

export interface LobbyPlayer extends Player {
  // LobbyPlayer 现在继承自 Player，自动包含 id, userId, name
  // id 仍然是 socket.id
  isConnected: boolean;
}

export interface Room {
  id: string; // **核心重构**: 字段重命名
  name: string; // 和前端类型保持一致
  hostUserId: string; // 房主的永久 userId
  players: LobbyPlayer[];
  gameState: GameState;
}

// 为大厅视图定义的简化房间信息
export interface LobbyRoomInfo {
  id: string; // **核心重构**: 字段重命名
  hostName: string;
  playerCount: number;
  isGameStarted: boolean;
}

/**
 * 生成一个唯一的、不易重复的房间号
 * @returns {Promise<string>} 4位纯数字
 */
async function generateRoomId(): Promise<string> {
  let result = '';
  let isUnique = false;
  while (!isUnique) {
    result = Math.floor(1000 + Math.random() * 9000).toString();
    const existingRoom = await getRoomFromDb(result);
    if (!existingRoom) {
      isUnique = true;
    }
  }
  return result;
}

/**
 * 创建一个新的房间
 * @param hostPlayer 创建者信息
 * @returns {Promise<Room>} 创建的房间信息
 */
export async function createRoom(hostPlayer: Omit<LobbyPlayer, 'isConnected'>): Promise<Room> {
  const id = await generateRoomId();
  
  if (!hostPlayer.userId) {
    throw new Error('Cannot create a room without a host user ID.');
  }

  const connectedHostPlayer: LobbyPlayer = { ...hostPlayer, isConnected: true };

  const newRoom: Room = {
    id,
    name: `${hostPlayer.name}的房间`, // 新增房间名
    hostUserId: hostPlayer.userId,
    players: [connectedHostPlayer],
    gameState: getDefaultGameState(), // 初始化默认游戏状态
  };
  await saveRoomToDb(id, newRoom as any);
  if(hostPlayer.userId) {
    await updateUserRoom(hostPlayer.userId, id);
  }
  console.log(`🏠 Room created: ${id} by ${hostPlayer.name}`);
  return newRoom;
}

/**
 * 根据房间号查找房间
 * @param roomId 房间号
 * @returns {Promise<Room | null>} 房间信息或 null
 */
export async function getRoom(id: string): Promise<Room | null> {
  return getRoomFromDb(id) as Promise<Room | null>;
}

/**
 * 玩家加入一个已存在的房间
 * @param roomId 房间号
 * @param player 加入的玩家信息
 * @returns {Promise<Room | null>} 更新后的房间信息，如果房间不存在则返回 null
 */
export async function joinRoom(id: string, player: Omit<LobbyPlayer, 'isConnected'>): Promise<{ room: Room | null; error?: string }> {
  const room = await getRoom(id);
  if (!room) {
    return { room: null, error: '房间不存在' };
  }

  // 检查同一个 userId 的用户是否已在房间内
  if (room.players.some(p => p.userId === player.userId)) {
    // 允许用户以新的 socket.id 重新进入，覆盖旧的
    const updatedPlayers = room.players.map(p => {
      if (p.userId === player.userId) {
        console.log(`👤 Player ${player.name} re-connected with new socket: ${player.id}`);
        // 玩家重连，更新 socket.id 并标记为在线
        return { ...p, id: player.id, isConnected: true };
      }
      return p;
    });
    const reconnectedRoom: Room = { ...room, players: updatedPlayers };
    await saveRoomToDb(id, reconnectedRoom as any);
    return { room: reconnectedRoom };
  }

  // 检查房间是否已满（例如，最多4人）
  if (room.players.length >= 4) {
    return { room: null, error: '房间已满' };
  }

  const connectedPlayer: LobbyPlayer = { ...player, isConnected: true };

  const updatedRoom: Room = {
    ...room,
    players: [...room.players, connectedPlayer],
  };
  await saveRoomToDb(id, updatedRoom as any);
  if (player.userId) {
    await updateUserRoom(player.userId, id);
  }
  console.log(`👤 Player ${player.name} joined room: ${id}`);
  return { room: updatedRoom };
}

/**
 * 玩家离开房间
 * @param playerId 离开的玩家ID (socket.id)
 * @param roomId 离开的房间ID
 * @returns {Promise<{ updatedRoom: Room } | null>} 更新后的房间信息或null
 */
export async function leaveRoom(playerId: string, id: string): Promise<{ updatedRoom: Room } | null> {
    const room = await getRoom(id);
    if (!room) return null;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return null;
    
    const leavingPlayer = room.players[playerIndex];
    console.log(`👋 Player ${leavingPlayer.name} left room: ${id}`);

    const updatedPlayers = room.players.filter(p => p.id !== playerId);

    // 如果房间空了，从数据库中删除
    if (updatedPlayers.length === 0) {
      // 离开的玩家也要更新 user 表
      if (leavingPlayer.userId) {
        await updateUserRoom(leavingPlayer.userId, null);
      }
      await deleteRoomFromDb(id);
      console.log(`💨 Room ${id} is empty and has been deleted.`);
      return { updatedRoom: { ...room, players: [] } };
    }

    const updatedRoom: Room = { ...room, players: updatedPlayers };
    
    // 如果离开的是房主，需要重新选举房主
    if (room.hostUserId === leavingPlayer.userId && updatedPlayers.length > 0) {
      const newHost = updatedPlayers[0];
      if (newHost?.userId) {
        updatedRoom.hostUserId = newHost.userId; // 将房主转移给下一个人
        console.log(`👑 Host changed to ${newHost.name} in room ${id}`);
      }
    }

    await saveRoomToDb(id, updatedRoom as any);
    
    // 更新离开玩家的当前房间
    if (leavingPlayer.userId) {
      await updateUserRoom(leavingPlayer.userId, null);
    }

    return { updatedRoom };
}

/**
 * 处理玩家断开连接
 * @param socketId 断开连接的 socket.id
 * @param roomId 房间 ID
 * @returns {Promise<Room | null>} 更新后的房间信息或 null
 */
export async function handlePlayerDisconnect(socketId: string, id: string): Promise<Room | null> {
  const room = await getRoom(id);
  if (!room) return null;

  const player = room.players.find(p => p.id === socketId);
  if (!player) return null; // 该 socketId 可能已经因为重连被替换了，所以找不到是正常的

  console.log(`🔌 Player ${player.name} in room ${id} disconnected.`);

  const updatedPlayers = room.players.map(p =>
    p.id === socketId ? { ...p, isConnected: false } : p
  );

  const updatedRoom: Room = { ...room, players: updatedPlayers };
  await saveRoomToDb(id, updatedRoom as any);
  
  return updatedRoom;
}

/**
 * 更新指定房间的游戏状态
 * @param roomId 房间号
 * @param newGameState 新的游戏状态
 * @returns {Promise<Room | null>} 更新后的房间信息
 */
export async function updateGameState(id: string, newGameState: GameState): Promise<Room | null> {
  const room = await getRoom(id);
  if (room) {
    const updatedRoom: Room = { ...room, gameState: newGameState };
    await saveRoomToDb(id, updatedRoom as any);
    return updatedRoom;
  }
  return null;
}

/**
 * 更新并保存整个房间对象
 * @param room 完整的房间对象
 * @returns {Promise<Room>} 更新后的房间对象
 */
export async function updateRoom(room: Room): Promise<Room> {
  await saveRoomToDb(room.id, room as any);
  return room;
}

/**
 * 结算当前局并进入下一局
 * @param roomId 房间ID
 * @returns {Promise<Room | null>} 更新后的房间信息
 */
export async function goToNextRound(id: string): Promise<Room | null> {
  const room = await getRoom(id);
  if (!room) return null;

  const prevGameState = room.gameState;

  // 如果当前局没有事件，只增加局数
  if ((prevGameState.currentRoundEvents || []).length === 0) {
    const newGameState: GameState = {
      ...prevGameState,
      currentRound: prevGameState.currentRound + 1,
    };
    return updateGameState(id, newGameState);
  }

  // 结算分数
  const settledPlayers = settleCurrentRound(prevGameState.players);
  
  // 创建历史记录
  const roundHistory = {
    roundNumber: prevGameState.currentRound,
    events: [...(prevGameState.currentRoundEvents || [])],
    finalScores: prevGameState.players.map(p => ({ playerId: p.id, score: p.currentRoundScore })),
    timestamp: Date.now()
  };

  // 构造新的游戏状态
  const newGameState: GameState = {
    ...prevGameState,
    players: settledPlayers,
    currentRoundEvents: [],
    roundHistory: [...prevGameState.roundHistory, roundHistory],
    currentRound: prevGameState.currentRound + 1
  };
  
  return updateGameState(id, newGameState);
}

/**
 * 结束并删除一个房间
 * @param roomId 房间ID
 * @returns {Promise<void>}
 */
export async function endGameAndDeleteRoom(id: string): Promise<void> {
  const room = await getRoom(id);
  if (room && room.players) {
    // 将所有仍在房间内的玩家的 currentRoomId 设为 null
    const userIds = room.players.map(p => p.userId).filter(Boolean) as string[];
    await Promise.all(userIds.map(uid => updateUserRoom(uid, null)));
  }
  await deleteRoomFromDb(id);
  console.log(`💥 Room ${id} ended and deleted by host.`);
}

/**
 * 获取所有活跃房间的简化信息，用于大厅展示
 * @returns {Promise<LobbyRoomInfo[]>}
 */
export async function getLobbyInfo(): Promise<LobbyRoomInfo[]> {
  // gameState 字段中存储了完整的 Room 对象，所以这个类型转换是安全的
  const allRooms = await getAllRooms() as unknown as Room[];
  if (!allRooms) {
    return [];
  }

  const lobbyInfo = allRooms.map(room => {
    const hostPlayer = room.players.find(p => p.userId === room.hostUserId);
    return {
      id: room.id,
      hostName: hostPlayer?.name || '未知',
      playerCount: room.players.length,
      isGameStarted: room.gameState.currentRoundEvents.length > 0 || room.gameState.roundHistory.length > 0,
    };
  });

  return lobbyInfo;
}