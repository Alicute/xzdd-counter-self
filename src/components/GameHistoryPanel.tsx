import React, { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';
import type { GameArchive } from '../types/archive';
import GameArchiveDetail from './GameArchiveDetail';
import { useAuth } from '../hooks/useAuth'; // 导入 useAuth Hook

const GameHistoryPanel: React.FC = () => {
  const isAuthenticated = useAuth(); // 使用Hook获取认证状态
  const [archives, setArchives] = useState<GameArchive[]>([]);
  const [isLoading, setIsLoading] = useState(false); // 初始时不加载
  const [error, setError] = useState<string | null>(null);
  const [selectedArchive, setSelectedArchive] = useState<GameArchive | null>(null);

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await socketService.getGameArchives();
        if (response.archives) {
          setArchives(response.archives);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (err) {
        setError('获取游戏历史失败，请稍后重试。');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchArchives();
    } else {
      // 如果未认证，重置状态
      setArchives([]);
      setError('需要登录才能查看历史记录');
      setIsLoading(false);
    }
  }, [isAuthenticated]); // 依赖于认证状态

  if (isLoading) {
    return <div className="p-4 bg-gray-800 rounded-lg shadow-inner text-center"><p>正在加载历史记录...</p></div>;
  }

  if (error) {
    return <div className="p-4 bg-gray-800 rounded-lg shadow-inner text-center"><p className="text-red-400">{error}</p></div>;
  }

  if (selectedArchive) {
    // 渲染详情视图
    return (
      <div className="p-4 bg-gray-800 rounded-lg shadow-inner">
        <div className="flex justify-between items-center border-b border-gray-600 pb-2 mb-4">
          <button
            onClick={() => setSelectedArchive(null)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            &larr; 返回列表
          </button>
          <h3 className="text-xl font-bold text-center">对局详情</h3>
          <div className="w-16"></div> {/* 占位，为了让标题居中 */}
        </div>
        <GameArchiveDetail archive={selectedArchive} />
      </div>
    );
  }

  // 渲染列表视图
  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-inner">
      <h3 className="text-xl font-bold mb-4 text-center border-b border-gray-600 pb-2">牌局历史</h3>
      {archives.length === 0 ? (
        <p className="text-center text-gray-400 mt-4">暂无历史记录</p>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {archives.map((archive) => (
            <li
              key={archive.id}
              className="p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
              onClick={() => setSelectedArchive(archive)}
            >
              <p className="font-semibold">房间号: {archive.id}</p>
              <p className="text-sm text-gray-300">
                结束于: {new Date(archive.endedAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GameHistoryPanel;