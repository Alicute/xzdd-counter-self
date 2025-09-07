import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';
import type { Room } from '../types/room';
import type { User } from '../types/user';
import type { LobbyRoomInfo } from '../types/lobby';

interface RoomManagerProps {
  room: Room | null;
  error: string | null;
  currentUser: User;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onLogout: () => void;
}

export default function RoomManager({ room, error, currentUser, onCreateRoom, onJoinRoom, onLogout }: RoomManagerProps) {
  const [roomId, setRoomId] = useState('');
  const [lobbyInfo, setLobbyInfo] = useState<LobbyRoomInfo[]>([]);

  useEffect(() => {
    // 当我们不在房间里时，我们就在大厅里
    if (!room) {
      console.log('🏛️ Entering lobby...');
      socketService.enterLobby();
      socketService.onLobbyUpdate(setLobbyInfo);

      // 组件卸载或进入房间时离开大厅
      return () => {
        console.log('🚪 Leaving lobby...');
        socketService.leaveLobby();
        // 只清理大厅的监听器，避免移除App.tsx中注册的全局监听器
        socketService.cleanupLobbyListeners();
      };
    }
  }, [room]); // 依赖 room 状态

  // RoomManager 现在只负责显示创建/加入界面，房间内的视图已移至 App.tsx
  return (
    <div className="w-full h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：创建/加入 */}
        <div className="bg-white rounded-lg shadow-md p-8">
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

          <div className="space-y-4">
            <button
              onClick={onCreateRoom}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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

        {/* 右侧：活跃房间列表 */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6">活跃房间</h2>
          <div className="h-64 overflow-y-auto pr-2">
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
      </div>
    </div>
  );
}