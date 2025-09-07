import { useState, useEffect, useCallback } from 'react';
import { FanType, GangType } from '../types/mahjong';
import type { GameState, GameEvent } from '../types/mahjong';
import { createZiMoEvent, createDianPaoEvent, createGangEvent, FAN_SCORE_MAP, calculateScoreFromFan, calculateTotalFan } from '../utils/mahjongCalculator';
import { socketService } from '../services/socketService';

interface EventAdderProps {
  gameState: GameState;
  onEventAdd: (event: GameEvent) => void;
  onNextRound: () => void;
  isHost: boolean;
  roomId: string | null;
  currentPlayerId?: string | null;
}

export default function EventAdder({ gameState, onEventAdd, onNextRound, isHost, roomId, currentPlayerId }: EventAdderProps) {
  const { players, settings, isGameFinished, currentRoundEvents, currentRound } = gameState;
  const [eventType, setEventType] = useState<'dian_pao_hu' | 'hu_pai' | 'gang'>('hu_pai');
  // winnerId is the primary actor for any event type (the one who hus or gangs)
  const [winnerId, setWinnerId] = useState('');
  const [loserIds, setLoserIds] = useState<string[]>([]);
  const [selectedFanTypes, setSelectedFanTypes] = useState<FanType[]>([]);
  const [gangCount, setGangCount] = useState<number>(0);
  const [gangType, setGangType] = useState<GangType>(GangType.AN_GANG);
  const [gangTargetIds, setGangTargetIds] = useState<string[]>([]);

  const isOnlineMode = !!currentPlayerId;

  // Centralized form reset logic. This is the core fix.
  const resetForm = useCallback(() => {
    // In online mode, always reset the primary actor to the current user.
    // In local mode, clear the selection to allow choosing any player.
    setWinnerId(isOnlineMode ? currentPlayerId! : '');
    
    // Clear all other selections
    setLoserIds([]);
    setSelectedFanTypes([]);
    setGangCount(0);
    setGangTargetIds([]);
    setGangType(GangType.AN_GANG); // Reset gang type to default
  }, [isOnlineMode, currentPlayerId]);


  const handleAddEvent = () => {
    if (!winnerId) return;

    let event;
    if (eventType === 'hu_pai') {
      if (loserIds.length === 0) return;
      const activePlayers = [winnerId, ...loserIds];
      event = createZiMoEvent(winnerId, activePlayers, selectedFanTypes, gangCount, settings);
    } else if (eventType === 'dian_pao_hu') {
      if (loserIds.length !== 1) return;
      event = createDianPaoEvent(winnerId, loserIds[0], selectedFanTypes, gangCount, settings);
    } else { // 'gang'
      // The logic for who to select as target is complex in Bloodshed Mahjong,
      // so we trust the user's multi-selection.
      if (gangTargetIds.length === 0) return;
      event = createGangEvent(winnerId, gangType, settings, gangTargetIds);
    }

    onEventAdd(event);
    
    // Use the new centralized reset function
    resetForm();
  };

  const toggleLoser = (playerId: string) => {
    if (eventType === 'dian_pao_hu') {
      setLoserIds(prev => (prev.includes(playerId) ? [] : [playerId]));
    } else {
       if (loserIds.includes(playerId)) {
        setLoserIds(loserIds.filter(id => id !== playerId));
      } else {
        setLoserIds([...loserIds, playerId]);
      }
    }
  };

  // Reverted to original multi-select logic as requested.
  const toggleGangTarget = (playerId: string) => {
    // 根据用户的新反馈，当是点杠时，采用强制单选逻辑
    if (gangType === GangType.DIAN_GANG) {
      setGangTargetIds(prev => (prev.includes(playerId) ? [] : [playerId]));
    } else {
      // 暗杠和巴杠保持允许多选（例如为了支持血战到底刮风下雨）
      if (gangTargetIds.includes(playerId)) {
        setGangTargetIds(gangTargetIds.filter(id => id !== playerId));
      } else {
        setGangTargetIds([...gangTargetIds, playerId]);
      }
    }
  };

  const toggleFanType = (fanType: FanType) => {
    if (selectedFanTypes.includes(fanType)) {
      setSelectedFanTypes(selectedFanTypes.filter(type => type !== fanType));
    } else {
      setSelectedFanTypes([...selectedFanTypes, fanType]);
    }
  };
 
  // Effect to automatically set the actor in online mode when component loads or mode changes.
  useEffect(() => {
    if (isOnlineMode) {
      setWinnerId(currentPlayerId!);
    } else {
      setWinnerId('');
    }
  }, [isOnlineMode, currentPlayerId]);

  // All fan types list
  const allFanTypes = [
    FanType.XIAO_HU,
    FanType.DA_DUI_ZI,
    FanType.JIN_GOU_DIAO,
    FanType.XIAO_QI_DUI,
    FanType.LONG_QI_DUI,
    FanType.QING_YI_SE,
    FanType.GANG_SHANG_HUA,
    FanType.GANG_SHANG_PAO,
    FanType.HAI_DI_LAO
  ];
 
  const isActorSelectionDisabled = isOnlineMode;

  const isFormInvalid = (() => {
    if (!winnerId) return true;
    if (eventType === 'hu_pai') return loserIds.length === 0;
    if (eventType === 'dian_pao_hu') return loserIds.length !== 1;
    if (eventType === 'gang') {
      // 用户需求：点杠的目标必须是1个人
      if (gangType === GangType.DIAN_GANG) {
        return gangTargetIds.length !== 1;
      }
      // 暗杠和巴杠允许多个目标（例如，血战到底的刮风下雨），所以只需检查是否为空
      return gangTargetIds.length === 0;
    }
    return false;
  })();

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
        <div className="space-y-4 sm:space-y-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                事件类型
              </label>
              <div className="flex gap-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="hu_pai"
                    checked={eventType === 'hu_pai'}
                    onChange={(e) => {
                      setEventType(e.target.value as 'dian_pao_hu' | 'hu_pai' | 'gang');
                      setLoserIds([]);
                      setGangTargetIds([]);
                    }}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm font-medium">胡牌(自摸)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="dian_pao_hu"
                    checked={eventType === 'dian_pao_hu'}
                    onChange={(e) => {
                      setEventType(e.target.value as 'dian_pao_hu' | 'hu_pai' | 'gang');
                      setLoserIds([]);
                      setGangTargetIds([]);
                    }}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm font-medium">点炮胡牌</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="gang"
                    checked={eventType === 'gang'}
                    onChange={(e) => {
                      setEventType(e.target.value as 'dian_pao_hu' | 'hu_pai' | 'gang');
                      setLoserIds([]);
                      setGangTargetIds([]);
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium">杠牌</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {eventType === 'gang' ? '杠牌玩家' : '胡牌玩家'}
              </label>
              <select
                value={winnerId}
                onChange={(e) => {
                  setWinnerId(e.target.value);
                  setLoserIds([]);
                  setGangTargetIds([]);
                }}
                disabled={isActorSelectionDisabled}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm hover:border-gray-400 transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22/%3E%3C/svg%3E')] bg-[length:1.5rem_1.5rem] bg-[right_0.5rem_center] bg-no-repeat ${isActorSelectionDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">请选择玩家</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(eventType === 'hu_pai' || eventType === 'dian_pao_hu') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {eventType === 'hu_pai' ? '在场玩家（输家）' : '点炮者'}
                {!winnerId && (
                  <span className="text-xs text-orange-600 ml-2">请先选择胡牌玩家</span>
                )}
              </label>
              {eventType === 'dian_pao_hu' && loserIds.length !== 1 && winnerId && (
                <p className="text-xs text-red-500 mb-2 -mt-1">点炮只能选择一位玩家。</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {players.map(player => (
                  <label key={player.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    loserIds.includes(player.id)
                      ? 'bg-red-50 border-red-200'
                      : (player.id === winnerId)
                        ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                        : !winnerId
                          ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="checkbox"
                      checked={loserIds.includes(player.id)}
                      onChange={() => toggleLoser(player.id)}
                      disabled={(player.id === winnerId) || !winnerId}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className={`ml-2 text-sm ${
                       (player.id === winnerId) || !winnerId
                       ? 'text-gray-400' : 'text-gray-900'
                    }`}>{player.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {eventType === 'gang' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  杠牌类型
                </label>
                <select
                  value={gangType}
                  onChange={(e) => setGangType(e.target.value as GangType)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm hover:border-gray-400 transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22/%3E%3C/svg%3E')] bg-[length:1.5rem_1.5rem] bg-[right_0.5rem_center] bg-no-repeat"
                >
                  <option value={GangType.AN_GANG}>暗杠</option>
                  <option value={GangType.BA_GANG}>巴杠</option>
                  <option value={GangType.DIAN_GANG}>点杠</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  被杠玩家
                  {!winnerId && (
                    <span className="text-xs text-orange-600 ml-2">请先选择杠牌玩家</span>
                  )}
                </label>
                {eventType === 'gang' && gangType === GangType.DIAN_GANG && gangTargetIds.length !== 1 && winnerId && (
                  <p className="text-xs text-red-500 mb-2 -mt-2">点杠只能选择一位玩家。</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {players.map(player => (
                    <label key={player.id} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                      gangTargetIds.includes(player.id)
                        ? 'bg-blue-50 border-blue-200'
                        : player.id === winnerId
                          ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                          : !winnerId
                            ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}>
                      <input
                        type="checkbox"
                        checked={gangTargetIds.includes(player.id)}
                        onChange={() => toggleGangTarget(player.id)}
                        disabled={player.id === winnerId || !winnerId}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`ml-2 text-sm ${
                        player.id === winnerId || !winnerId ? 'text-gray-400' : 'text-gray-900'
                      }`}>{player.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {(eventType === 'hu_pai' || eventType === 'dian_pao_hu') && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                选择番型（可多选叠加）
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 sm:max-h-56 lg:max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {allFanTypes.map(fanType => (
                  <label key={fanType} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedFanTypes.includes(fanType)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="checkbox"
                      checked={selectedFanTypes.includes(fanType)}
                      onChange={() => toggleFanType(fanType)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm flex-1">
                      {fanType} ({FAN_SCORE_MAP[fanType]}番)
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  杠牌数量（每杠+1番）
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setGangCount(Math.max(0, gangCount - 1))}
                    disabled={gangCount <= 0}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <div className="flex-1 px-4 py-2 text-center font-medium text-gray-900 bg-white">
                    {gangCount}
                  </div>
                  <button
                    type="button"
                    onClick={() => setGangCount(Math.min(4, gangCount + 1))}
                    disabled={gangCount >= 4}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  最多4杠，每杠+1番
                </div>
              </div>
              
              <div className="flex items-end">
                <div className="bg-gray-50 rounded-lg p-4 w-full">
                  <div className="text-sm text-gray-600 mb-2">总番数预览</div>
                  <div className="text-lg font-bold text-blue-600 mb-2">
                    {calculateTotalFan(selectedFanTypes, gangCount)}番
                    {settings.maxFan > 0 && calculateTotalFan(selectedFanTypes, gangCount) > settings.maxFan && 
                      ` → ${settings.maxFan}番（封顶）`
                    }
                  </div>
                  
                  <div className="text-xs text-gray-600 space-y-1">
                    {selectedFanTypes.length > 0 && (
                      <div>
                        番型: {selectedFanTypes.map(type => `${type}(${FAN_SCORE_MAP[type]}番)`).join(' + ')}
                        {gangCount > 0 && ` + ${gangCount}杠(${gangCount}番)`}
                      </div>
                    )}
                    {gangCount > 0 && selectedFanTypes.length === 0 && (
                      <div>杠牌: {gangCount}杠 = {gangCount}番</div>
                    )}
                    
                    <div className="border-t pt-1 mt-2">
                      <div className="font-medium text-gray-700">
                        {(() => {
                          const totalFan = Math.min(
                            calculateTotalFan(selectedFanTypes, gangCount),
                            settings.maxFan || calculateTotalFan(selectedFanTypes, gangCount)
                          );
                          const baseScore = calculateScoreFromFan(totalFan);
                          
                          if (eventType === 'hu_pai') {
                            const loserCount = loserIds.length;
                            const totalScore = loserCount > 0 ? (baseScore + 1) * loserCount : 0;
                            return (
                              <>
                                <div>基础得分: 2^{totalFan} = {baseScore}分</div>
                                <div>自摸加分: +1分</div>
                                <div>单人得分: {baseScore + 1}分</div>
                                <div className="text-blue-600 font-semibold">
                                  总得分: {baseScore + 1} × {loserCount}人 = {totalScore}分
                                </div>
                                {loserCount === 0 && (
                                  <div className="text-amber-600 text-xs mt-1">
                                    请选择在场输家玩家
                                  </div>
                                )}
                              </>
                            );
                          } else if (eventType === 'dian_pao_hu') {
                            return (
                              <>
                                <div>点炮得分: 2^{totalFan} = {baseScore}分</div>
                                <div className="text-blue-600 font-semibold">
                                  总得分: {baseScore}分
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  点炮者承担全部分数
                                </div>
                              </>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100">
          {isGameFinished ? (
            <div className="text-center p-4 bg-green-50 text-green-700 rounded-lg">
              <p className="font-semibold">🏁 游戏已结束并结算 🏁</p>
              <p className="text-sm mt-1">请在顶部的排行榜查看最终结算详情。</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddEvent}
                disabled={isFormInvalid}
                className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg ${
                  isFormInvalid
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 shadow-blue-500/25'
                }`}
              >
                ✅ 添加事件
              </button>

              {isHost && (
                <>
                  <button
                    onClick={onNextRound}
                    disabled={players.length < 2}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg shadow-emerald-500/25 transform hover:scale-105"
                  >
                    🎯 {currentRound === 1 && currentRoundEvents.length === 0 ? '开局' : '下一局'}
                  </button>

                  <button
                    onClick={() => { if (roomId) socketService.settleGame(roomId); }}
                    disabled={players.length < 2}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg shadow-cyan-500/25 transform hover:scale-105"
                  >
                    💰 结束并结算
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}