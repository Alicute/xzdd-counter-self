import { useState, useEffect, useCallback } from 'react';
import type { GameState, GameEvent } from './types/mahjong';
import { applyEventToPlayers, reverseApplyEventToPlayers } from './utils/mahjongCalculator';
import { loadGameState, saveGameState, saveGameStateSync, getDefaultGameState, clearGameState } from './utils/storage';
import PlayerManager from './components/PlayerManager';
import SettingsManager from './components/SettingsManager';
import EventAdder from './components/EventAdder';
import EventHistory from './components/EventHistory';
import ScoreBoard from './components/ScoreBoard';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

function App() {
  const [gameState, setGameState] = useState<GameState>(getDefaultGameState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
        events: [...prev.events, event]
      };
    });
  }, []);

  const removeEvent = useCallback((eventId: string) => {
    setGameState(prev => {
      const eventToRemove = prev.events.find(e => e.id === eventId);
      if (!eventToRemove) return prev;

      // 使用增量计算：直接反向应用要删除的事件
      const updatedPlayers = reverseApplyEventToPlayers(eventToRemove, prev.players);
      const remainingEvents = prev.events.filter(e => e.id !== eventId);

      return {
        ...prev,
        players: updatedPlayers,
        events: remainingEvents
      };
    });
  }, []);

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

      <div className="relative z-10 w-full h-full px-2 sm:px-4 py-4 sm:py-6 overflow-y-auto">
        {/* 顶部头部 */}
        <header className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl mb-4 sm:mb-6 shadow-xl shadow-red-500/25">
            <span className="text-2xl sm:text-3xl">🀄</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2 sm:mb-3">
            四川血战到底
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">
            麻将计分器
          </h2>
          <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto">
            智能计分，轻松记录每一局 • 数据自动保存
          </p>
        </header>

        {/* 主要内容区域 - 响应式网格布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-12 gap-4 sm:gap-6">
          {/* 分数看板 - 移动端优先显示 */}
          <div className="order-1 lg:order-2 lg:col-span-1 xl:col-span-4">
            <ScoreBoard players={gameState.players} />
          </div>

          {/* 左侧：玩家和设置 */}
          <div className="order-3 lg:order-1 lg:col-span-1 xl:col-span-4 space-y-4 sm:space-y-6">
            <PlayerManager
              players={gameState.players}
              onPlayersChange={updatePlayers}
            />

            <SettingsManager
              settings={gameState.settings}
              onSettingsChange={updateSettings}
            />

            {/* 重置按钮 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-shadow duration-300">
              <button
                onClick={resetGame}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25"
              >
                🔄 重置游戏
              </button>
            </div>
          </div>

          {/* 右侧：添加事件 */}
          <div className="order-2 lg:order-3 lg:col-span-1 xl:col-span-4">
            <EventAdder
              players={gameState.players}
              settings={gameState.settings}
              onEventAdd={addEvent}
            />
          </div>
        </div>

        {/* 底部：历史记录 */}
        <div className="mt-8">
          <EventHistory
            events={gameState.events}
            players={gameState.players}
            onEventRemove={removeEvent}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
