import { useState, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import Dashboard from "@/pages/dashboard";
import Benefits from "@/pages/benefits";
import Employees from "@/pages/employees";
import Payroll from "@/pages/payroll";
import SalaryConfiguration from "@/pages/salary-configuration";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import { TopNav } from "@/components/layout/topnav";
import { Sidebar } from "@/components/layout/sidebar";

interface User {
  id: number;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  position?: string;
  avatarUrl?: string;
  ssoId?: string; // SSO用户标识
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

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // 处理本地登录
  async function handleLogin(username: string, password: string) {
    try {
      const res = await apiRequest('POST', '/api/auth/login', { username, password });
      const userData = await res.json();
      setUser(userData);
      setLoading(false);
      toast({
        title: "登录成功",
        description: `欢迎回来，${userData.username}！`,
      });
      return true;
    } catch (error) {
      console.error('Login failed', error);
      toast({
        title: "登录失败",
        description: "用户名或密码无效",
        variant: "destructive",
      });
      return false;
    }
  }

  // 处理退出登录
  async function handleLogout() {
    try {
      // 检查是否是SSO用户
      if (user?.ssoId) {
        // SSO用户使用SSO退出
        window.location.href = '/api/sso/logout';
      } else {
        // 本地用户使用普通退出
        await apiRequest('GET', '/api/auth/logout');
        setUser(null);
        toast({
          title: "退出成功",
          description: "您已成功退出登录",
        });
      }
    } catch (error) {
      console.error('Logout failed', error);
      toast({
        title: "退出失败",
        description: "退出登录时发生错误",
        variant: "destructive",
      });
    }
  }

  // 检查用户认证状态
  useEffect(() => {
    async function checkAuth() {
      console.log('Checking authentication...');
      try {
        const res = await apiRequest('GET', '/api/auth/me');
        const userData = await res.json();
        console.log('User authenticated:', userData);
        setUser(userData);
      } catch (error) {
        console.log('User not authenticated, attempting auto-login');
        // 如果认证失败，检查是否有SSO回调参数
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('token') || urlParams.get('userId')) {
          // 有SSO参数，说明可能是SSO回调，保持loading状态让SSO处理
          console.log('SSO callback detected, waiting for redirect...');
          return;
        }
        console.error('Authentication check failed', error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">正在加载...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav onMobileMenuToggle={() => {}} user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/employees" component={Employees} />
            <Route path="/payroll" component={Payroll} />
            <Route path="/benefits" component={Benefits} />
            <Route path="/salary-configuration" component={SalaryConfiguration} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Toaster>
      <Router />
    </Toaster>
  );
}

export default App;