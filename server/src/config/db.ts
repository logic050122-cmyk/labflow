import mysql from "mysql2/promise";

import { env } from "./env";

// 连接池会复用数据库连接，比每次请求都新建连接更高效。
// promise 版本允许后续 repository 使用 async/await。
export const db = mysql.createPool({
  host: env.database.host,
  port: env.database.port,
  user: env.database.user,
  password: env.database.password,
  database: env.database.name,
  connectionLimit: env.database.connectionLimit,//连接池允许的最大并发连接数，按并发需求调整
  waitForConnections: true,//当连接池达到最大连接数时，新的连接请求会排队等待，直到有可用连接为止。
  queueLimit: 0,//队列限制为 0，表示没有限制，所有等待的连接请求都会被排队。
  charset: "utf8mb4" //使用 utf8mb4 字符集，支持存储 Emoji 等特殊字符。
});

// 启动时借出并归还一个连接，用来尽早发现数据库配置错误。就是测试用的
export const connectDatabase = async (): Promise<void> => {
  const connection = await db.getConnection();//借出一个连接，检查数据库是否可用
  connection.release();//归还连接，避免占用连接池资源
};

// 应用退出前关闭整个连接池，防止连接继续占用 MySQL 资源。
export const closeDatabase = async (): Promise<void> => {
  await db.end();
};
