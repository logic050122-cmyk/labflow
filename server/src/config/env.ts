import dotenv from "dotenv";

// 把 server/.env 中的键值加载到 Node.js 的 process.env。
dotenv.config();

// 集中读取字符串变量，避免其他文件到处直接访问 process.env。
const readString = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;

  if (value === undefined) {
    throw new Error(`缺少必需的环境变量: ${key}`);
  }

  return value;
};

// 环境变量原本都是字符串，这里负责转换并检查正数配置。
const readNumber = (key: string, fallback: number): number => {
  const value = Number(process.env[key] ?? fallback);//读取名为 key 的环境变量值

  if (!Number.isFinite(value) || value <= 0) { //值不是有限数，或者小于等于 0”
    throw new Error(`环境变量 ${key} 必须是一个正数.`);
  }

  return value;
};

// 其他模块只读取这个对象，从而获得经过校验且类型明确的配置。
export const env = Object.freeze({// Object.freeze() 方法可以冻结一个对象，使其不能被修改。
  nodeEnv: readString("NODE_ENV", "development"),
  port: readNumber("PORT", 3000),
  database: {
    host: readString("DB_HOST", "127.0.0.1"),
    port: readNumber("DB_PORT", 3306),
    user: readString("DB_USER", "root"),
    password: readString("DB_PASSWORD", ""),
    name: readString("DB_NAME", "labflow"),
    connectionLimit: readNumber("DB_CONNECTION_LIMIT", 10)
  }
});
