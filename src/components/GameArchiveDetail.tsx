import React, { useState } from 'react';
import type { GameArchive } from '../types/archive';
import type { GameEvent } from '../types/mahjong'; // 引入 GameEvent 类型

interface GameArchiveDetailProps {
  archive: GameArchive;
}

const GameArchiveDetail: React.FC<GameArchiveDetailProps> = ({ archive }) => {
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({});

  const toggleRound = (roundNumber: number) => {
    setExpandedRounds(prev => ({
      ...prev,
      [roundNumber]: !prev[roundNumber]
    }));
  };

  // 根据事件类型获取 Tailwind CSS 颜色类
  const getEventColor = (event: GameEvent) => {
    if (event.description.includes('转移')) {
      return 'bg-yellow-500/20 text-yellow-300';
    }
    switch (event.type) {
      case 'dian_pao_hu':
      case 'hu_pai':
        return 'bg-green-500/20 text-green-300';
      case 'gang':
        return 'bg-blue-500/20 text-blue-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="text-white space-y-6">
      {/* 基础信息 */}
      <div className="bg-gray-700/50 p-4 rounded-lg">
        <h4 className="text-lg font-bold mb-2">对局概览</h4>
        <p><span className="font-semibold">房间号:</span> {archive.id}</p>
        <p><span className="font-semibold">结束时间:</span> {new Date(archive.endedAt).toLocaleString()}</p>
        <div className="mt-2">
          <p className="font-semibold">游戏设置:</p>
          <ul className="list-disc list-inside text-sm pl-2">
            <li>封顶番数: {archive.settings.maxFan === 0 ? '不封顶' : `${archive.settings.maxFan}番`}</li>
            <li>价格: {archive.settings.pricePerFan}元/番</li>
            <li>是否启用呼叫转移: {archive.settings.callTransfer ? '是' : '否'}</li>
          </ul>
        </div>
      </div>

      {/* 玩家最终得分 */}
      <div className="bg-gray-700/50 p-4 rounded-lg">
        <h4 className="text-lg font-bold mb-2">最终得分</h4>
        <ul className="space-y-1">
          {archive.players.map(player => (
            <li key={player.userId} className="flex justify-between">
              <span>{player.name}</span>
              <span className={`font-semibold ${player.finalScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {player.finalScore}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 对局历史 */}
      <div className="bg-gray-700/50 p-4 rounded-lg">
        <h4 className="text-lg font-bold mb-2">各局详情</h4>
        <div className="space-y-2">
          {archive.gameHistory.map(round => (
            <div key={round.round} className="bg-gray-600/50 rounded-md overflow-hidden">
              <button
                onClick={() => toggleRound(round.round)}
                className="w-full text-left p-3 font-semibold flex justify-between items-center hover:bg-gray-600/70 transition-colors"
              >
                <span>第 {round.round} 局</span>
                <span className={`transform transition-transform duration-200 ${expandedRounds[round.round] ? 'rotate-180' : 'rotate-0'}`}>
                  ▼
                </span>
              </button>
              {expandedRounds[round.round] && (
                <div className="p-3 border-t border-gray-500/50">
                   <ul className="space-y-2">
                    {round.events.map((event: GameEvent) => (
                      <li key={event.id} className={`p-2 rounded-md text-sm ${getEventColor(event)}`}>
                        {event.description}
                      </li>
                    ))}
                  </ul>
                  {round.events.length === 0 && <p className="text-gray-400">该局没有事件记录。</p>}
                </div>
              )}
            </div>
          ))}
          {archive.gameHistory.length === 0 && (
            <p className="text-gray-400 text-center py-4">这场对局没有完整的历史记录。</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameArchiveDetail;
