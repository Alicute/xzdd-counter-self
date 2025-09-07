import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';
import type { Room } from '../types/room';
import type { User } from '../types/user';
import type { LobbyRoomInfo } from '../types/lobby';
import type { GameSettings } from '../types/mahjong';
import SettingsManager from './SettingsManager'; // 引入 SettingsManager 以复用UI
import GameHistoryPanel from './GameHistoryPanel'; // 引入牌局历史组件

interface RoomManagerProps {
  room: Room | null;
  error: string | null;
  currentUser: User;
  onCreateRoom: (settings: GameSettings) => void; // 更新类型
  onJoinRoom: (roomId: string) => void;
  onLogout: () => void;
  historyRefreshCounter: number;
}

export default function RoomManager({ room, error, currentUser, onCreateRoom, onJoinRoom, onLogout, historyRefreshCounter }: RoomManagerProps) {
  const [roomId, setRoomId] = useState('');
  const [lobbyInfo, setLobbyInfo] = useState<LobbyRoomInfo[]>([]);
  
  // 为房间设置添加状态
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    maxFan: 4,
    callTransfer: true,
    pricePerFan: 1, // 默认1分/元
  });

  useEffect(() => {
    if (!room) {
      console.log('🏛️ Entering lobby...');
      socketService.enterLobby();
      socketService.onLobbyUpdate(setLobbyInfo);

      return () => {
        console.log('🚪 Leaving lobby...');
        socketService.leaveLobby();
        socketService.cleanupLobbyListeners();
      };
    }
  }, [room]);

  return (
    <div className="w-full h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：创建/加入 */}
        <div className="bg-white rounded-lg shadow-md p-8 lg:col-span-1">
          <h2 className="text-2xl font-bold text-center mb-6">加入联机对战</h2>
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">欢迎你, <span className="font-bold">{currentUser.username}</span>!</p>
            <button
                onClick={onLogout}
                className="px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
                退出登录
            </button>
          </div>

          {/* 新增：房间设置 */}
          <div className="border-t border-b py-6 my-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">创建房间设置</h3>
            <SettingsManager settings={gameSettings} onSettingsChange={setGameSettings} />
          </div>

          <div className="space-y-4">
            <button
              onClick={() => onCreateRoom(gameSettings)} // 传递设置
              className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all shadow-lg shadow-green-500/50"
            >
              创建新房间
            </button>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="输入4位房间号"
              />
              <button
                onClick={() => onJoinRoom(roomId)}
                disabled={roomId.length !== 4}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50 flex-shrink-0"
              >
                加入房间
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        </div>

        {/* 中间：活跃房间列表 */}
        <div className="bg-white rounded-lg shadow-md p-8 lg:col-span-1">
          <h2 className="text-2xl font-bold text-center mb-6">活跃房间</h2>
          <div className="h-96 overflow-y-auto pr-2">
            {lobbyInfo.length > 0 ? (
              <ul className="space-y-3">
                {lobbyInfo.map((room) => (
                  <li key={room.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold">房间号: {room.id}</p>
                      <p className="text-sm text-gray-500">房主: {room.hostName} ({room.playerCount}/4)</p>
                    </div>
                    <button
                      onClick={() => onJoinRoom(room.id)}
                      disabled={room.isGameStarted || room.playerCount >= 4}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {room.isGameStarted ? '进行中' : (room.playerCount >= 4 ? '已满' : '加入')}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-500 pt-16">
                <p>当前没有活跃的房间</p>
                <p className="text-sm">快去创建一个吧！</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：牌局历史 */}
        <div className="bg-gray-900 text-white rounded-lg shadow-md p-6 lg:col-span-1">
            <GameHistoryPanel key={historyRefreshCounter} />
        </div>
      </div>
    </div>
  );
}