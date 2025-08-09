import type { GameState, GameSettings } from '../types/mahjong';

const STORAGE_KEY = 'mahjong_game_state';
const DEBOUNCE_DELAY = 500; // 防抖延迟500ms

// 防抖定时器
let saveTimeout: NodeJS.Timeout | null = null;

// 立即保存游戏状态到本地存储
function saveGameStateImmediate(state: GameState): void {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
    console.log('✅ 游戏状态已保存到本地存储:', {
      players: state.players.length,
      currentRoundEvents: state.currentRoundEvents.length,
      roundHistory: state.roundHistory.length,
      currentRound: state.currentRound,
      settings: state.settings
    });
  } catch (error) {
    console.error('❌ 保存游戏状态失败:', error);
  }
}

// 防抖保存游戏状态到本地存储
export function saveGameState(state: GameState): void {
  // 清除之前的定时器
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // 设置新的定时器
  saveTimeout = setTimeout(() => {
    saveGameStateImmediate(state);
    saveTimeout = null;
  }, DEBOUNCE_DELAY);
}

// 强制立即保存（用于重要操作）
export function saveGameStateSync(state: GameState): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  saveGameStateImmediate(state);
}

// 迁移旧版本的游戏状态到新版本
function migrateGameState(parsedState: any): GameState {
  // 如果是旧版本（有events字段），需要迁移到新结构
  if (parsedState.events && !parsedState.currentRoundEvents) {
    console.log('🔄 检测到旧版本数据，正在迁移...');
    
    // 将所有旧事件移动到当前局
    const migratedState: GameState = {
      players: parsedState.players || [],
      currentRoundEvents: parsedState.events || [],
      roundHistory: [],
      currentRound: 1,
      settings: parsedState.settings || getDefaultSettings(),
    };
    
    // 如果玩家数据中没有新字段，需要迁移分数
    migratedState.players = migratedState.players.map((player: any) => ({
      ...player,
      totalScore: player.score || 0, // 旧的score字段迁移到totalScore
      currentRoundScore: 0, // 当前局分数重置为0
    }));
    
    console.log('✅ 数据迁移完成');
    return migratedState;
  }
  
  // 确保所有必需字段都存在
  return {
    players: parsedState.players || [],
    currentRoundEvents: parsedState.currentRoundEvents || [],
    roundHistory: parsedState.roundHistory || [],
    currentRound: parsedState.currentRound || 1,
    settings: parsedState.settings || getDefaultSettings(),
  };
}

// 从本地存储加载游戏状态
export function loadGameState(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedState = JSON.parse(stored);
      const migratedState = migrateGameState(parsedState);
      
      console.log('✅ 从本地存储加载游戏状态:', {
        players: migratedState.players?.length || 0,
        currentRoundEvents: migratedState.currentRoundEvents?.length || 0,
        roundHistory: migratedState.roundHistory?.length || 0,
        currentRound: migratedState.currentRound || 1,
        settings: migratedState.settings
      });
      
      return migratedState;
    } else {
      console.log('ℹ️ 本地存储中没有找到游戏状态，使用默认状态');
    }
  } catch (error) {
    console.error('❌ 加载游戏状态失败:', error);
  }
  return null;
}

// 获取默认设置
export function getDefaultSettings(): GameSettings {
  return {
    maxFan: 4, // 默认4番封顶
    callTransfer: false, // 默认不呼叫转移
  };
}

// 获取默认游戏状态
export function getDefaultGameState(): GameState {
  return {
    players: [],
    currentRoundEvents: [],
    roundHistory: [],
    currentRound: 1,
    settings: getDefaultSettings(),
  };
}

// 清除本地存储
export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ 本地存储已清除');
  } catch (error) {
    console.error('❌ 清除本地存储失败:', error);
  }
} 