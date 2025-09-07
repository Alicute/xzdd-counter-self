import { useState, useEffect } from 'react';
import type { Player } from '../types/mahjong';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface CurrentRoundBoardProps {
  players: Player[];
  currentRound: number;
}

export default function CurrentRoundBoard({ players, currentRound }: CurrentRoundBoardProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const sortedPlayers = [...players].sort((a, b) => b.currentRoundScore - a.currentRoundScore);
  const totalCurrentScore = players.reduce((sum, player) => sum + player.currentRoundScore, 0);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🎖️';
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'from-yellow-400 to-yellow-600';
      case 1: return 'from-gray-400 to-gray-600';
      case 2: return 'from-orange-400 to-orange-600';
      default: return 'from-purple-400 to-purple-600';
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
      {/* 可点击的标题栏 */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/40 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🎯</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">当前局计分</h2>
            <p className="text-sm text-gray-600">第 {currentRound} 局</p>
          </div>
          {!isCollapsed && players.length > 0 && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {players.length}人
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCollapsed && players.length > 0 && (
            <div className="text-sm text-gray-600">
              平衡: <span className={`font-semibold ${totalCurrentScore === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalCurrentScore > 0 ? '+' : ''}{totalCurrentScore}
              </span>
            </div>
          )}
          <div className="w-5 h-5 text-gray-500">
            {isCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
          </div>
        </div>
      </div>

      {/* 可折叠的内容 */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isCollapsed ? 'max-h-0' : 'max-h-[2000px]'
      }`}>
        <div className="px-6 pb-6">
          {players.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-gray-500">暂无玩家数据</p>
              <p className="text-gray-400 text-sm mt-1">添加玩家开始游戏</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] ${index === 0
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg shadow-green-500/20'
                      : 'bg-gradient-to-r from-white to-gray-50 border-gray-200 hover:shadow-md'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getRankColor(index)} flex items-center justify-center text-white font-bold shadow-lg`}>
                        <span className="text-lg">{getRankIcon(index)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 text-lg">{player.name}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          本局{player.currentRoundScore > 0 ? '领先' : player.currentRoundScore < 0 ? '落后' : '平局'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-2xl font-bold ${player.currentRoundScore > 0 ? 'text-green-600' :
                          player.currentRoundScore < 0 ? 'text-red-600' :
                            'text-gray-600'
                        }`}>
                        {player.currentRoundScore > 0 ? '+' : ''}{player.currentRoundScore}
                      </div>
                      <div className="text-sm text-gray-500">本局分数</div>
                    </div>
                  </div>

                  {/* 进度条 */}
                  {players.length > 1 && Math.max(...sortedPlayers.map(p => Math.abs(p.currentRoundScore))) > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${player.currentRoundScore > 0 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                              player.currentRoundScore < 0 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                                'bg-gradient-to-r from-gray-400 to-gray-600'
                            }`}
                          style={{
                            width: `${Math.max(5, Math.min(100, Math.abs(player.currentRoundScore / Math.max(...sortedPlayers.map(p => Math.abs(p.currentRoundScore)))) * 100))}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 当前局统计 */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚖️</span>
                    <span className="font-semibold text-blue-700">本局平衡</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${totalCurrentScore === 0 ? 'text-green-600' :
                        'text-red-600'
                      }`}>
                      {totalCurrentScore > 0 ? '+' : ''}{totalCurrentScore}
                    </div>
                    <div className="text-xs text-blue-600">
                      {totalCurrentScore === 0 ? '平衡' : '不平衡'}
                    </div>
                  </div>
                </div>

                {totalCurrentScore !== 0 && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    💡 提示：正常情况下本局分数应该平衡为0
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}