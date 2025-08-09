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
      events: state.events.length,
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

// 从本地存储加载游戏状态
export function loadGameState(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedState = JSON.parse(stored);
      console.log('✅ 从本地存储加载游戏状态:', {
        players: parsedState.players?.length || 0,
        events: parsedState.events?.length || 0,
        settings: parsedState.settings
      });
      return parsedState;
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
    events: [],
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