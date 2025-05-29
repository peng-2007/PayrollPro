import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { setupSSO } from "./ssoAuth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 添加请求日志中间件
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`${new Date().toLocaleTimeString()} [express] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms :: ${typeof data === 'string' ? data.slice(0, 100) : JSON.stringify(data).slice(0, 100)}`);
    return originalSend.call(this, data);
  };

  next();
});

(async () => {
  // 首先设置SSO认证（包含session和passport配置）
  console.log('Setting up SSO authentication...');
  await setupSSO(app);
  
  // 然后注册API路由
  const server = await registerRoutes(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log('SSO authentication enabled');
  });
})();