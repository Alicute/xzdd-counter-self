import type { GameState } from '../types/mahjong';

/**
 * 获取一份默认的、全新的游戏状态
 * @returns {GameState}
 */
export function getDefaultGameState(): GameState {
  return {
    players: [],
    currentRoundEvents: [],
    roundHistory: [],
    currentRound: 1,
    settings: {
      maxFan: 4, // 默认4番封顶
      callTransfer: true, // 默认开启呼叫转移
      pricePerFan: 1, // 默认每番1元
    },
  };
}