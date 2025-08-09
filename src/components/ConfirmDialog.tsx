import { Fragment } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'warning' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = '确认',
  cancelText = '取消'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircleIcon className="w-8 h-8 text-red-500" />;
      case 'info':
        return <CheckCircleIcon className="w-8 h-8 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 focus:ring-red-500';
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500';
      default:
        return 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500';
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Fragment>
      {/* 遮罩层 */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* 对话框容器 */}
        <div className="flex items-center justify-center min-h-screen p-4">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 对话框头部 */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {getIcon()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {title}
                  </h3>
                </div>
              </div>
            </div>

            {/* 对话框内容 */}
            <div className="px-6 py-5">
              <p className="text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>

            {/* 对话框底部 */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-3 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 font-medium transform hover:scale-105 active:scale-95 ${getConfirmButtonClass()}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}