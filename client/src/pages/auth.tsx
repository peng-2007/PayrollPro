
import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';

interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onDemoLogin: () => Promise<boolean>;
}

export function AuthPage({ onLogin, onDemoLogin }: AuthPageProps) {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // 检查URL参数中的错误信息
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam) {
      let errorMessage = '';
      switch (errorParam) {
        case 'no_token':
          errorMessage = 'SSO登录失败：未收到授权令牌';
          break;
        case 'invalid_user_data':
          errorMessage = 'SSO登录失败：用户数据无效';
          break;
        case 'upsert_failed':
          errorMessage = 'SSO登录失败：用户数据处理失败';
          break;
        case 'auth_failed':
          errorMessage = 'SSO登录失败：认证过程出错';
          break;
        case 'session_error':
          errorMessage = 'SSO登录失败：会话创建失败';
          break;
        case 'session_save_error':
          errorMessage = 'SSO登录失败：会话保存失败';
          break;
        default:
          errorMessage = 'SSO登录失败：未知错误';
      }
      
      setError(errorMessage);
      toast({
        title: "登录失败",
        description: errorMessage,
        variant: "destructive",
      });
      
      // 清除URL参数
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  // 处理本地登录
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await onLogin(username, password);
      if (success) {
        setLocation('/');
      }
    } catch (err) {
      setError('登录失败，请检查用户名和密码');
      toast({
        title: "登录失败",
        description: "用户名或密码错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理演示登录
  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const success = await onDemoLogin();
      if (success) {
        toast({
          title: "登录成功",
          description: "已使用演示账户登录",
        });
        setLocation('/');
      } else {
        throw new Error('演示登录失败');
      }
    } catch (err) {
      setError('演示登录失败');
      toast({
        title: "登录失败",
        description: "演示登录失败，请重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理SSO登录
  const handleSSOLogin = () => {
    toast({
      title: "正在跳转",
      description: "正在跳转到SSO登录页面...",
    });
    
    // 跳转到SSO登录端点
    window.location.href = '/api/sso/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            欢迎使用薪资管理系统
          </CardTitle>
          <CardDescription className="text-gray-600">
            请选择您的登录方式
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="local" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="local">账号登录</TabsTrigger>
              <TabsTrigger value="sso">SSO登录</TabsTrigger>
            </TabsList>
            
            <TabsContent value="local" className="space-y-4">
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    用户名
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    密码
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-10 bg-primary-600 hover:bg-primary-700"
                  disabled={loading}
                >
                  {loading ? '登录中...' : '登录'}
                </Button>
              </form>
              
              <Separator className="my-4" />
              
              <Button 
                onClick={handleDemoLogin}
                variant="outline"
                className="w-full h-10"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {loading ? '登录中...' : '演示账户登录'}
              </Button>
              
              <div className="text-center">
                <div className="text-xs text-gray-500">
                  演示账户：demo_admin / demo123
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sso" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  使用您的企业账户登录
                </div>
                
                <Button 
                  onClick={handleSSOLogin}
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {loading ? '登录中...' : '使用SSO登录'}
                </Button>
                
                <div className="text-xs text-gray-500">
                  将跳转到企业认证页面进行登录
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <Separator className="my-6" />
          
          <div className="text-center text-xs text-gray-500">
            <p>登录即表示您同意我们的服务条款和隐私政策</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthPage;
