import { useState, useEffect, useCallback } from 'react';
import type { GameState, GameEvent } from './types/mahjong';
import { applyEventToPlayers, reverseApplyEventToPlayers, settleCurrentRound } from './utils/mahjongCalculator';
import { loadGameState, saveGameState, saveGameStateSync, getDefaultGameState, clearGameState } from './utils/storage';
import PlayerManager from './components/PlayerManager';
import SettingsManager from './components/SettingsManager';
import EventAdder from './components/EventAdder';
import EventHistory from './components/EventHistory';
import ScoreBoard from './components/ScoreBoard';
import CurrentRoundBoard from './components/CurrentRoundBoard';
import ConfirmDialog from './components/ConfirmDialog';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'warning' | 'danger' | 'info';
  confirmText: string;
  onConfirm: () => void;
}

function App() {
  const [gameState, setGameState] = useState<GameState>(getDefaultGameState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: '确认',
    onConfirm: () => {}
  });

  // 检查游戏是否已开始（有事件记录）
  const isGameStarted = (gameState.currentRoundEvents?.length || 0) > 0;

  // 显示确认对话框的通用函数
  const showConfirmDialog = (options: Omit<ConfirmDialogState, 'isOpen'>) => {
    setConfirmDialog({
      ...options,
      isOpen: true
    });
  };

  // 关闭确认对话框
  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  // 加载保存的游戏状态
  useEffect(() => {
    console.log('🔄 正在加载游戏状态...');
    const savedState = loadGameState();
    if (savedState) {
      setGameState(savedState);
      console.log('✅ 游戏状态加载完成');
    } else {
      console.log('ℹ️ 使用默认游戏状态');
    }
    setIsLoaded(true);
  }, []);

  // 保存游戏状态
  useEffect(() => {
    if (isLoaded) {
      console.log('💾 正在保存游戏状态...');
      saveGameState(gameState);
    }
  }, [gameState, isLoaded]);

  // 页面卸载时强制保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLoaded) {
        saveGameStateSync(gameState);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 组件卸载时也强制保存
      if (isLoaded) {
        saveGameStateSync(gameState);
      }
    };
  }, [gameState, isLoaded]);

  const updatePlayers = useCallback((players: GameState['players']) => {
    setGameState(prev => ({ ...prev, players }));
  }, []);

  const updateSettings = useCallback((settings: GameState['settings']) => {
    setGameState(prev => ({ ...prev, settings }));
  }, []);

  const addEvent = useCallback((event: GameEvent) => {
    setGameState(prev => {
      const updatedPlayers = applyEventToPlayers(event, prev.players);
      return {
        ...prev,
        players: updatedPlayers,
        currentRoundEvents: [...(prev.currentRoundEvents || []), event]
      };
    });
  }, []);

  const removeEvent = useCallback((eventId: string) => {
    setGameState(prev => {
      const eventToRemove = (prev.currentRoundEvents || []).find(e => e.id === eventId);
      if (!eventToRemove) return prev;

      // 使用增量计算：直接反向应用要删除的事件
      const updatedPlayers = reverseApplyEventToPlayers(eventToRemove, prev.players);
      const remainingEvents = (prev.currentRoundEvents || []).filter(e => e.id !== eventId);

      return {
        ...prev,
        players: updatedPlayers,
        currentRoundEvents: remainingEvents
      };
    });
  }, []);

  const handleNextRound = useCallback(() => {
    setGameState(prev => {
      // 如果当前局没有事件，直接开始下一局
      if ((prev.currentRoundEvents || []).length === 0) {
        return {
          ...prev,
          currentRound: prev.currentRound + 1
        };
      }

      // 结算当前局分数到总分
      const settledPlayers = settleCurrentRound(prev.players);
      
      // 保存当前局历史记录
      const roundHistory = {
        roundNumber: prev.currentRound,
        events: [...(prev.currentRoundEvents || [])],
        finalScores: prev.players.map(p => ({ playerId: p.id, score: p.currentRoundScore })),
        timestamp: Date.now()
      };

      return {
        ...prev,
        players: settledPlayers,
        currentRoundEvents: [], // 清空当前局事件
        roundHistory: [...prev.roundHistory, roundHistory],
        currentRound: prev.currentRound + 1
      };
    });
  }, []);

  // 检查当前局是否有分数变化
  const hasCurrentRoundActivity = gameState.players.some(p => p.currentRoundScore !== 0);
  
  // 计算当前局分数平衡
  const currentRoundBalance = gameState.players.reduce((sum, player) => sum + player.currentRoundScore, 0);

  const resetGame = useCallback(() => {
    console.log('🔄 重置游戏状态...');
    clearGameState();
    setGameState(getDefaultGameState());
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载游戏数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-gradient-to-tr from-green-400/20 to-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-white/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🀄</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">四川血战到底</h1>
                <p className="text-xs text-gray-600">麻将计分器</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="打开设置"
            >
              <Bars3Icon className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </header>

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* 分数看板 - 放大显示 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-shadow duration-300">
            <ScoreBoard players={gameState.players} />
          </div>

          {/* 当前局计分板 */}
          <CurrentRoundBoard 
            players={gameState.players} 
            currentRound={gameState.currentRound} 
          />

          {/* 下一局按钮 */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                const buttonText = gameState.currentRound === 1 && !hasCurrentRoundActivity ? '开局' : '下一局';
                
                // 检查当前局分数是否平衡
                if (hasCurrentRoundActivity && currentRoundBalance !== 0) {
                  // 分数不平衡的警告提示
                  showConfirmDialog({
                    title: '⚠️ 分数不平衡警告',
                    message: `当前局分数不平衡（总计${currentRoundBalance > 0 ? '+' : ''}${currentRoundBalance}分）！\n\n这可能表示计分有误。继续${buttonText}将把当前不平衡的分数累加到总分中。\n\n您确定要继续吗？`,
                    type: 'warning',
                    confirmText: `确认${buttonText}`,
                    onConfirm: handleNextRound
                  });
                } else {
                  // 正常的确认提示
                  const message = hasCurrentRoundActivity 
                    ? `确认结算第${gameState.currentRound}局并开始下一局吗？当前局的分数将累加到总分中。`
                    : `确认开始第${gameState.currentRound}局吗？`;
                  
                  showConfirmDialog({
                    title: `${buttonText}确认`,
                    message,
                    type: 'info',
                    confirmText: buttonText,
                    onConfirm: handleNextRound
                  });
                }
              }}
              disabled={gameState.players.length < 2}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg shadow-emerald-500/25 transform hover:scale-105"
            >
              🎯 {gameState.currentRound === 1 && !hasCurrentRoundActivity ? '开局' : '下一局'}
              <span className="ml-2 text-sm opacity-90">第{gameState.currentRound + (hasCurrentRoundActivity ? 1 : 0)}局</span>
            </button>
          </div>

          {/* 事件添加 - 核心功能 */}
          <EventAdder
            players={gameState.players}
            settings={gameState.settings}
            onEventAdd={addEvent}
          />

          {/* 历史记录 - 可折叠 */}
          <EventHistory
            events={gameState.currentRoundEvents || []}
            players={gameState.players}
            onEventRemove={removeEvent}
            currentRound={gameState.currentRound}
          />
        </div>

        {/* 抽屉式全屏弹窗 */}
        {isDrawerOpen && (
          <>
            {/* 遮罩层 */}
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsDrawerOpen(false)}
            />
            
            {/* 全屏抽屉内容 */}
            <div className="fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out">
              <div className="w-full h-full bg-white flex flex-col overflow-hidden">
                {/* 抽屉头部 */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">游戏设置</h2>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* 抽屉内容 - 可滚动区域 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* 玩家管理 */}
                  <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    👥 玩家管理
                    {isGameStarted && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        游戏进行中
                      </span>
                    )}
                  </h3>
                  {isGameStarted ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-700 mb-2">
                        <span className="text-sm font-medium">⚠️ 游戏已开始，无法修改玩家</span>
                      </div>
                      <div className="text-sm text-yellow-600 mb-3">
                        当前玩家：{gameState.players.map(p => p.name).join('、')}
                      </div>
                      <p className="text-xs text-yellow-600">
                        如需修改玩家，请先重置游戏
                      </p>
                    </div>
                  ) : (
                    <PlayerManager
                      players={gameState.players}
                      onPlayersChange={updatePlayers}
                    />
                  )}
                </div>

                {/* 游戏设置 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    ⚙️ 游戏设置
                    {isGameStarted && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        已锁定
                      </span>
                    )}
                  </h3>
                  {isGameStarted ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-700 mb-2">
                        <span className="text-sm font-medium">🔒 设置已锁定，无法修改</span>
                      </div>
                      <div className="text-sm text-yellow-600 space-y-1">
                        <div>封顶番数：{gameState.settings.maxFan || '不封顶'}</div>
                        <div>呼叫转移：{gameState.settings.callTransfer ? '开启' : '关闭'}</div>
                      </div>
                      <p className="text-xs text-yellow-600 mt-3">
                        游戏开始后不允许修改设置，避免影响计分准确性
                      </p>
                    </div>
                  ) : (
                    <SettingsManager
                      settings={gameState.settings}
                      onSettingsChange={updateSettings}
                    />
                  )}
                </div>

                {/* 危险操作区域 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
                    ⚠️ 危险操作
                  </h3>
                  {isGameStarted && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-700">
                        💡 重置游戏后可重新配置玩家和设置
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      const title = isGameStarted ? '重置游戏确认' : '重置游戏';
                      const message = isGameStarted 
                        ? `您确定要重置游戏吗？这将清除所有分数记录和 ${(gameState.currentRoundEvents || []).length} 条当前局事件历史，此操作无法撤销！`
                        : '您确定要重置游戏吗？这将清除所有数据，此操作无法撤销！';
                      
                      showConfirmDialog({
                        title,
                        message,
                        type: 'danger',
                        confirmText: '确认重置',
                        onConfirm: () => {
                          resetGame();
                          setIsDrawerOpen(false);
                        }
                      });
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25"
                  >
                    🔄 重置游戏
                    {isGameStarted && <span className="ml-1 text-xs">({(gameState.currentRoundEvents || []).length}条记录)</span>}
                  </button>
                </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 现代化确认对话框 */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={closeConfirmDialog}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmText={confirmDialog.confirmText}
        />
      </div>
    </div>
  );
}

export default App;
