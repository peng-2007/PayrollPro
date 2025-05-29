
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "@shared/schema";

// 数据库连接配置
const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/lms_db";

// 创建PostgreSQL连接池
export const pool = postgres(connectionString, {
  max: 10, // 最大连接数
  idle_timeout: 20, // 空闲超时时间（秒）
  connect_timeout: 10, // 连接超时时间（秒）
});

// 创建Drizzle数据库实例
export const db = drizzle(pool, {
  schema: { users },
});

// 导出类型
export type Database = typeof db;
