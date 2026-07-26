import "dotenv/config";

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(scriptDirectory, "..");
const verifyPort = Number(process.env.VERIFY_PORT ?? 3108);
const baseUrl =
  process.env.VERIFY_BASE_URL ?? `http://127.0.0.1:${verifyPort}/api`;

export const databaseConfig = {
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "labflow"
};

export const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const request = async (pathName, options = {}) => {
  const {
    method = "GET",
    body,
    token,
    expectedStatus = 200,
    expectedCode = expectedStatus === 200 ? 0 : undefined
  } = options;

  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();

  assert(
    response.status === expectedStatus,
    `${method} ${pathName} 预期 HTTP ${expectedStatus}，实际为 ${response.status}: ${JSON.stringify(payload)}`
  );

  if (expectedCode !== undefined) {
    assert(
      payload.code === expectedCode,
      `${method} ${pathName} 预期业务码 ${expectedCode}，实际为 ${payload.code}`
    );
  }

  return payload;
};

export const initializeSchemaWhenRequested = async () => {
  if (process.env.VERIFY_INIT_SCHEMA !== "1") {
    return;
  }

  const schema = await fs.readFile(
    path.join(serverDirectory, "migrations", "001_initial_schema.sql"),
    "utf8"
  );
  const connection = await mysql.createConnection({
    ...databaseConfig,
    database: undefined,
    multipleStatements: true
  });

  try {
    await connection.query(schema);
  } finally {
    await connection.end();
  }
};

const waitForServer = async (serverProcess, logs) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`后端提前退出：\n${logs.join("")}`);
    }

    try {
      const response = await fetch(`${baseUrl}/auth/me`);
      if (response.status === 401) {
        return;
      }
    } catch {
      // 服务仍在启动时 fetch 会失败，稍后继续尝试。
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`等待后端启动超时：\n${logs.join("")}`);
};

export const startServer = async () => {
  if (process.env.VERIFY_BASE_URL) {
    return { process: null, logs: [] };
  }

  await fs.access(path.join(serverDirectory, "dist", "server.js"));
  const logs = [];
  const serverProcess = spawn(process.execPath, ["dist/server.js"], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(verifyPort)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  serverProcess.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  serverProcess.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  await waitForServer(serverProcess, logs);
  return { process: serverProcess, logs };
};

export const stopServer = async (serverProcess) => {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill();
  await Promise.race([
    new Promise((resolve) => serverProcess.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000))
  ]);
};
