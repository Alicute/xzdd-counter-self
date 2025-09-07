import { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
  error?: string | null;
  isLoading: boolean;
}

// 花名生成器
const generateRandomName = () => {
  // 新词库，用于生成2-3字花名
  const surnames = [
    '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '风', '云', '龙', '虎', '叶', '花', '陆',
    '楚', '萧', '司马', '上官', '欧阳', '东方', '西门', '南宫', '北堂'
  ];
  const givenNames = [
    '日天', '傲天', '霸天', '胜天', '良辰', '逍遥', '无忌', '寻欢', '冲', '风', '影', '凡',
    '孤城', '吹雪', '花满楼', '小鱼儿', '无缺', '过', '莫愁', '语嫣', '婉清', '灵珊',
    '不败', '求败', '秋水', '行云', '沧海'
  ];
  
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
  

  if (givenName.length === 2 && Math.random() < 0.5) {
      return givenName;
  }

  return `${surname}${givenName}`;
};


export default function Login({ onLogin, error, isLoading }: LoginProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  const handleRandomizeName = () => {
    setUsername(generateRandomName());
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-8 bg-white shadow-lg rounded-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">欢迎使用</h1>
          <p className="mt-2 text-gray-600">请输入您的昵称以继续</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="sr-only">
              昵称
            </label>
            <div className="flex items-center gap-2">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                minLength={2}
                maxLength={10}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="请输入2-10位的昵称"
              />
              <button
                type="button"
                onClick={handleRandomizeName}
                className="px-3 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm flex-shrink-0"
                title="随机生成一个花名"
              >
                🎲
              </button>
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              {isLoading ? '登录中...' : '进入大厅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}