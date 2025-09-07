import { useState, useEffect } from 'react';
import type { GameSettings } from '../types/mahjong';
 
interface SettingsManagerProps {
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
}
 
export default function SettingsManager({ settings, onSettingsChange }: SettingsManagerProps) {
  // 为 pricePerFan 创建一个本地的字符串状态，以获得更好的输入体验
  const [priceStr, setPriceStr] = useState(settings.pricePerFan.toString());

  // 当外部的 settings 变化时，同步本地的 priceStr
  useEffect(() => {
    // 只有当解析后的值与当前输入框的值不同时才更新，避免覆盖用户的输入
    if (parseFloat(priceStr) !== settings.pricePerFan) {
      setPriceStr(settings.pricePerFan.toString());
    }
  }, [settings.pricePerFan]);

  const updateSetting = <K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 允许空字符串、数字、小数点
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPriceStr(value);
      
      // 如果值是有效的浮点数，则更新父组件状态
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0) {
        updateSetting('pricePerFan', numValue);
      }
      // 如果输入框为空，我们不立即更新父组件，等待用户输入有效数字
    }
  };
 
  return (
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

        {/* 底分设置 */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-cyan-50 rounded-xl border border-green-100">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            💰 底分设置 (元/分)
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={priceStr}
            onChange={handlePriceChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/90"
          />
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
            <span className="text-green-500">💡</span>
            设置每分对应的价格，当前默认：1元/分
          </p>
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
            <div className="flex justify-between items-center">
              <span className="text-gray-600">底分:</span>
              <span className="font-medium text-gray-800">
                {settings.pricePerFan} 元/分
              </span>
            </div>
          </div>
        </div>
    </div>
  );
}