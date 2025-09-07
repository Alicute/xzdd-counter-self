import { FanType, GangType } from '../types/mahjong';
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

// 计算胡牌得分 - 自摸
export function calculateZiMoScore(
  fanTypes: FanType[],
  gangCount: number = 0,
  settings: GameSettings,
  activePlayers: number // 在场（未胡牌）玩家数量
): number {
  // 计算总番数（所有番型叠加）
  let totalFan = fanTypes.reduce((sum, fanType) => {
    return sum + FAN_SCORE_MAP[fanType];
  }, 0);

  // 杠牌加番：每杠+1番
  totalFan += gangCount;

  // 封顶处理
  if (settings.maxFan > 0 && totalFan > settings.maxFan) {
    totalFan = settings.maxFan;
  }

  // 基础得分：2的番数次方
  let baseScore = calculateScoreFromFan(totalFan);

  // 自摸额外+1分
  baseScore += 1;

  // 自摸总得分 = 基础得分 × 在场其他玩家数量
  return baseScore * (activePlayers - 1);
}

// 计算胡牌得分 - 点炮
export function calculateDianPaoScore(
  fanTypes: FanType[],
  gangCount: number = 0,
  settings: GameSettings
): number {
  // 计算总番数（所有番型叠加）
  let totalFan = fanTypes.reduce((sum, fanType) => {
    return sum + FAN_SCORE_MAP[fanType];
  }, 0);

  // 杠牌加番：每杠+1番
  totalFan += gangCount;

  // 封顶处理
  if (settings.maxFan > 0 && totalFan > settings.maxFan) {
    totalFan = settings.maxFan;
  }

  // 点炮得分：2的番数次方，不加额外分数
  return calculateScoreFromFan(totalFan);
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
  return fanScore + gangCount;
}

// 生成唯一ID
let idCounter = 0;
export function generateUniqueId(): string {
  idCounter++;
  return `${Date.now()}-${idCounter}`;
}

// 创建自摸事件
export function createZiMoEvent(
  winnerId: string,
  activePlayers: string[], // 在场（未胡牌）玩家ID列表
  fanTypes: FanType[],
  gangCount: number = 0,
  settings: GameSettings
): GameEvent {
  const score = calculateZiMoScore(fanTypes, gangCount, settings, activePlayers.length);
  const totalFan = calculateTotalFan(fanTypes, gangCount);
  const loserIds = activePlayers.filter(id => id !== winnerId);

  // 构建描述
  let description = fanTypes.length > 0 ? fanTypes.join(' ') : '小胡';
  if (gangCount > 0) {
    description += ` ${gangCount}杠`;
  }
  description += ` 自摸 ${totalFan}番 得分${score}分`;

  return {
    id: generateUniqueId(),
    timestamp: Date.now(),
    type: 'hu_pai',
    winnerId,
    loserIds,
    fanTypes,
    gangCount,
    fanCount: totalFan,
    score,
    description
  };
}

// 创建点炮胡牌事件
export function createDianPaoEvent(
  winnerId: string,
  dianPaoPlayerId: string, // 点炮者ID
  fanTypes: FanType[],
  gangCount: number = 0,
  settings: GameSettings
): GameEvent {
  const score = calculateDianPaoScore(fanTypes, gangCount, settings);
  const totalFan = calculateTotalFan(fanTypes, gangCount);

  // 构建描述
  let description = fanTypes.length > 0 ? fanTypes.join(' ') : '小胡';
  if (gangCount > 0) {
    description += ` ${gangCount}杠`;
  }
  description += ` 点炮 ${totalFan}番 得分${score}分`;

  return {
    id: generateUniqueId(),
    timestamp: Date.now(),
    type: 'dian_pao_hu',
    winnerId,
    loserIds: [dianPaoPlayerId],
    fanTypes,
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

// 应用事件到玩家分数（仅影响当前局）
export function applyEventToPlayers(
  event: GameEvent,
  players: Player[]
): Player[] {
  if (event.type === 'hu_pai') {
    // 自摸：胡牌者得分，其他在场玩家失分
    return players.map(player => {
      if (player.id === event.winnerId) {
        // 胡牌者获得分数
        return { ...player, currentRoundScore: player.currentRoundScore + event.score };
      } else if (event.loserIds?.includes(player.id)) {
        // 在场玩家失分：总分数 / 在场玩家数
        const scorePerPlayer = event.score / (event.loserIds?.length || 1);
        return { ...player, currentRoundScore: player.currentRoundScore - scorePerPlayer };
      }
      return player;
    });
  } else if (event.type === 'dian_pao_hu') {
    // 点炮：胡牌者得分，点炮者失分
    return players.map(player => {
      if (player.id === event.winnerId) {
        return { ...player, currentRoundScore: player.currentRoundScore + event.score };
      } else if (event.loserIds?.includes(player.id)) {
        // 点炮者输全部分数
        return { ...player, currentRoundScore: player.currentRoundScore - event.score };
      }
      return player;
    });
  } else if (event.type === 'gang') {
    return players.map(player => {
      if (player.id === event.winnerId) {
        return { ...player, currentRoundScore: player.currentRoundScore + event.score };
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
  if (event.type === 'hu_pai') {
    // 反向自摸
    return players.map(player => {
      if (player.id === event.winnerId) {
        // 反向：胡牌者失去分数
        return { ...player, currentRoundScore: player.currentRoundScore - event.score };
      } else if (event.loserIds?.includes(player.id)) {
        // 反向：在场玩家得回分数
        const scorePerPlayer = event.score / (event.loserIds?.length || 1);
        return { ...player, currentRoundScore: player.currentRoundScore + scorePerPlayer };
      }
      return player;
    });
  } else if (event.type === 'dian_pao_hu') {
    // 反向点炮
    return players.map(player => {
      if (player.id === event.winnerId) {
        return { ...player, currentRoundScore: player.currentRoundScore - event.score };
      } else if (event.loserIds?.includes(player.id)) {
        // 反向：点炮者得回分数
        return { ...player, currentRoundScore: player.currentRoundScore + event.score };
      }
      return player;
    });
  } else if (event.type === 'gang') {
    return players.map(player => {
      if (player.id === event.winnerId) {
        return { ...player, currentRoundScore: player.currentRoundScore - event.score };
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
    return { ...player, currentRoundScore: player.currentRoundScore - baseScore };
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
    return { ...player, currentRoundScore: player.currentRoundScore + baseScore };
  }

  return player;
}

// 结算当前局，将当前局分数累加到总分
export function settleCurrentRound(players: Player[]): Player[] {
  return players.map(player => ({
    ...player,
    totalScore: player.totalScore + player.currentRoundScore,
    currentRoundScore: 0, // 重置当前局分数
  }));
} 