import { FanType, WinType, GangType } from '../types/mahjong';
import type { GameEvent, Player, GameSettings } from '../types/mahjong';

// 番型番数映射
export const FAN_SCORE_MAP: Record<FanType, number> = {
  [FanType.XIAO_HU]: 0,
  [FanType.DA_DUI_ZI]: 1,
  [FanType.JIN_GOU_DIAO]: 2,
  [FanType.XIAO_QI_DUI]: 2,
  [FanType.LONG_QI_DUI]: 3, // 龙七对 = 小七对(2番) + 杠(1番) = 3番
  [FanType.QING_YI_SE]: 2,
  [FanType.GANG_SHANG_HUA]: 2, // 杠上花直接2番，已包含杠
  [FanType.GANG_SHANG_PAO]: 1,
  [FanType.HAI_DI_LAO]: 1,
  [FanType.GANG_FAN]: 1, // 每杠+1番
};

// 杠牌类型分数映射（杠牌本身的得分，不是番数）
export const GANG_SCORE_MAP: Record<GangType, number> = {
  [GangType.AN_GANG]: 2,
  [GangType.BA_GANG]: 1,
  [GangType.DIAN_GANG]: 2,
};

// 计算分数：2的番数次方，0番=1分
export function calculateScoreFromFan(fanCount: number): number {
  if (fanCount === 0) return 1;
  return Math.pow(2, fanCount);
}

// 计算胡牌得分
export function calculateWinScore(
  fanTypes: FanType[],
  gangCount: number,
  winType: WinType,
  settings: GameSettings,
  playerCount: number = 4
): number {
  // 计算总番数（所有番型叠加）
  let totalFan = fanTypes.reduce((sum, fanType) => {
    return sum + FAN_SCORE_MAP[fanType];
  }, 0);

  // 杠牌加番：每杠+1番（杠上花已包含杠，龙七对已包含杠）
  if (gangCount > 0) {
    totalFan += gangCount;
  }

  // 封顶处理
  if (settings.maxFan > 0 && totalFan > settings.maxFan) {
    totalFan = settings.maxFan;
  }

  // 使用正确的计分公式：2的番数次方
  let baseScore = calculateScoreFromFan(totalFan);

  // 自摸额外+1分（在番数计算之外）
  if (winType === WinType.ZI_MO) {
    baseScore += 1;
  }

  // 自摸时分数要乘以人数（每家都要输这么多分）
  if (winType === WinType.ZI_MO) {
    return baseScore * (playerCount - 1); // 除了胡牌者本人，其他人都要输
  }

  return baseScore;
}

// 计算杠牌得分
export function calculateGangScore(
  gangType: GangType
): number {
  return GANG_SCORE_MAP[gangType] || 0;
}

// 工具函数：计算总番数（不包含封顶处理）
export function calculateTotalFan(
  fanTypes: FanType[],
  gangCount: number = 0
): number {
  const fanScore = fanTypes.reduce((sum, fanType) => sum + FAN_SCORE_MAP[fanType], 0);

  // 杠牌加番：每杠+1番（杠上花已包含杠，龙七对已包含杠）
  return fanScore + gangCount;
}

// 生成唯一ID
let idCounter = 0;
export function generateUniqueId(): string {
  idCounter++;
  return `${Date.now()}-${idCounter}`;
}

// 创建胡牌事件
export function createWinEvent(
  winnerId: string,
  loserIds: string[],
  fanTypes: FanType[],
  gangCount: number,
  winType: WinType,
  settings: GameSettings,
  playerCount: number = 4
): GameEvent {
  const score = calculateWinScore(fanTypes, gangCount, winType, settings, playerCount);
  const totalFan = calculateTotalFan(fanTypes, gangCount);

  // 构建描述
  let description = fanTypes.length > 0 ? fanTypes.join(' ') : '小胡';
  if (gangCount > 0) {
    description += ` ${gangCount}杠`;
  }
  description += ` ${winType} ${totalFan}番 得分${score}分`;

  return {
    id: generateUniqueId(),
    timestamp: Date.now(),
    type: 'win',
    winnerId,
    loserIds,
    fanTypes,
    winType,
    gangCount,
    fanCount: totalFan,
    score,
    description
  };
}

// 创建杠牌事件
export function createGangEvent(
  winnerId: string,
  gangType: GangType,
  settings: GameSettings,
  gangTargetIds: string[] = []
): GameEvent {
  const baseScore = calculateGangScore(gangType);
  const totalScore = baseScore * gangTargetIds.length; // 总得分 = 单人分数 × 人数

  let description = '';
  if (gangType === GangType.DIAN_GANG) {
    description = `点杠 得分${totalScore}分`;
  } else if (gangType === GangType.AN_GANG) {
    description = `暗杠 得分${totalScore}分`;
  } else {
    description = `巴杠 得分${totalScore}分`;
  }

  return {
    id: generateUniqueId(),
    timestamp: Date.now(),
    type: 'gang',
    winnerId,
    gangType,
    gangTargetIds,
    fanCount: 0,
    score: totalScore,
    description
  };
}

// 应用事件到玩家分数
export function applyEventToPlayers(
  event: GameEvent,
  players: Player[]
): Player[] {
  if (event.type === 'win') {
    return players.map(player => {
      if (player.id === event.winnerId) {
        // 胡牌者获得分数
        return { ...player, score: player.score + event.score };
      } else if (event.winType === WinType.ZI_MO) {
        // 自摸：每家都输(总分数 / (人数-1))
        const scorePerPlayer = event.score / (players.length - 1);
        return { ...player, score: player.score - scorePerPlayer };
      } else if (event.loserIds?.includes(player.id)) {
        // 点胡：特定失败者输全部分数
        return { ...player, score: player.score - event.score };
      }
      return player;
    });
  } else if (event.type === 'gang') {
    return players.map(player => {
      if (player.id === event.winnerId) {
        return { ...player, score: player.score + event.score };
      } else {
        return applyGangEvent(event, player);
      }
    });
  }

  return players;
}

// 反向应用事件（用于优化删除操作）
export function reverseApplyEventToPlayers(
  event: GameEvent,
  players: Player[]
): Player[] {
  if (event.type === 'win') {
    return players.map(player => {
      if (player.id === event.winnerId) {
        // 反向：胡牌者失去分数
        return { ...player, score: player.score - event.score };
      } else if (event.winType === WinType.ZI_MO) {
        // 反向自摸：每家都得回分数
        const scorePerPlayer = event.score / (players.length - 1);
        return { ...player, score: player.score + scorePerPlayer };
      } else if (event.loserIds?.includes(player.id)) {
        // 反向点胡：失败者得回分数
        return { ...player, score: player.score + event.score };
      }
      return player;
    });
  } else if (event.type === 'gang') {
    return players.map(player => {
      if (player.id === event.winnerId) {
        return { ...player, score: player.score - event.score };
      } else {
        return reverseApplyGangEvent(event, player);
      }
    });
  }

  return players;
}

// 处理杠牌事件的分数计算
function applyGangEvent(
  event: GameEvent,
  player: Player
): Player {
  const { gangType, gangTargetIds = [] } = event;
  if (!gangType) return player;
  const baseScore = calculateGangScore(gangType);

  // 检查当前玩家是否在被杠列表中
  if (gangTargetIds.includes(player.id)) {
    return { ...player, score: player.score - baseScore };
  }

  return player;
}

// 反向处理杠牌事件的分数计算
function reverseApplyGangEvent(
  event: GameEvent,
  player: Player
): Player {
  const { gangType, gangTargetIds = [] } = event;
  if (!gangType) return player;
  const baseScore = calculateGangScore(gangType);

  // 检查当前玩家是否在被杠列表中，反向返还分数
  if (gangTargetIds.includes(player.id)) {
    return { ...player, score: player.score + baseScore };
  }

  return player;
} 