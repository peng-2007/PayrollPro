
import { useState, useEffect } from "react";
import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { AuthPage } from "./pages/auth";
import { Dashboard } from "./pages/dashboard";
import { Employees } from "./pages/employees";
import { Payroll } from "./pages/payroll";
import { SalaryConfiguration } from "./pages/salary-configuration";
import { Benefits } from "./pages/benefits";
import { Settings } from "./pages/settings";
import { NotFound } from "./pages/not-found";

interface User {
  id: number;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  ssoId?: string;
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

const queryClient = new QueryClient();

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

  // 处理本地登录
  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', {
        username,
        password
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  };

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
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-gray-900">薪资管理系统</h1>
                </div>
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-4">
                    <a href="/" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                      仪表板
                    </a>
                    <a href="/employees" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                      员工管理
                    </a>
                    <a href="/salary-configuration" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                      薪资配置
                    </a>
                    <a href="/payroll" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                      工资单
                    </a>
                    <a href="/benefits" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                      福利管理
                    </a>
                    {(user.role === 'admin' || user.role === 'manager') && (
                      <a href="/settings" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                        系统设置
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  欢迎, {user.firstName || user.username} 
                  <span className="text-sm text-gray-500 ml-1">({user.role})</span>
                </span>
                <button
                  onClick={() => window.location.href = user.ssoId ? '/api/sso/logout' : '/api/auth/logout'}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  退出
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/employees" component={Employees} />
            <Route path="/salary-configuration" component={SalaryConfiguration} />
            <Route path="/payroll" component={Payroll} />
            <Route path="/benefits" component={Benefits} />
            {(user.role === 'admin' || user.role === 'manager') && (
              <Route path="/settings" component={Settings} />
            )}
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
