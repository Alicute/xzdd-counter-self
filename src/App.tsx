import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameState, GameEvent } from './types/mahjong';
import { applyEventToPlayers, reverseApplyEventToPlayers, settleCurrentRound } from './utils/mahjongCalculator';
import { loadGameState, saveGameState, saveGameStateSync, getDefaultGameState, clearGameState } from './utils/storage';
import { socketService } from './services/socketService';
import type { Room } from './types/room';
import type { User } from './types/user';
import PlayerManager from './components/PlayerManager';
import SettingsManager from './components/SettingsManager';
import EventAdder from './components/EventAdder';
import ModeSelector from './components/ModeSelector';
import RoomManager from './components/RoomManager';
import Login from './components/Login';
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
  // 通用状态
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: '确认',
    onConfirm: () => {}
  });

  // 模式管理
  const [gameMode, setGameMode] = useState<'local' | 'online' | null>(null); // 'local', 'online', or null initially
  
  // 本地裁判模式状态
  const [localGameState, setLocalGameState] = useState<GameState>(getDefaultGameState());
  const [isLoaded, setIsLoaded] = useState(false);

  // 联机模式状态
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  
  // 新的认证状态
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'pending' | 'authenticated' | 'unauthenticated'>('pending');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 动态的游戏状态：根据模式返回本地或线上的状态
  const gameState = useMemo(() => {
    return gameMode === 'online' ? room?.gameState : localGameState;
  }, [gameMode, room, localGameState]);
  
  // 启动时自动认证
  useEffect(() => {
    socketService.connect();

    const handleAuthentication = async () => {
      const savedUserId = localStorage.getItem('mahjong-userId');
      if (savedUserId) {
        try {
          console.log(`🔄 Authenticating with userId: ${savedUserId}`);
          // **架构重构**: 不再发送 roomId
          const { user, room } = await socketService.authenticate(savedUserId);
          console.log('✅ Authentication successful', { user, room });
          setCurrentUser(user);
          if (room) {
            setRoom(room);
          }
          setGameMode('online');
          setAuthStatus('authenticated');
        } catch (authError) {
          console.error('❌ Authentication failed:', authError);
          localStorage.removeItem('mahjong-userId');
          setAuthStatus('unauthenticated');
        }
      } else {
        setAuthStatus('unauthenticated');
      }
    };
    
    // 确保socket连接上之后再认证
    socketService.onConnect(handleAuthentication);

    return () => {
      socketService.cleanupListeners();
      socketService.disconnect();
    };
  }, []);

  // WebSocket 事件处理
  useEffect(() => {
    const handleRoomStateUpdate = (newRoom: Room) => {
      setRoom(newRoom);
      // 如果从无房间到有房间，自动切换到 online 模式
      if (newRoom && !room) {
        setGameMode('online');
      }
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
       setTimeout(() => {
        setError(null);
      }, 3000);
    };
    
    const handleConnect = () => {
        setSocketId(socketService.getSocketId());
    }

    // 这些监听器应该在认证成功后一直存在
    if (authStatus === 'authenticated') {
      socketService.onRoomStateUpdate(handleRoomStateUpdate);
      socketService.onError(handleError);
      socketService.onConnect(handleConnect); // 重新连接时更新 socketId
      handleConnect(); // 初始设置
      
      socketService.onRoomEnded((message) => {
        showConfirmDialog({
          title: '牌局已结束',
          message,
          type: 'info',
          confirmText: '返回主菜单',
          onConfirm: () => {
            // 不需要清除 userId，只需要重置游戏状态
            setRoom(null);
            setGameMode(null);
          }
        });
      });
    }
    
    // gameMode 改变时，确保 socket 连接状态正确
    if (gameMode !== 'online' && socketService.isConnected()) {
      // socketService.disconnect(); // 暂时不在这里断开，以保持会话
    } else if (gameMode === 'online' && !socketService.isConnected()) {
      socketService.connect();
    }
    
  }, [authStatus, gameMode, room]);

 
  // 检查游戏是否已开始（有事件记录）
  const isGameStarted = useMemo(() => {
    // 在线模式下，游戏是否开始取决于 gameState.players 是否有内容
    // 这个 gameState.players 是游戏逻辑里的玩家，不是房间里的
    if (gameMode === 'online') {
      return (room?.gameState?.players?.length || 0) > 0;
    }
    // 本地模式下，只要有事件就算开始
    return (localGameState?.currentRoundEvents?.length || 0) > 0;
  }, [gameMode, room, localGameState]);
 
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

  // 加载保存的游戏状态 (仅限本地模式)
  useEffect(() => {
    if (gameMode === 'local') {
      console.log('🔄 正在加载游戏状态...');
      const savedState = loadGameState();
      if (savedState) {
        setLocalGameState(savedState);
        console.log('✅ 游戏状态加载完成');
      } else {
        console.log('ℹ️ 使用默认游戏状态');
      }
      setIsLoaded(true);
    }
  }, [gameMode]);
 
  // 保存游戏状态 (仅限本地模式)
  useEffect(() => {
    if (gameMode === 'local' && isLoaded) {
      console.log('💾 正在保存游戏状态...');
      saveGameState(localGameState);
    }
  }, [localGameState, isLoaded, gameMode]);
 
  // 页面卸载时强制保存 (仅限本地模式)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameMode === 'local' && isLoaded) {
        saveGameStateSync(localGameState);
      }
    };
 
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (gameMode === 'local' && isLoaded) {
        saveGameStateSync(localGameState);
      }
    };
  }, [localGameState, isLoaded, gameMode]);
 
  const updatePlayers = useCallback((players: GameState['players']) => {
    if (gameMode === 'local') {
      setLocalGameState(prev => ({ ...prev, players }));
    } else {
      // 在线模式下，此操作应由服务器完成
      console.warn('Online mode: Player updates should be handled by the server.');
    }
  }, [gameMode]);
 
  const updateSettings = useCallback((settings: GameState['settings']) => {
    if (gameMode === 'local') {
      setLocalGameState(prev => ({ ...prev, settings }));
    } else {
      // TODO: 在线模式下，发送更新设置的事件到服务器
      console.warn('Online mode: Settings updates should be sent to the server.');
    }
  }, [gameMode]);
 
  const addEvent = useCallback((event: GameEvent) => {
    if (gameMode === 'local') {
      setLocalGameState(prev => {
        if (!prev) return getDefaultGameState();
        const updatedPlayers = applyEventToPlayers(event, prev.players);
        return {
          ...prev,
          players: updatedPlayers,
          currentRoundEvents: [...(prev.currentRoundEvents || []), event]
        };
      });
    } else if (room?.id) {
      // 在线模式下，发送事件到服务器
      socketService.addGameEvent(room.id, event);
    }
  }, [gameMode, room?.id]);
 
  const removeEvent = useCallback((eventId: string) => {
    if (gameMode === 'local') {
      setLocalGameState(prev => {
        if (!prev) return getDefaultGameState();
        const eventToRemove = (prev.currentRoundEvents || []).find(e => e.id === eventId);
        if (!eventToRemove) return prev;
        
        const updatedPlayers = reverseApplyEventToPlayers(eventToRemove, prev.players);
        const remainingEvents = (prev.currentRoundEvents || []).filter(e => e.id !== eventId);

        return {
          ...prev,
          players: updatedPlayers,
          currentRoundEvents: remainingEvents
        };
      });
    } else {
       // TODO: 在线模式下，发送删除事件的请求
      console.warn('Online mode: Event removal should be sent to the server.');
    }
  }, [gameMode]);
 
  const handleNextRound = useCallback(() => {
    if (gameMode === 'local') {
      setLocalGameState(prev => {
        if (!prev) return getDefaultGameState();
        if ((prev.currentRoundEvents || []).length === 0) {
          return { ...prev, currentRound: prev.currentRound + 1 };
        }
        const settledPlayers = settleCurrentRound(prev.players);
        const roundHistory = {
          roundNumber: prev.currentRound,
          events: [...(prev.currentRoundEvents || [])],
          finalScores: prev.players.map(p => ({ playerId: p.id, score: p.currentRoundScore })),
          timestamp: Date.now()
        };
        return {
          ...prev,
          players: settledPlayers,
          currentRoundEvents: [],
          roundHistory: [...prev.roundHistory, roundHistory],
          currentRound: prev.currentRound + 1
        };
      });
    } else if (gameMode === 'online' && room?.id) {
      // 在线模式下，发送下一局的请求
      socketService.nextRound(room.id);
    }
  }, [gameMode, room?.id]);
 
  // 检查当前局是否有分数变化
  const hasCurrentRoundActivity = gameState?.players.some(p => p.currentRoundScore !== 0);
  
  // 计算当前局分数平衡
  const currentRoundBalance = gameState?.players?.reduce((sum, player) => sum + player.currentRoundScore, 0) ?? 0;
 
  const resetGame = useCallback(() => {
    if (gameMode === 'local') {
      console.log('🔄 重置游戏状态...');
      clearGameState();
      setLocalGameState(getDefaultGameState());
    } else {
      // TODO: 在线模式下，发送重置游戏的请求
      console.warn('Online mode: Game reset should be sent to the server.');
    }
  }, [gameMode]);
 
  const clearOnlineSession = () => {
    // 现在只重置客户端状态，不清除登录信息
    setRoom(null);
    setError(null);
    setGameMode(null);
  };

  const handleLogin = async (username: string) => {
    if (!username.trim()) {
      setError("用户名不能为空");
      return;
    }
    setIsLoggingIn(true);
    try {
      setError(null);
      const user = await socketService.loginOrRegister(username);
      setCurrentUser(user);
      localStorage.setItem('mahjong-userId', user.id);
      setAuthStatus('authenticated');
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "登录失败");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mahjong-userId');
    setCurrentUser(null);
    setRoom(null);
    setGameMode(null);
    setAuthStatus('unauthenticated');
    console.log('Logged out');
  };

  // 渲染加载中
  if (authStatus === 'pending' || (gameMode === 'local' && !isLoaded)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authStatus === 'pending' ? '正在连接服务器...' : '正在加载游戏数据...'}
          </p>
        </div>
      </div>
    );
  }

  // 渲染登录
  if (authStatus === 'unauthenticated') {
    return <Login onLogin={handleLogin} error={error} isLoading={isLoggingIn} />;
  }

  // (已认证) 渲染模式选择
  if (!gameMode) {
    return <ModeSelector onSelectMode={setGameMode} />;
  }
  
  // (已认证) 渲染在线大厅
  // (已认证) 渲染在线大厅或游戏界面
  if (gameMode === 'online') {
    if (!room) {
      // 如果没有加入房间，显示大厅/房间管理器
      return (
        <RoomManager
          room={room}
          error={error}
          currentUser={currentUser!}
          onCreateRoom={() => {
            if (currentUser) {
              socketService.createRoom({ userId: currentUser.id, username: currentUser.username });
            }
          }}
          onJoinRoom={(roomId) => {
            if (currentUser) {
              socketService.joinRoom(roomId, { userId: currentUser.id, username: currentUser.username });
            }
          }}
          onLogout={handleLogout}
        />
      );
    }
    // 如果已加入房间，则无论游戏是否开始，都显示主游戏界面
    // "开始游戏"按钮的逻辑将内置到主游戏界面中
  }
  
  // (已认证) 游戏加载中...
  if (!gameState) {
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
        {/* 新增: 游戏开始前的等待界面 (覆盖层) */}
        {gameMode === 'online' && room && !isGameStarted && (
          <div className="absolute inset-0 bg-gray-900/70 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-2xl p-6 text-center">
                <h2 className="text-2xl font-bold mb-2">游戏大厅</h2>
                <p className="text-gray-600 mb-4">房间号: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{room.id}</span></p>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-gray-800">已加入的玩家:</h3>
                  <ul className="space-y-2">
                    {room.players.map(p => (
                      <li key={p.id} className={`flex items-center justify-between bg-white p-2 rounded-md shadow-sm transition-opacity ${!p.isConnected ? 'opacity-50' : ''}`}>
                        <div>
                            <span className="font-medium text-gray-700">{p.name}{p.id === currentUser?.id ? ' (你)' : ''}</span>
                            {!p.isConnected && <span className="text-xs text-red-500 ml-2">(已掉线)</span>}
                        </div>
                        {p.userId === room.hostUserId && <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full ml-2 font-semibold">房主</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  {currentUser?.id === room.hostUserId ? (
                    <button
                      onClick={() => socketService.startGame(room.id)}
                      className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/50"
                      disabled={room.players.length < 2}
                    >
                      {room.players.length < 2 ? `等待更多玩家... (${room.players.length}/2)` : '🚀 开始游戏'}
                    </button>
                  ) : (
                    <p className="text-center text-gray-500 animate-pulse">等待房主开始游戏...</p>
                  )}
                </div>
            </div>
          </div>
        )}

        {/* 顶部导航栏 */}
        <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-white/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🀄</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  四川血战到底
                  {gameMode === 'online' && room?.id && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      - 房间: {room.id} (玩家: {currentUser?.username || '...'})
                    </span>
                  )}
                </h1>
                <p className="text-xs text-gray-600">麻将计分器</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {gameMode === 'online' && room && currentUser && (
                room.hostUserId === currentUser.id ? (
                  <button
                    onClick={() => {
                      showConfirmDialog({
                        title: '结束牌局确认',
                        message: '您是房主，结束牌局将解散整个房间，所有玩家都将被踢出。此操作无法撤销，确定要结束吗？',
                        type: 'danger',
                        confirmText: '确认结束',
                        onConfirm: () => {
                          if (room.id) {
                            socketService.endGame(room.id);
                            // 立即重置客户端状态以返回大厅
                            clearOnlineSession();
                          }
                        }
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    结束牌局
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      showConfirmDialog({
                        title: '离开牌局确认',
                        message: '您确定要离开当前牌局吗？',
                        type: 'warning',
                        confirmText: '确认离开',
                        onConfirm: () => {
                          // 离开房间不应该断开socket或清除登录状态
                          // 后端会处理玩家离开房间的逻辑
                          // 这里只需要重置客户端的房间视图
                          clearOnlineSession();
                        }
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    离开牌局
                  </button>
                )
              )}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="打开设置"
              >
                <Bars3Icon className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </header>

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* 分数看板 - 放大显示 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-shadow duration-300">
            <ScoreBoard players={gameState.players || []} />
          </div>

          {/* 当前局计分板 */}
          <CurrentRoundBoard
            players={gameState.players || []}
            currentRound={gameState.currentRound || 1}
          />

          {/* 下一局按钮 */}
          <div className="flex justify-center">
            {(gameMode === 'local' || (gameMode === 'online' && room?.hostUserId === currentUser?.id)) ? (
              <button
                onClick={() => {
                  const buttonText = gameState.currentRound === 1 && !hasCurrentRoundActivity ? '开局' : '下一局';
                  
                  // 本地模式保留分数检查逻辑
                  if (gameMode === 'local' && hasCurrentRoundActivity && currentRoundBalance !== 0) {
                    showConfirmDialog({
                      title: '⚠️ 分数不平衡警告',
                      message: `当前局分数不平衡（总计${currentRoundBalance > 0 ? '+' : ''}${currentRoundBalance}分）！\n\n继续${buttonText}将把当前不平衡的分数累加到总分中。您确定吗？`,
                      type: 'warning',
                      confirmText: `确认${buttonText}`,
                      onConfirm: handleNextRound
                    });
                  } else {
                    // 在线模式下房主操作，或本地模式正常情况，直接调用
                     handleNextRound();
                  }
                }}
                disabled={!gameState || gameState.players.length < 2}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg shadow-emerald-500/25 transform hover:scale-105"
              >
                🎯 {!gameState || (gameState.currentRound === 1 && !hasCurrentRoundActivity) ? '开局' : '下一局'}
                <span className="ml-2 text-sm opacity-90">第{(gameState?.currentRound || 1) + (hasCurrentRoundActivity ? 1 : 0)}局</span>
              </button>
            ) : (
              <p className="text-center text-gray-500 animate-pulse h-[52px] flex items-center">等待房主操作进入下一局...</p>
            )}
          </div>

          {/* 事件添加 - 核心功能 */}
          <EventAdder
            players={gameState?.players || []}
            settings={gameState?.settings || getDefaultGameState().settings}
            onEventAdd={addEvent}
            currentPlayerId={gameMode === 'online' ? currentUser?.id : null}
          />

          {/* 历史记录 - 可折叠 */}
          <EventHistory
            events={gameState?.currentRoundEvents || []}
            players={gameState?.players || []}
            onEventRemove={removeEvent}
            currentRound={gameState?.currentRound || 1}
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
                  {isGameStarted || gameMode === 'online' ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-700 mb-2">
                        <span className="text-sm font-medium">
                          {gameMode === 'online' ? '联机模式下无法在此处修改玩家' : '⚠️ 游戏已开始，无法修改玩家'}
                        </span>
                      </div>
                      <div className="text-sm text-yellow-600 mb-3">
                        当前玩家：{gameState?.players.map(p => p.name).join('、')}
                      </div>
                      <p className="text-xs text-yellow-600">
                        {gameMode === 'online' ? '玩家管理请在游戏大厅进行。' : '如需修改玩家，请先重置游戏。'}
                      </p>
                      {gameMode === 'online' && (
                        <button
                          onClick={() => {
                            clearOnlineSession(); // 只清除房间状态，不退出登录
                          }}
                          className="mt-3 w-full px-3 py-2 bg-blue-100 text-blue-700 font-medium text-sm rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          退出房间并返回模式选择
                        </button>
                      )}
                    </div>
                  ) : (
                    <PlayerManager
                      players={localGameState.players}
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
                  {isGameStarted || gameMode === 'online' ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-700 mb-2">
                        <span className="text-sm font-medium">
                          {gameMode === 'online' ? '联机模式下无法在此处修改设置' : '🔒 设置已锁定，无法修改'}
                        </span>
                      </div>
                      <div className="text-sm text-yellow-600 space-y-1">
                        <div>封顶番数：{gameState?.settings.maxFan || '不封顶'}</div>
                        <div>呼叫转移：{gameState?.settings.callTransfer ? '开启' : '关闭'}</div>
                      </div>
                      <p className="text-xs text-yellow-600 mt-3">
                        {gameMode === 'online' ? '游戏设置由房主在开局前确定。' : '游戏开始后不允许修改设置，避免影响计分准确性。'}
                      </p>
                    </div>
                  ) : (
                    <SettingsManager
                      settings={localGameState.settings}
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
                        ? `您确定要重置游戏吗？这将清除所有分数记录和 ${(gameState?.currentRoundEvents || []).length} 条当前局事件历史，此操作无法撤销！`
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
                    {isGameStarted && <span className="ml-1 text-xs">({(gameState?.currentRoundEvents || []).length}条记录)</span>}
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
