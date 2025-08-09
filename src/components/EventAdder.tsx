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
  const [hasActualGang, setHasActualGang] = useState<boolean>(false); // 是否有实际杠出来
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
    setHasActualGang(false);
    setGangTargetIds([]);
  };

  const toggleLoser = (playerId: string) => {
    if (loserIds.includes(playerId)) {
      setLoserIds(loserIds.filter(id => id !== playerId));
    } else {
      setLoserIds([...loserIds, playerId]);
    }
  };

  const toggleFanType = (fanType: FanType) => {
    if (selectedFanTypes.includes(fanType)) {
      setSelectedFanTypes(selectedFanTypes.filter(fan => fan !== fanType));
    } else {
      setSelectedFanTypes([...selectedFanTypes, fanType]);
    }
  };

  const toggleGangTarget = (playerId: string) => {
    if (gangTargetIds.includes(playerId)) {
      setGangTargetIds(gangTargetIds.filter(id => id !== playerId));
    } else {
      setGangTargetIds([...gangTargetIds, playerId]);
    }
  };

  // 排除杠牌加番（这个在杠数中体现）
  const availableFanTypes = Object.values(FanType).filter(fanType => fanType !== FanType.GANG_FAN);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🎯</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">添加牌局事件</h2>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：基本信息 */}
          <div className="space-y-6">
            {/* 事件类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                事件类型
              </label>
              <div className="flex gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-3">
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

            {eventType === 'win' && (
              <>
                {/* 失败者选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    失败者（输家）
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {players.map(player => (
                      <label key={player.id} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${loserIds.includes(player.id)
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
                        <span className={`ml-2 text-sm ${player.id === winnerId ? 'text-gray-400' : 'text-gray-900'
                          }`}>{player.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </>
            )}
          </div>

          {/* 右侧：番型配置 */}
          <div className="space-y-6">
            {eventType === 'win' && (
              <>
                {/* 番型选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    番型选择（可多选叠加）
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {availableFanTypes.map(fanType => (
                      <label key={fanType} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${selectedFanTypes.includes(fanType)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}>
                        <input
                          type="checkbox"
                          checked={selectedFanTypes.includes(fanType)}
                          onChange={() => toggleFanType(fanType)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium flex-1">
                          {fanType}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {FAN_SCORE_MAP[fanType]}番
                        </span>
                        {fanType === FanType.GANG_SHANG_HUA && (
                          <span className="text-xs text-blue-600 ml-2">含杠</span>
                        )}
                        {fanType === FanType.LONG_QI_DUI && (
                          <span className="text-xs text-green-600 ml-2">含杠</span>
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    💡 杠上花(2番)和龙七对(3番)已包含杠牌番数，可额外添加杠数
                  </div>
                </div>

                {/* 杠牌配置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    杠牌配置
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">杠牌数量（每杠+1番）</span>
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={gangCount}
                        onChange={(e) => {
                          const count = parseInt(e.target.value) || 0;
                          setGangCount(count);
                          setHasActualGang(count > 0);
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <p className="text-xs text-gray-500">
                      额外杠数：用于龙七对+杠、杠上花+杠等情况
                    </p>
                  </div>
                </div>

                {/* 胡牌方式 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    胡牌方式
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors ${winType === WinType.ZI_MO
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}>
                      <input
                        type="radio"
                        value={WinType.ZI_MO}
                        checked={winType === WinType.ZI_MO}
                        onChange={(e) => setWinType(e.target.value as WinType)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">自摸 (+1分)</span>
                    </label>
                    <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors ${winType === WinType.DIAN_PAO
                      ? 'bg-orange-50 border-orange-200 text-orange-800'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}>
                      <input
                        type="radio"
                        value={WinType.DIAN_PAO}
                        checked={winType === WinType.DIAN_PAO}
                        onChange={(e) => setWinType(e.target.value as WinType)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">点炮</span>
                    </label>
                  </div>
                </div>

              </>
            )}
          </div>
        </div>

        {/* 底部：预览和操作按钮 */}
        <div className="mt-8 border-t border-gray-200 pt-6 space-y-4">
          {eventType === 'win' && (
            /* 番数预览 */
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">📊 得分预览</h4>
              <div className="text-sm text-blue-700">
                {(() => {
                  const totalFan = calculateTotalFan(selectedFanTypes, gangCount);

                  // 封顶处理
                  const cappedFan = settings.maxFan > 0 && totalFan > settings.maxFan
                    ? settings.maxFan
                    : totalFan;

                  // 计算得分：2的番数次方
                  let score = calculateScoreFromFan(cappedFan);

                  // 自摸额外+1分
                  if (winType === WinType.ZI_MO) {
                    score += 1;
                  }

                  let description = '';
                  if (selectedFanTypes.length > 0) {
                    description += selectedFanTypes.join(' ');
                  } else {
                    description += '小胡';
                  }

                  if (gangCount > 0) {
                    description += ` + ${gangCount}杠`;
                  }

                  description += ` = ${totalFan}番`;

                  if (settings.maxFan > 0 && totalFan > settings.maxFan) {
                    description += ` → ${cappedFan}番(封顶)`;
                  }

                  if (cappedFan === 0) {
                    description += ` = 1分(底分)`;
                  } else {
                    description += ` = 2^${cappedFan} = ${calculateScoreFromFan(cappedFan)}分`;
                  }

                  if (winType === WinType.ZI_MO) {
                    description += ` + 1分(自摸) = ${score}分`;
                    const finalScore = score * (players.length - 1);
                    description += ` × ${players.length - 1}家 = ${finalScore}分(总得分)`;
                  }

                  return description;
                })()}
              </div>
            </div>
          )}

          {eventType === 'gang' && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-800 mb-3">🀄 杠牌详情</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-amber-700 mb-2">
                    杠牌类型
                  </label>
                  <select
                    value={gangType}
                    onChange={(e) => setGangType(e.target.value as GangType)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    {Object.values(GangType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-700 mb-2">
                    {gangType === GangType.DIAN_GANG ? '被点杠的玩家' :
                      gangType === GangType.AN_GANG ? '给暗杠钱的玩家' : '给巴杠钱的玩家'}
                    {gangType !== GangType.DIAN_GANG && <span className="text-xs ml-1">(可多选)</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {players.filter(p => p.id !== winnerId).map(player => (
                      <label key={player.id} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${gangTargetIds.includes(player.id)
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-amber-200 hover:bg-amber-25'
                        }`}>
                        <input
                          type="checkbox"
                          checked={gangTargetIds.includes(player.id)}
                          onChange={() => toggleGangTarget(player.id)}
                          className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="ml-2 text-sm font-medium">
                          {player.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-amber-600 bg-amber-100 p-2 rounded">
                  <strong>得分规则：</strong>
                  <br />• 暗杠：在场每家给杠牌者2分
                  <br />• 巴杠：在场每家给杠牌者1分
                  <br />• 点杠：被点杠者给杠牌者2分
                </div>
              </div>
            </div>
          )}

          {/* 添加按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleAddEvent}
              disabled={!winnerId ||
                (eventType === 'win' && loserIds.length === 0) ||
                (eventType === 'gang' && gangTargetIds.length === 0)
              }
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 transition-colors"
            >
              {eventType === 'win' ? '🎯 添加胡牌事件' : '🀄 添加杠牌事件'}
            </button>

            <button
              onClick={() => {
                setWinnerId('');
                setLoserIds([]);
                setSelectedFanTypes([]);
                setGangCount(0);
                setHasActualGang(false);
                setGangTargetIds([]);
              }}
              className="px-4 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
            >
              🔄 重置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 