import { useState, memo, useCallback } from 'react';
import type { Player } from '../types/mahjong';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface PlayerManagerProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
}

function PlayerManager({ players, onPlayersChange }: PlayerManagerProps) {
  const [newPlayerName, setNewPlayerName] = useState('');

  const addPlayer = useCallback(() => {
    if (newPlayerName.trim()) {
      const newPlayer: Player = {
        id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newPlayerName.trim(),
        score: 0,
      };
      onPlayersChange([...players, newPlayer]);
      setNewPlayerName('');
    }
  }, [newPlayerName, players, onPlayersChange]);

  const removePlayer = useCallback((playerId: string) => {
    onPlayersChange(players.filter(p => p.id !== playerId));
  }, [players, onPlayersChange]);

  const resetScores = useCallback(() => {
    onPlayersChange(players.map(p => ({ ...p, score: 0 })));
  }, [players, onPlayersChange]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">👥</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800">玩家管理</h2>
      </div>

      {/* 添加玩家 */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="输入玩家姓名"
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 placeholder-gray-400"
          onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
        />
        <button
          onClick={addPlayer}
          disabled={!newPlayerName.trim()}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/25"
        >
          <PlusIcon className="w-4 h-4" />
          添加
        </button>
      </div>

      {/* 玩家列表 */}
      <div className="space-y-3 mb-6">
        {players.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">😊</span>
            </div>
            <p className="text-gray-500">还没有玩家，请先添加玩家</p>
          </div>
        ) : (
          players.map((player, index) => (
            <div key={player.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                  index === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    index === 2 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                      'bg-gradient-to-r from-purple-500 to-purple-600'
                  }`}>
                  {player.name.charAt(0)}
                </div>
                <div>
                  <span className="font-semibold text-gray-800">{player.name}</span>
                  <div className={`text-lg font-bold ${player.score > 0 ? 'text-green-600' :
                    player.score < 0 ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                    {player.score > 0 ? '+' : ''}{player.score} 分
                  </div>
                </div>
              </div>
              <button
                onClick={() => removePlayer(player.id)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 重置分数按钮 */}
      {players.length > 0 && (
        <button
          onClick={resetScores}
          className="w-full px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-medium shadow-lg shadow-gray-500/25"
        >
          🔄 重置所有分数
        </button>
      )}
    </div>
  );
}

export default memo(PlayerManager);