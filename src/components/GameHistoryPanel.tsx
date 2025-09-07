import React, { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';
import type { GameArchive } from '../types/archive';

const GameHistoryPanel: React.FC = () => {
  const [archives, setArchives] = useState<GameArchive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        setIsLoading(true);
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

    fetchArchives();
  }, []);

  if (isLoading) {
    return <div className="p-4 bg-gray-800 rounded-lg shadow-inner text-center"><p>正在加载历史记录...</p></div>;
  }

  if (error) {
    return <div className="p-4 bg-gray-800 rounded-lg shadow-inner text-center"><p className="text-red-400">{error}</p></div>;
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-inner">
      <h3 className="text-xl font-bold mb-4 text-center border-b border-gray-600 pb-2">牌局历史</h3>
      {archives.length === 0 ? (
        <p className="text-center text-gray-400 mt-4">暂无历史记录</p>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {archives.map((archive) => (
            <li key={archive.id} className="p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors duration-200">
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