import { useState } from 'react';
import { FanType, WinType, GangType } from '../types/mahjong';
import type { Player, GameSettings, GameEvent } from '../types/mahjong';
import { createWinEvent, createGangEvent, FAN_SCORE_MAP, calculateScoreFromFan, calculateTotalFan } from '../utils/mahjongCalculator';

interface EventAdderProps {
  players: Player[];
  settings: GameSettings;
  onEventAdd: (event: GameEvent) => void;
}

export default function EventAdder({ players, settings, onEventAdd }: EventAdderProps) {
  const [eventType, setEventType] = useState<'win' | 'gang'>('win');
  const [winnerId, setWinnerId] = useState('');
  const [loserIds, setLoserIds] = useState<string[]>([]);
  const [selectedFanTypes, setSelectedFanTypes] = useState<FanType[]>([]);
  const [gangCount, setGangCount] = useState<number>(0);
  const [winType, setWinType] = useState<WinType>(WinType.ZI_MO);
  const [gangType, setGangType] = useState<GangType>(GangType.AN_GANG);
  const [gangTargetIds, setGangTargetIds] = useState<string[]>([]);

  const handleAddEvent = () => {
    if (!winnerId) return;

    let event;
    if (eventType === 'win') {
      if (loserIds.length === 0) return;
      event = createWinEvent(winnerId, loserIds, selectedFanTypes, gangCount, winType, settings, players.length);
    } else {
      if (gangTargetIds.length === 0) return;
      event = createGangEvent(winnerId, gangType, settings, gangTargetIds);
    }

    onEventAdd(event);

    // 重置表单
    setWinnerId('');
    setLoserIds([]);
    setSelectedFanTypes([]);
    setGangCount(0);
    setGangTargetIds([]);
  };

  const toggleLoser = (playerId: string) => {
    if (loserIds.includes(playerId)) {
      setLoserIds(loserIds.filter(id => id !== playerId));
    } else {
      setLoserIds([...loserIds, playerId]);
    }
  };

  const toggleGangTarget = (playerId: string) => {
    if (gangTargetIds.includes(playerId)) {
      setGangTargetIds(gangTargetIds.filter(id => id !== playerId));
    } else {
      setGangTargetIds([...gangTargetIds, playerId]);
    }
  };

  const toggleFanType = (fanType: FanType, category: 'base' | 'extra') => {
    if (category === 'base') {
      // 基础番型：单选逻辑
      const baseFanTypes = [FanType.XIAO_HU, FanType.DA_DUI_ZI, FanType.JIN_GOU_DIAO, FanType.XIAO_QI_DUI, FanType.LONG_QI_DUI, FanType.QING_YI_SE];
      const newSelectedTypes = selectedFanTypes.filter(type => !baseFanTypes.includes(type));
      setSelectedFanTypes([...newSelectedTypes, fanType]);
    } else {
      // 额外番型：多选逻辑
      if (selectedFanTypes.includes(fanType)) {
        setSelectedFanTypes(selectedFanTypes.filter(type => type !== fanType));
      } else {
        setSelectedFanTypes([...selectedFanTypes, fanType]);
      }
    }
  };

  // 定义基础番型和额外番型
  const baseFanTypes = [FanType.XIAO_HU, FanType.DA_DUI_ZI, FanType.JIN_GOU_DIAO, FanType.XIAO_QI_DUI, FanType.LONG_QI_DUI, FanType.QING_YI_SE];
  const extraFanTypes = [FanType.GANG_SHANG_HUA, FanType.GANG_SHANG_PAO, FanType.HAI_DI_LAO];

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-shadow duration-300">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🎯</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">添加牌局事件</h2>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* 顶部：基本信息 - 横向排列 */}
        <div className="space-y-4 sm:space-y-6 mb-6">
          {/* 事件类型和玩家选择 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 事件类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                事件类型
              </label>
              <div className="flex gap-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="win"
                    checked={eventType === 'win'}
                    onChange={(e) => setEventType(e.target.value as 'win' | 'gang')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium">胡牌</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="gang"
                    checked={eventType === 'gang'}
                    onChange={(e) => setEventType(e.target.value as 'win' | 'gang')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium">杠牌</span>
                </label>
              </div>
            </div>

            {/* 获胜者选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {eventType === 'win' ? '胡牌玩家' : '杠牌玩家'}
              </label>
              <select
                value={winnerId}
                onChange={(e) => setWinnerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择玩家</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 胡牌方式（仅胡牌事件） */}
            {eventType === 'win' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  胡牌方式
                </label>
                <div className="flex gap-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value={WinType.ZI_MO}
                      checked={winType === WinType.ZI_MO}
                      onChange={(e) => setWinType(e.target.value as WinType)}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm font-medium">自摸</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value={WinType.DIAN_PAO}
                      checked={winType === WinType.DIAN_PAO}
                      onChange={(e) => setWinType(e.target.value as WinType)}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm font-medium">点炮</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 失败者选择（仅胡牌事件）*/}
          {eventType === 'win' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                失败者（输家）
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {players.map(player => (
                  <label key={player.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    loserIds.includes(player.id)
                      ? 'bg-red-50 border-red-200'
                      : player.id === winnerId
                        ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="checkbox"
                      checked={loserIds.includes(player.id)}
                      onChange={() => toggleLoser(player.id)}
                      disabled={player.id === winnerId}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className={`ml-2 text-sm ${
                      player.id === winnerId ? 'text-gray-400' : 'text-gray-900'
                    }`}>{player.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 杠牌目标选择（仅杠牌事件）*/}
          {eventType === 'gang' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  杠牌类型
                </label>
                <select
                  value={gangType}
                  onChange={(e) => setGangType(e.target.value as GangType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={GangType.AN_GANG}>暗杠</option>
                  <option value={GangType.BA_GANG}>巴杠</option>
                  <option value={GangType.DIAN_GANG}>点杠</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  被杠玩家
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {players.map(player => (
                    <label key={player.id} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                      gangTargetIds.includes(player.id)
                        ? 'bg-blue-50 border-blue-200'
                        : player.id === winnerId
                          ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}>
                      <input
                        type="checkbox"
                        checked={gangTargetIds.includes(player.id)}
                        onChange={() => toggleGangTarget(player.id)}
                        disabled={player.id === winnerId}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`ml-2 text-sm ${
                        player.id === winnerId ? 'text-gray-400' : 'text-gray-900'
                      }`}>{player.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 中部：番型配置（仅胡牌事件）*/}
        {eventType === 'win' && (
          <div className="space-y-4 mb-6">
            {/* 基础番型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                基础番型（必选一个）
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 sm:max-h-56 lg:max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {baseFanTypes.map(fanType => (
                  <label key={fanType} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedFanTypes.includes(fanType)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      checked={selectedFanTypes.includes(fanType)}
                      onChange={() => toggleFanType(fanType, 'base')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm flex-1">
                      {fanType} ({FAN_SCORE_MAP[fanType]}番)
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 额外番型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                额外番型（可选多个）
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {extraFanTypes.map(fanType => (
                  <label key={fanType} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedFanTypes.includes(fanType)
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="checkbox"
                      checked={selectedFanTypes.includes(fanType)}
                      onChange={() => toggleFanType(fanType, 'extra')}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm">
                      {fanType} ({FAN_SCORE_MAP[fanType]}番)
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 杠牌加番 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  杠牌数量（每杠+1番）
                </label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={gangCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 0;
                    setGangCount(count);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* 番数预览 */}
              <div className="flex items-end">
                <div className="bg-gray-50 rounded-lg p-3 w-full">
                  <div className="text-sm text-gray-600">总番数预览</div>
                  <div className="text-lg font-bold text-blue-600">
                    {calculateTotalFan(selectedFanTypes, gangCount)}番
                    {settings.maxFan > 0 && calculateTotalFan(selectedFanTypes, gangCount) > settings.maxFan && 
                      ` → ${settings.maxFan}番（封顶）`
                    }
                  </div>
                  <div className="text-sm text-gray-500">
                    得分：{calculateScoreFromFan(
                      Math.min(
                        calculateTotalFan(selectedFanTypes, gangCount),
                        settings.maxFan || calculateTotalFan(selectedFanTypes, gangCount)
                      )
                    )}分{winType === WinType.ZI_MO ? '+1分' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 底部：操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleAddEvent}
            disabled={
              !winnerId || 
              (eventType === 'win' && loserIds.length === 0) ||
              (eventType === 'gang' && gangTargetIds.length === 0)
            }
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
              (!winnerId || 
               (eventType === 'win' && loserIds.length === 0) ||
               (eventType === 'gang' && gangTargetIds.length === 0))
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25'
            }`}
          >
            ✅ 添加事件
          </button>
          <button
            onClick={() => {
              setWinnerId('');
              setLoserIds([]);
              setSelectedFanTypes([]);
              setGangCount(0);
              setGangTargetIds([]);
            }}
            className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
          >
            🔄 重置
          </button>
        </div>
      </div>
    </div>
  );
}