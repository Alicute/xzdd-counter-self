// 玩家信息
export interface Player {
  id: string;
  name: string;
  score: number;
}

// 所有番型都可以叠加
export enum FanType {
  // 基础番型
  XIAO_HU = '小胡', // 0番
  DA_DUI_ZI = '大对子', // 1番
  JIN_GOU_DIAO = '金钩钓', // 2番
  XIAO_QI_DUI = '小七对', // 2番
  LONG_QI_DUI = '龙七对', // 3番
  QING_YI_SE = '清一色', // 2番

  // 特殊番型
  GANG_SHANG_HUA = '杠上花', // 2番
  GANG_SHANG_PAO = '杠上炮', // 1番
  HAI_DI_LAO = '海底捞', // 1番
}

// 杠牌类型
export enum GangType {
  AN_GANG = '暗杠', // 每家2分
  BA_GANG = '巴杠', // 每家1分
  DIAN_GANG = '点杠', // 2分
}

// 牌局事件
export interface GameEvent {
  id: string;
  timestamp: number;
  type: 'dian_pao_hu' | 'hu_pai' | 'gang';
  winnerId: string;
  loserIds?: string[];
  fanTypes?: FanType[]; // 所有番型（可叠加）
  gangType?: GangType;
  gangTargetIds?: string[]; // 被杠的玩家ID列表
  gangCount?: number; // 杠牌数量（用于加番）
  fanCount: number; // 总番数
  score: number; // 得分
  description: string;
}

// 游戏设置
export interface GameSettings {
  maxFan: number; // 几番封顶
  callTransfer: boolean; // 是否呼叫转移
}

// 游戏状态
export interface GameState {
  players: Player[];
  events: GameEvent[];
  settings: GameSettings;
} 