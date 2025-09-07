import sqlite3 from 'sqlite3';
import { GameState } from '../types/mahjong';
import type { GameArchive } from '../types/archive';

// 类型定义
export interface User {
  id: string;
  username: string;
  createdAt: number;
  currentRoomId: string | null;
}

// 数据库文件路径
// 数据库文件路径，指向一个专门的 data 目录以便 Docker Volume 挂载
const DB_PATH = './data/mahjong_rooms.db';

// 创建并打开数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to the SQLite database.');
  }
});

/**
 * 初始化数据库，创建 rooms 表（如果不存在）
 */
export function initDb(): void {
  db.serialize(() => {
    const createRoomsTableSql = `
      CREATE TABLE IF NOT EXISTS rooms (
        roomId TEXT PRIMARY KEY,
        gameState TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );
    `;
    db.run(createRoomsTableSql, (err) => {
      if (err) {
        console.error('❌ Error creating rooms table:', err.message);
      } else {
        console.log('📖 `rooms` table is ready.');
      }
    });

    const createUsersTableSql = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        createdAt INTEGER NOT NULL,
        currentRoomId TEXT
      );
    `;
    db.run(createUsersTableSql, (err) => {
      if (err) {
        console.error('❌ Error creating users table:', err.message);
      } else {
        console.log('👤 `users` table is ready.');
      }
    });
  });

    const createArchivesTableSql = `
      CREATE TABLE IF NOT EXISTS game_archives (
        id TEXT PRIMARY KEY,
        endedAt INTEGER NOT NULL,
        hostUserId TEXT NOT NULL,
        players TEXT NOT NULL,
        gameHistory TEXT NOT NULL,
        settings TEXT NOT NULL
      );
    `;
    db.run(createArchivesTableSql, (err) => {
      if (err) {
        console.error('❌ Error creating game_archives table:', err.message);
      } else {
        console.log('📜 `game_archives` table is ready.');
      }
    });
}

/**
 * 从数据库获取一个房间的状态
 * @param roomId 房间ID
 * @returns Promise<GameState | null>
 */
export function getRoomFromDb(roomId: string): Promise<GameState | null> {
  return new Promise((resolve, reject) => {
    const sql = `SELECT gameState FROM rooms WHERE roomId = ?`;
    db.get(sql, [roomId], (err, row: { gameState: string }) => {
      if (err) {
        reject(err);
      }
      if (row) {
        resolve(JSON.parse(row.gameState));
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * 将房间状态保存或更新到数据库
 * @param roomId 房间ID
 * @param gameState 游戏状态
 */
export function saveRoomToDb(roomId: string, gameState: GameState): Promise<void> {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO rooms (roomId, gameState, createdAt)
      VALUES (?, ?, ?)
      ON CONFLICT(roomId) DO UPDATE SET
        gameState = excluded.gameState;
    `;
    const gameStateJson = JSON.stringify(gameState);
    const timestamp = Date.now();
    db.run(sql, [roomId, gameStateJson, timestamp], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * 从数据库中删除一个房间
 * @param roomId 房间ID
 */
export function deleteRoomFromDb(roomId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM rooms WHERE roomId = ?`;
    db.run(sql, [roomId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * 从数据库获取所有房间
 * @returns Promise<GameState[]>
 */
export function getAllRooms(): Promise<GameState[]> {
  return new Promise((resolve, reject) => {
    const sql = `SELECT gameState FROM rooms`;
    db.all(sql, [], (err, rows: { gameState: string }[]) => {
      if (err) {
        reject(err);
      }
      if (rows) {
        const rooms = rows.map(row => JSON.parse(row.gameState));
        resolve(rooms);
      } else {
        resolve([]);
      }
    });
  });
}

/**
 * 根据用户名查找用户
 * @param username 用户名
 */
export function findUserByUsername(username: string): Promise<User | null> {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE username = ?`;
    db.get(sql, [username], (err, row: User) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * 根据ID查找用户
 * @param userId 用户ID
 */
export function findUserById(userId: string): Promise<User | null> {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE id = ?`;
    db.get(sql, [userId], (err, row: User) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * 创建新用户
 * @param id 用户ID
 * @param username 用户名
 */
export function createUser(id: string, username: string): Promise<User> {
  return new Promise((resolve, reject) => {
    const newUser: User = {
      id,
      username,
      createdAt: Date.now(),
      currentRoomId: null,
    };
    const sql = `INSERT INTO users (id, username, createdAt, currentRoomId) VALUES (?, ?, ?, ?)`;
    db.run(sql, [newUser.id, newUser.username, newUser.createdAt, newUser.currentRoomId], function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(newUser);
      }
    });
  });
}

/**
 * 更新用户的当前房间号
 * @param userId 用户ID
 * @param roomId 房间ID，如果为 null 则表示离开房间
 */
export function updateUserRoom(userId: string, roomId: string | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE users SET currentRoomId = ? WHERE id = ?`;
    db.run(sql, [roomId, userId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * 获取一个用户的所有游戏归档
 * @param userId 用户ID
 */
export function getArchivesForUser(userId: string): Promise<GameArchive[]> {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM game_archives ORDER BY endedAt DESC`;
    db.all(sql, [], (err, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      if (rows) {
        const userArchives = rows
          .map(row => {
            try {
              const players = JSON.parse(row.players);
              // 先做第一层过滤，确保 players 字段有效且包含用户
              if (Array.isArray(players) && players.some((p: any) => p.userId === userId)) {
                 return { ...row, players };
              }
              return null;
            } catch (e) {
              console.error(`Could not parse players JSON for archive ${row.id}:`, row.players);
              return null;
            }
          })
          .filter(Boolean) // 过滤掉解析失败或不包含该用户的记录
          .map(archive => {
            try {
               return {
                ...archive,
                gameHistory: JSON.parse(archive.gameHistory),
                settings: JSON.parse(archive.settings),
              }
            } catch(e) {
              console.error(`Could not parse history/settings JSON for archive ${archive.id}`);
              return null;
            }
          })
          .filter(Boolean); // 再次过滤掉解析失败的记录

        resolve(userArchives as GameArchive[]);
      } else {
        resolve([]);
      }
    });
  });
}

/**
 * 保存一个游戏归档
 * @param archive 游戏归档对象
 */
export function saveGameArchive(archive: GameArchive): Promise<void> {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO game_archives (id, endedAt, hostUserId, players, gameHistory, settings)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    
    const playersJson = JSON.stringify(archive.players);
    const gameHistoryJson = JSON.stringify(archive.gameHistory);
    const settingsJson = JSON.stringify(archive.settings);

    db.run(sql, [archive.id, archive.endedAt, archive.hostUserId, playersJson, gameHistoryJson, settingsJson], (err) => {
      if (err) {
        console.error('❌ Error saving game archive:', err.message);
        reject(err);
      } else {
        console.log(`📦 Game archive ${archive.id} saved.`);
        resolve();
      }
    });
  });
}