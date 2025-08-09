import { useState, useEffect } from 'react';
import type { Player } from '../types/mahjong';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ScoreBoardProps {
  players: Player[];
}

export default function ScoreBoard({ players }: ScoreBoardProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // 从localStorage读取折叠状态，默认展开
    const saved = localStorage.getItem('scoreboard-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // 保存折叠状态到localStorage
  useEffect(() => {
    localStorage.setItem('scoreboard-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const totalScore = players.reduce((sum, player) => sum + player.score, 0);

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
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🏆</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">分数排行榜</h2>
          {!isCollapsed && players.length > 0 && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {players.length}人
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCollapsed && players.length > 0 && (
            <div className="text-sm text-gray-600">
              总分: <span className={`font-semibold ${totalScore === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalScore > 0 ? '+' : ''}{totalScore}
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
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <p className="text-gray-500 text-lg">暂无玩家数据</p>
              <p className="text-gray-400 text-sm mt-1">添加玩家开始游戏</p>
            </div>
          ) : (
            <div className="space-y-4">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${index === 0
                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-lg shadow-yellow-500/20'
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
                      {player.score > 0 ? '领先' : player.score < 0 ? '落后' : '平手'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-2xl font-bold ${player.score > 0 ? 'text-green-600' :
                      player.score < 0 ? 'text-red-600' :
                        'text-gray-600'
                    }`}>
                    {player.score > 0 ? '+' : ''}{player.score}
                  </div>
                  <div className="text-sm text-gray-500">分数</div>
                </div>
              </div>

              {/* 进度条 */}
              {players.length > 1 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${player.score > 0 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                          player.score < 0 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                            'bg-gradient-to-r from-gray-400 to-gray-600'
                        }`}
                      style={{
                        width: `${Math.max(10, Math.min(100, Math.abs(player.score / Math.max(...sortedPlayers.map(p => Math.abs(p.score)))) * 100))}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 总分统计 */}
          <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚖️</span>
                <span className="font-semibold text-gray-700">总分平衡</span>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${totalScore === 0 ? 'text-green-600' :
                    'text-red-600'
                  }`}>
                  {totalScore > 0 ? '+' : ''}{totalScore}
                </div>
                <div className="text-xs text-gray-500">
                  {totalScore === 0 ? '平衡' : '不平衡'}
                </div>
              </div>
            </div>

            {totalScore !== 0 && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                💡 提示：正常情况下总分应该为0，当前不平衡可能是计分错误
              </div>
            )}
          </div>

          {/* 游戏统计 */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="text-2xl font-bold text-blue-600">{players.length}</div>
              <div className="text-sm text-blue-600">参与玩家</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <div className="text-2xl font-bold text-purple-600">
                {Math.max(...sortedPlayers.map(p => Math.abs(p.score)), 0)}
              </div>
              <div className="text-sm text-purple-600">最高分差</div>
            </div>
          </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}