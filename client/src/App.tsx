import { useState, useEffect } from "react";
import { Route, Switch } from "wouter";

interface User {
  id: number;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

async function apiRequest(method: string, path: string, data?: unknown) {
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查用户认证状态
  useEffect(() => {
    async function checkAuth() {
      console.log('检查认证状态...');
      try {
        const res = await apiRequest('GET', '/api/auth/me');
        const userData = await res.json();
        console.log('用户已认证:', userData);
        setUser(userData);
      } catch (error) {
        console.log('用户未认证');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">正在加载...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-center mb-6">登录</h2>
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/api/sso/login'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              使用SSO登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">薪资管理系统</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">欢迎, {user.firstName || user.username}</span>
              <button
                onClick={() => window.location.href = user.ssoId ? '/api/sso/logout' : '/api/auth/logout'}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Switch>
          <Route path="/">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4">仪表板</h2>
              <p>欢迎使用薪资管理系统！</p>
              <p>用户: {user.username} ({user.role})</p>
            </div>
          </Route>
          <Route>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4">页面未找到</h2>
              <p>请检查URL是否正确。</p>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

export default App;