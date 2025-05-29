import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, Request, Response, NextFunction } from "express";
import ConnectPgSimple from "connect-pg-simple";
import { pool, db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import axios from "axios";

// SSO配置
const SSO_SERVER =
    process.env.SSO_SERVER ||
    "https://user-management-hub-thinkingbird.replit.app";
const SSO_AUTH_URL = `${SSO_SERVER}/api/sso/auth`;
const SSO_USERINFO_URL = `${SSO_SERVER}/api/sso/userinfo`;
const SSO_LOGOUT_URL = `${SSO_SERVER}/api/sso/logout`;

// 根据请求主机动态确定回调URL
const getCallbackUrl = (req: Request) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    return `${protocol}://${host}/api/sso/callback`;
};

export function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 一周时间
    const PgStore = ConnectPgSimple(session);
    return session({
        store: new PgStore({
            pool: pool,
            tableName: "sessions",
            createTableIfMissing: true, // 重新启用自动创建表
        }),
        secret: process.env.SESSION_SECRET || "lms-session-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: sessionTtl,
        },
    });
}

// 从SSO数据创建或更新用户信息的函数
async function upsertUser(userData: any) {
    console.log("[upsertUser] 开始处理用户数据:", userData);

    if (!pool) {
        console.error("[upsertUser] 数据库连接池未初始化");
        throw new Error("数据库连接未初始化");
    }

    const ssoId = (userData.sub || userData.username)?.trim();
    if (!ssoId) {
        console.error("[upsertUser] 无效的ssoId:", {
            sub: userData.sub,
            username: userData.username,
        });
        throw new Error("无效的ssoId: 用户数据缺少sub和username字段");
    }

    const username = (userData.username || userData.sub)?.trim();
    if (!username) {
        console.error("[upsertUser] 无效的username");
        throw new Error("无效的username");
    }

    try {
        console.log("[upsertUser] 查询现有用户, ssoId:", ssoId);

        // 优先根据 ssoId 查询
        const existingUsersBySsoId = await db
            .select()
            .from(users)
            .where(eq(users.ssoId, ssoId))
            .limit(1);

        let existingUser = existingUsersBySsoId[0];

        // 如果没有找到用户，再根据 username 查询，防止重复插入
        if (!existingUser) {
            console.log(
                "[upsertUser] 根据ssoId未找到用户，尝试根据username查询:",
                username,
            );
            const existingUsersByUsername = await db
                .select()
                .from(users)
                .where(eq(users.username, username))
                .limit(1);
            existingUser = existingUsersByUsername[0];
        }

        if (existingUser) {
            console.log(
                "[upsertUser] 找到现有用户，准备更新:",
                existingUser.id,
            );

            // 如果 ssoId 不同，更新 ssoId
            if (existingUser.ssoId !== ssoId) {
                console.log("[upsertUser] 更新用户ssoId");
                await db
                    .update(users)
                    .set({ ssoId })
                    .where(eq(users.id, existingUser.id));
            }

            const updatedUsers = await db
                .update(users)
                .set({
                    firstName:
                        userData.first_name ||
                        userData.name?.split(" ")[0] ||
                        existingUser.firstName,
                    lastName:
                        userData.last_name ||
                        userData.name?.split(" ").slice(1).join(" ") ||
                        existingUser.lastName,
                    email: userData.email || existingUser.email,
                    avatarUrl:
                        userData.profile_image_url || existingUser.avatarUrl,
                    lastLogin: new Date(),
                })
                .where(eq(users.id, existingUser.id))
                .returning();

            console.log("[upsertUser] 用户更新成功:", updatedUsers[0]?.id);
            return updatedUsers[0];
        } else {
            console.log("[upsertUser] 创建新用户");

            // 创建新用户
            const newUsers = await db
                .insert(users)
                .values({
                    username,
                    firstName:
                        userData.first_name ||
                        userData.name?.split(" ")[0] ||
                        username,
                    lastName:
                        userData.last_name ||
                        userData.name?.split(" ").slice(1).join(" ") ||
                        "",
                    email: userData.email || `${username}@example.com`,
                    role: "employee",
                    ssoId,
                    tenantId: userData.tenantId || 1,
                    avatarUrl: userData.profile_image_url,
                    lastLogin: new Date(),
                })
                .returning();

            console.log("[upsertUser] 新用户创建成功:", newUsers[0]?.id);
            return newUsers[0];
        }
    } catch (dbError) {
        console.error("[upsertUser] 数据库操作失败:", dbError);
        throw new Error(
            `数据库操作失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
        );
    }
}

// 设置SSO认证
export async function setupSSO(app: Express) {
    // 设置会话中间件
    app.use(getSession());
    app.use(passport.initialize());
    app.use(passport.session());

    // 序列化和反序列化用户，用于会话管理
    passport.serializeUser((user: any, done) => {
        // console.log('序列化用户:', user);
        done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
        try {
            // 直接查 pg 数据库，确保 session 用户和 SSO 用户一致
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, id));
            done(null, user);
        } catch (error) {
            console.error("反序列化失败:", error);
            done(error, null);
        }
    });

    // 配置本地认证策略
    passport.use(
        new LocalStrategy(
            {
                usernameField: "username",
                passwordField: "password",
            },
            async (username: string, password: string, done) => {
                try {
                    const [user] = await db
                        .select()
                        .from(users)
                        .where(eq(users.username, username));

                    if (!user) {
                        return done(null, false, { message: "用户名不存在" });
                    }

                    // 简单密码验证（实际项目中应该使用bcrypt等哈希验证）
                    if (user.password !== password) {
                        return done(null, false, { message: "密码错误" });
                    }

                    // 更新最后登录时间
                    await db
                        .update(users)
                        .set({ lastLogin: new Date() })
                        .where(eq(users.id, user.id));

                    return done(null, user);
                } catch (error) {
                    return done(error);
                }
            },
        ),
    );

    // 创建简化的本地登录策略
    app.post("/api/auth/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res
                    .status(401)
                    .json({ message: info.message || "无效的凭据" });
            }
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                return res.json({
                    id: user.id,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    position: user.position,
                    avatarUrl: user.avatarUrl,
                });
            });
        })(req, res, next);
    });

    // SSO登录路由
    app.get("/api/sso/login", (req, res) => {
        console.log("SSO登录路由: 开始处理请求");
        console.log("请求头:", req.headers);
        console.log("请求方法:", req.method);
        console.log("请求URL:", req.url);

        const callbackUrl = getCallbackUrl(req);
        const redirectUrl = `${SSO_AUTH_URL}?redirect=${encodeURIComponent(callbackUrl)}`;

        console.log("SSO登录请求 - 回调URL:", callbackUrl);
        console.log("SSO登录 - 重定向到:", redirectUrl);
        console.log("SSO_SERVER:", SSO_SERVER);
        console.log("SSO_AUTH_URL:", SSO_AUTH_URL);

        // 设置必要的响应头，确保重定向被正确处理
        res.set({
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            "X-Frame-Options": "SAMEORIGIN", // 防止iframe问题
            "Content-Security-Policy": "frame-ancestors 'self';", // 额外的iframe保护
        });

        // 执行重定向
        res.redirect(302, redirectUrl);

        console.log("重定向响应已发送，状态码: 302");
        console.log("SSO登录路由: 处理完成");
    });

    // SSO回调路由
    app.get("/api/sso/callback", async (req, res) => {
        const { token, userId } = req.query;

        console.log("SSO回调接收到参数:", { token, userId });

        if (!token && !userId) {
            console.error("SSO回调错误: 没有接收到token或userId");
            return res.redirect("/auth?error=no_token");
        }

        try {
            let userData;
            let ssoResponse = null;

            // 尝试从SSO服务器获取用户信息
            if (token) {
                try {
                    console.log("尝试从SSO服务器获取用户信息");
                    const response = await axios.get(
                        `${SSO_USERINFO_URL}?token=${token}`,
                        {
                            headers: {
                                Accept: "application/json",
                            },
                        },
                    );

                    ssoResponse = response.data;
                    console.log("SSO服务器响应:", ssoResponse);

                    if (
                        ssoResponse &&
                        (ssoResponse.code === 200 ||
                            ssoResponse.status === "success") &&
                        ssoResponse.data
                    ) {
                        userData = ssoResponse.data;
                    }
                } catch (axiosError) {
                    // @ts-ignore
                    console.error(
                        "从SSO服务器获取用户信息失败:",
                        axiosError.message || axiosError,
                    );
                }
            }

            // 如果无法从SSO服务器获取用户信息，使用userId生成默认数据
            if (!userData && userId) {
                console.log("使用userId生成默认用户数据");
                userData = {
                    sub: userId as string,
                    username: userId as string,
                    name: userId === "admin" ? "系统管理员" : "用户" + userId,
                    email: `${userId}@example.com`,
                    tenantId: 1,
                };
            }

            if (!userData) {
                console.error("无法创建用户数据");
                return res.redirect("/auth?error=invalid_user_data");
            }

            console.log("即将创建或更新用户:", userData);
            userData.sub ??= userData.username; // 确保 sub 存在
            console.log("[upsertUser] received:", userData);

            try {
                // 增加数据库连接检查
                if (!pool) throw new Error("数据库连接未初始化");

                // 增强ssoId处理
                const ssoId = (userData.sub || userData.username)?.trim();
                if (!ssoId) {
                    throw new Error(
                        "无效的ssoId: 用户数据缺少sub和username字段",
                    );
                }
                console.log("[upsertUser] 使用ssoId查询:", ssoId);

                const [existingUser] = await db
                    .select()
                    .from(users)
                    .where(eq(users.ssoId, ssoId))
                    .catch((err) => {
                        console.error(
                            "[upsertUser] 查询失败:",
                            err?.message || err,
                        );
                        throw new Error("用户查询失败: " + err.message);
                    });
                console.log("[upsertUser] existingUser:", existingUser);
            } catch (err) {
                // 只打印核心信息，避免显示浏览器专属ErrorEvent对象
                // @ts-ignore
                console.error("[upsertUser] 查询失败:", err?.message || err);
                console.error("错误构造器:", err?.constructor?.name);
                console.error("是否是 Error:", err instanceof Error);
                throw err;
            }

            try {
                console.log("即将调用 upsertUser...", userData);
                const user = await upsertUser(userData);
                console.log("✅ 用户信息:", user);

                // 提取干净字段（包含ssoId以标识SSO用户）
                const safeUser = {
                    id: user.id,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    position: user.position,
                    avatarUrl: user.avatarUrl,
                    ssoId: user.ssoId, // 标识这是SSO用户
                };

                req.login(safeUser, (err) => {
                    if (err) {
                        console.error("登录错误:", err);
                        return res.redirect("/auth?error=session_error");
                    }

                    console.log("用户登录成功:", safeUser.username);
                    console.log("Passport用户数据:", req.user);
                    console.log("认证状态:", req.isAuthenticated());

                    // 确保会话保存后再重定向
                    req.session.save((saveErr) => {
                        if (saveErr) {
                            console.error("会话保存错误:", saveErr);
                            return res.redirect(
                                "/auth?error=session_save_error",
                            );
                        }
                        console.log("会话保存成功，重定向到根路径");

                        // 登录成功后直接重定向到根路径
                        return res.redirect(`/`);
                    });
                });
            } catch (err) {
                console.error(
                    "❌ upsertUser 执行失败:",
                    err instanceof Error ? err.stack : err,
                );
                return res.redirect("/auth?error=upsert_failed");
            }
        } catch (error) {
            console.error("SSO回调处理错误:", error);
            return res.redirect("/auth?error=auth_failed");
        }
    });

    // SSO登出路由
    app.get("/api/sso/logout", (req, res) => {
        console.log("SSO退出登录请求");

        req.logout((err) => {
            if (err) {
                console.error("Passport登出错误:", err);
            }

            // 销毁会话
            req.session.destroy((sessionErr) => {
                if (sessionErr) {
                    console.error("会话销毁错误:", sessionErr);
                }

                // 清除会话cookie
                res.clearCookie("connect.sid");

                // 重定向到SSO登出页面
                const protocol =
                    req.headers["x-forwarded-proto"] || req.protocol;
                const host = req.get("host");
                const logoutRedirectUrl = encodeURIComponent(
                    `${protocol}://${host}/auth`,
                );

                const ssoLogoutUrl = `${SSO_LOGOUT_URL}?redirect=${logoutRedirectUrl}`;
                console.log("重定向到SSO退出页面:", ssoLogoutUrl);

                res.redirect(ssoLogoutUrl);
            });
        });
    });

    // 获取当前用户信息路由
    app.get("/api/auth/me", (req, res) => {
        console.log("检查用户认证状态:", req.isAuthenticated());
        console.log("当前用户:", req.user);

        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ message: "未授权" });
        }

        const user = req.user as any;
        const safeUser = {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            department: user.department,
            position: user.position,
            avatarUrl: user.avatarUrl,
            ssoId: user.ssoId, // 包含ssoId以区分SSO用户和本地用户
        };

        res.json(safeUser);
    });

    // 演示登录路由
    app.post("/api/auth/demo-login", async (req, res) => {
        try {
            // 查找演示管理员账户
            const [demoUser] = await db
                .select()
                .from(users)
                .where(eq(users.username, "demo_admin"));

            if (!demoUser) {
                return res.status(404).json({ message: "演示账户不存在" });
            }

            // 更新最后登录时间
            await db
                .update(users)
                .set({ lastLogin: new Date() })
                .where(eq(users.id, demoUser.id));

            req.login(demoUser, (err) => {
                if (err) {
                    console.error("演示登录错误:", err);
                    return res.status(500).json({ message: "登录失败" });
                }

                console.log("演示用户登录成功:", demoUser.username);

                return res.json({
                    id: demoUser.id,
                    username: demoUser.username,
                    firstName: demoUser.firstName,
                    lastName: demoUser.lastName,
                    email: demoUser.email,
                    role: demoUser.role,
                    department: demoUser.department,
                    position: demoUser.position,
                    avatarUrl: demoUser.avatarUrl,
                });
            });
        } catch (error) {
            console.error("演示登录错误:", error);
            res.status(500).json({ message: "服务器错误" });
        }
    });

    // 普通登出路由
    app.get("/api/auth/logout", (req, res) => {
        console.log("普通退出登录请求");

        req.logout((err) => {
            if (err) {
                console.error("Passport登出错误:", err);
            }

            // 销毁会话
            req.session.destroy((sessionErr) => {
                if (sessionErr) {
                    console.error("会话销毁错误:", sessionErr);
                }

                // 清除会话cookie
                res.clearCookie("connect.sid");

                // 对于API请求返回JSON响应
                if (
                    req.headers.accept &&
                    req.headers.accept.includes("application/json")
                ) {
                    res.json({ message: "退出登录成功" });
                } else {
                    // 对于普通请求重定向到登录页面
                    res.redirect("/auth");
                }
            });
        });
    });
}

// 检查用户是否已认证的中间件
export function isAuthenticated(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (req.isAuthenticated()) {
        return next();
    }

    if (
        req.headers["accept"] &&
        req.headers["accept"].includes("application/json")
    ) {
        return res.status(401).json({ message: "未授权" });
    }

    res.redirect("/auth");
}

// 检查用户是否具有管理员角色的中间件
export function isAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) {
        if (
            req.headers["accept"] &&
            req.headers["accept"].includes("application/json")
        ) {
            return res.status(401).json({ message: "未授权" });
        }
        return res.redirect("/auth");
    }

    const user = req.user as any;
    if (user && user.role === "admin") {
        return next();
    }

    if (
        req.headers["accept"] &&
        req.headers["accept"].includes("application/json")
    ) {
        return res.status(403).json({ message: "禁止访问" });
    }

    res.redirect("/dashboard");
}

// 检查用户是否具有管理员或经理角色的中间件
export function isAdminOrManager(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (!req.isAuthenticated()) {
        if (
            req.headers["accept"] &&
            req.headers["accept"].includes("application/json")
        ) {
            return res.status(401).json({ message: "未授权" });
        }
        return res.redirect("/auth");
    }

    const user = req.user as any;
    if (user && (user.role === "admin" || user.role === "manager")) {
        return next();
    }

    if (
        req.headers["accept"] &&
        req.headers["accept"].includes("application/json")
    ) {
        return res.status(403).json({ message: "禁止访问" });
    }

    res.redirect("/dashboard");
}
