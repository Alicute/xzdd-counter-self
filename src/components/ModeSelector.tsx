import { ShieldCheckIcon, WifiIcon } from '@heroicons/react/24/outline';

interface ModeSelectorProps {
  onSelectMode: (mode: 'local' | 'online') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <span className="text-white text-3xl">🀄</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">四川血战到底</h1>
          <p className="text-lg text-gray-600">麻将计分器</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelectMode('local')}
            className="hidden w-full px-6 py-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheckIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">裁判模式</h2>
              <p className="text-sm text-gray-600">单机使用，由一人统一记录所有分数。</p>
            </div>
          </button>
          
          <button
            onClick={() => onSelectMode('online')}
            className="w-full px-6 py-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
              <WifiIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">联机对战模式</h2>
              <p className="text-sm text-gray-600">创建或加入房间，与好友共同计分。</p>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          © 2025 麻将计分器
        </p>
      </div>
    </div>
  );
}