import type { GameSettings } from '../types/mahjong';

interface SettingsManagerProps {
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
}

export default function SettingsManager({ settings, onSettingsChange }: SettingsManagerProps) {
  const updateSetting = <K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">⚙️</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800">游戏设置</h2>
      </div>

      <div className="space-y-6">
        {/* 封顶番数 */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            🎯 几番封顶
          </label>
          <input
            type="number"
            min="0"
            max="20"
            value={settings.maxFan}
            onChange={(e) => updateSetting('maxFan', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
          />
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
            <span className="text-blue-500">💡</span>
            设置为0表示不封顶，当前默认：4番封顶
          </p>
        </div>

        {/* 呼叫转移 */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.callTransfer}
                onChange={(e) => updateSetting('callTransfer', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-all duration-300 ${settings.callTransfer
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                  : 'bg-gray-300'
                }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-300 ${settings.callTransfer ? 'translate-x-6' : 'translate-x-0.5'
                  } top-0.5 absolute`}></div>
              </div>
            </div>
            <div className="ml-4">
              <span className="text-sm font-semibold text-gray-700">
                🔄 呼叫转移
              </span>
              <p className="text-sm text-gray-600 mt-1">
                开启后杠钱归接杠上炮的玩家
              </p>
            </div>
          </label>
        </div>

        {/* 当前设置总览 */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            📋 当前设置
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">封顶番数:</span>
              <span className="font-medium text-gray-800">
                {settings.maxFan === 0 ? '不封顶' : `${settings.maxFan}番`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">呼叫转移:</span>
              <span className={`font-medium ${settings.callTransfer ? 'text-green-600' : 'text-gray-600'}`}>
                {settings.callTransfer ? '开启' : '关闭'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}