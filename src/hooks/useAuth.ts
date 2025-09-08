import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';

/**
 * 一个自定义Hook，用于订阅用户的认证状态。
 * 当认证状态改变时，使用此Hook的组件将自动重新渲染。
 * @returns {boolean} 当前的认证状态
 */
export const useAuth = (): boolean => {
  const [isAuthenticated, setIsAuthenticated] = useState(socketService.auth.getIsAuthenticated());

  useEffect(() => {
    const handleAuthChange = (status: boolean) => {
      setIsAuthenticated(status);
    };

    // 订阅状态变化
    const unsubscribe = socketService.auth.subscribe(handleAuthChange);

    // 组件卸载时取消订阅
    return () => {
      unsubscribe();
    };
  }, []);

  return isAuthenticated;
};