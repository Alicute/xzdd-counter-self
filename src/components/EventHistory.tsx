import { useState } from 'react';
import type { GameEvent, Player } from '../types/mahjong';
import { TrashIcon } from '@heroicons/react/24/outline';
import ConfirmDialog from './ConfirmDialog';

interface EventHistoryProps {
  events: GameEvent[];
  players: Player[];
  onEventRemove: (eventId: string) => void;
}

export default function EventHistory({ events, players, onEventRemove }: EventHistoryProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    eventId: string;
    eventDescription: string;
  }>({
    isOpen: false,
    eventId: '',
    eventDescription: ''
  });

  const handleDeleteClick = (event: GameEvent) => {
    setDeleteConfirm({
      isOpen: true,
      eventId: event.id,
      eventDescription: event.description
    });
  };

  const handleDeleteConfirm = () => {
    onEventRemove(deleteConfirm.eventId);
    setDeleteConfirm({ isOpen: false, eventId: '', eventDescription: '' });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, eventId: '', eventDescription: '' });
  };
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || '未知玩家';
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventIcon = (event: GameEvent) => {
    if (event.type === 'hu_pai') {
      return '🎯'; // 自摸
    } else if (event.type === 'dian_pao_hu') {
      return '🎪'; // 点炮胡牌
    } else {
      return '🀄'; // 杠牌
    }
  };

  const getEventColor = (event: GameEvent) => {
    if (event.type === 'hu_pai' || event.type === 'dian_pao_hu') {
      return event.score > 20 ? 'from-emerald-500 to-green-600' : 'from-blue-500 to-indigo-600';
    }
    return 'from-orange-500 to-red-600';
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">📜</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">事件历史</h2>
        </div>
        {events.length > 0 && (
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            共 {events.length} 条记录
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <p className="text-gray-500 text-lg">暂无事件记录</p>
          <p className="text-gray-400 text-sm mt-1">开始游戏后记录会显示在这里</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.slice().reverse().map((event, index) => (
            <div
              key={event.id}
              className="relative group p-4 bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* 事件图标 */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getEventColor(event)} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                    <span className="text-xl">{getEventIcon(event)}</span>
                  </div>

                  {/* 事件详情 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-800">
                        {getPlayerName(event.winnerId)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTime(event.timestamp)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        event.type === 'hu_pai' ? 'bg-green-100 text-green-800' : 
                        event.type === 'dian_pao_hu' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {event.type === 'hu_pai' ? '自摸' : 
                         event.type === 'dian_pao_hu' ? '点炮' : '杠牌'}
                      </span>
                    </div>

                    {/* 详细描述 */}
                    <div className="text-sm text-gray-600 mb-2">
                      {event.description}
                    </div>

                    {/* 分数变化 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">得分:</span>
                      <span className={`font-bold text-lg ${event.score > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        +{event.score}
                      </span>
                    </div>

                    {/* 涉及玩家 */}
                    {event.loserIds && event.loserIds.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        影响玩家: {event.loserIds.map(id => getPlayerName(id)).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => handleDeleteClick(event)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                  title="删除此记录"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>

              {/* 序号 */}
              <div className="absolute -left-2 -top-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                {events.length - index}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 统计信息 */}
      {events.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="text-lg font-bold text-green-600">
                {events.filter(e => e.type === 'hu_pai' || e.type === 'dian_pao_hu').length}
              </div>
              <div className="text-xs text-green-600">胡牌次数</div>
            </div>
            <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
              <div className="text-lg font-bold text-orange-600">
                {events.filter(e => e.type === 'gang').length}
              </div>
              <div className="text-xs text-orange-600">杠牌次数</div>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="text-lg font-bold text-blue-600">
                {Math.max(...events.map(e => e.score), 0)}
              </div>
              <div className="text-xs text-blue-600">最高得分</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="删除事件确认"
        message={`您确定要删除这条事件记录吗？\n\n事件内容：${deleteConfirm.eventDescription}\n\n此操作无法撤销，删除后相关玩家的分数将会重新计算。`}
        type="warning"
        confirmText="确认删除"
      />
    </div>
  );
}