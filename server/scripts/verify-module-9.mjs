import "dotenv/config";

import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import mysql from "mysql2/promise";

import {
  assert,
  databaseConfig,
  initializeSchemaWhenRequested,
  request,
  startServer,
  stopServer
} from "./verify-modules-7-8.helpers.mjs";

// 与公共 startServer 助手保持同一个默认端口；需要并行运行时可用环境变量覆盖。
const verifyPort = Number(process.env.VERIFY_PORT ?? 3108);
const baseUrl =
  process.env.VERIFY_BASE_URL ?? `http://127.0.0.1:${verifyPort}/api`;
const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const password = "Module9Pass!";
const users = {
  owner: {
    username: `m9_owner_${suffix}`,
    nickname: "模块九负责人"
  },
  member: {
    username: `m9_member_${suffix}`,
    nickname: "模块九成员"
  },
  outsider: {
    username: `m9_outsider_${suffix}`,
    nickname: "模块九外部用户"
  }
};

let database;
let projectId;
let serverProcess;
let serverLogs = [];

const createFormData = (input = {}) => {
  const {
    fieldName = "file",
    fileName = "module-9.txt",
    mimeType = "text/plain",
    content = "module-9-file-content"
  } = input;
  const formData = new FormData();
  formData.append(
    fieldName,
    new Blob([content], { type: mimeType }),
    fileName
  );
  return formData;
};

const requestMultipart = async (pathName, options = {}) => {
  const {
    token,
    formData,
    expectedStatus = 200,
    expectedCode = expectedStatus === 200 ? 0 : undefined
  } = options;
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });
  const payload = await response.json();

  assert(
    response.status === expectedStatus,
    `POST ${pathName} 预期 HTTP ${expectedStatus}，实际为 ${response.status}: ${JSON.stringify(payload)}`
  );

  if (expectedCode !== undefined) {
    assert(
      payload.code === expectedCode,
      `POST ${pathName} 预期业务码 ${expectedCode}，实际为 ${payload.code}`
    );
  }

  return payload;
};

const requestDownload = async (fileId, options = {}) => {
  const {
    token,
    expectedStatus = 200,
    expectedCode = expectedStatus === 200 ? undefined : 0
  } = options;
  const response = await fetch(`${baseUrl}/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  assert(
    response.status === expectedStatus,
    `GET /files/${fileId}/download 预期 HTTP ${expectedStatus}，实际为 ${response.status}`
  );

  if (expectedStatus === 200) {
    return {
      content: await response.text(),
      contentDisposition: response.headers.get("content-disposition")
    };
  }

  const payload = await response.json();
  if (expectedCode !== undefined) {
    assert(
      payload.code === expectedCode,
      `下载接口预期业务码 ${expectedCode}，实际为 ${payload.code}`
    );
  }

  return payload;
};

// 该验收脚本只适合 CI 或没有业务文件的独立测试环境。
// cleanup 位于 finally 中，所以脚本成功或中途失败都会执行；当前会删除整个
// server/uploads，不能在保存了真实上传文件的本地环境直接运行。
const cleanup = async () => {
  if (database) {
    try {
      await database.beginTransaction();
      if (projectId) {
        // 模块十接入后，创建任务会产生通知，先清理通知再删除关联任务。
        await database.execute("DELETE FROM notifications WHERE project_id = ?", [projectId]);
        await database.execute("DELETE FROM files WHERE project_id = ?", [projectId]);
        await database.execute("DELETE FROM tasks WHERE project_id = ?", [projectId]);
        await database.execute("DELETE FROM project_members WHERE project_id = ?", [projectId]);
        await database.execute("DELETE FROM projects WHERE id = ?", [projectId]);
      }
      await database.execute(
        "DELETE FROM users WHERE username IN (?, ?, ?)",
        [users.owner.username, users.member.username, users.outsider.username]
      );
      await database.commit();
    } catch (error) {
      await database.rollback();
      console.error("模块九验收数据清理失败：", error);
    } finally {
      await database.end();
    }
  }

  await rm(path.resolve("uploads"), { recursive: true, force: true });
};

try {
  const requiredFiles = [
    "src/config/upload.ts",
    "src/modules/files/files.routes.ts",
    "src/modules/files/files.controller.ts",
    "src/modules/files/files.service.ts",
    "src/modules/files/files.repository.ts",
    "src/modules/files/files.validator.ts",
    "src/modules/files/files.types.ts",
    "src/modules/files/files.storage.ts"
  ];

  for (const relativePath of requiredFiles) {
    assert(existsSync(path.resolve(relativePath)), `缺少 ${relativePath}`);
  }

  const appSource = await readFile(path.resolve("src/app.ts"), "utf8");
  assert(
    /app\.use\("\/api", fileRoutes\)/.test(appSource),
    "app.ts 未挂载文件路由"
  );

  const databaseSource = await readFile(path.resolve("../docs/DATABASE.md"), "utf8");
  assert(/### 4\.6 files/.test(databaseSource), "数据库文档缺少既有 files 表");
  const migrationSource = await readFile(
    path.resolve("migrations/001_initial_schema.sql"),
    "utf8"
  );
  assert(
    /CREATE TABLE IF NOT EXISTS `files`/.test(migrationSource),
    "初始化迁移缺少既有 files 表"
  );

  await initializeSchemaWhenRequested();
  database = await mysql.createConnection(databaseConfig);

  const started = await startServer();
  serverProcess = started.process;
  serverLogs = started.logs;

  for (const user of Object.values(users)) {
    await request("/auth/register", {
      method: "POST",
      body: { ...user, password }
    });
  }

  const login = async (username) => {
    const result = await request("/auth/login", {
      method: "POST",
      body: { username, password }
    });
    return result.data.token;
  };

  const ownerToken = await login(users.owner.username);
  const memberToken = await login(users.member.username);
  const outsiderToken = await login(users.outsider.username);
  const owner = (await request("/auth/me", { token: ownerToken })).data.user;
  const member = (await request("/auth/me", { token: memberToken })).data.user;

  const [projectResult] = await database.execute(
    `INSERT INTO projects
      (name, description, owner_user_id, status, start_date, end_date, invite_code)
     VALUES (?, ?, ?, 'active', '2026-07-01', '2026-08-31', ?)`,
    ["模块九自动验收项目", "验证文件上传下载和权限", owner.id, `M9${suffix}`]
  );
  projectId = Number(projectResult.insertId);

  await database.execute(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES (?, ?, 'owner'), (?, ?, 'member')`,
    [projectId, owner.id, projectId, member.id]
  );

  const [taskResult] = await database.execute(
    `INSERT INTO tasks
      (project_id, title, description, assignee_user_id, creator_user_id, priority, status)
     VALUES (?, '模块九验收任务', '验证任务附件', ?, ?, 'medium', 'doing')`,
    [projectId, member.id, owner.id]
  );
  const taskId = Number(taskResult.insertId);

  let projectFiles = (
    await request(`/projects/${projectId}/files`, { token: memberToken })
  ).data.files;
  assert(projectFiles.length === 0, "新项目文件列表应为空");

  let taskFiles = (
    await request(`/tasks/${taskId}/files`, { token: memberToken })
  ).data.files;
  assert(taskFiles.length === 0, "新任务附件列表应为空");

  await request(`/projects/${projectId}/files`, {
    token: outsiderToken,
    expectedStatus: 404,
    expectedCode: 40401
  });
  await request(`/tasks/${taskId}/files`, {
    token: outsiderToken,
    expectedStatus: 404,
    expectedCode: 40401
  });

  await requestMultipart(`/projects/${projectId}/files`, {
    token: memberToken,
    formData: createFormData(),
    expectedStatus: 403,
    expectedCode: 40301
  });
  await requestMultipart(`/projects/${projectId}/files`, {
    token: ownerToken,
    formData: createFormData({
      fieldName: "attachment",
      fileName: "wrong-field.txt"
    }),
    expectedStatus: 400,
    expectedCode: 40001
  });
  await requestMultipart(`/projects/${projectId}/files`, {
    token: ownerToken,
    formData: createFormData({
      fileName: "unsupported.html",
      mimeType: "text/html",
      content: "<p>unsupported</p>"
    }),
    expectedStatus: 400,
    expectedCode: 40001
  });

  const projectContent = `project-file-${suffix}`;
  const projectFile = (
    await requestMultipart(`/projects/${projectId}/files`, {
      token: ownerToken,
      formData: createFormData({
        fileName: "project-file.txt",
        content: projectContent
      })
    })
  ).data.file;
  assert(projectFile.projectId === projectId, "项目文件 projectId 错误");
  assert(projectFile.taskId === null, "项目文件 taskId 应为空");
  assert(projectFile.category === "project", "项目文件 category 应为 project");
  assert(projectFile.originalName === "project-file.txt", "应返回原始文件名");
  assert(projectFile.canDelete === true, "Owner 应可删除项目文件");
  assert(!("storedName" in projectFile), "接口不应暴露 storedName");
  assert(!("storagePath" in projectFile), "接口不应暴露 storagePath");

  projectFiles = (
    await request(`/projects/${projectId}/files`, { token: memberToken })
  ).data.files;
  assert(projectFiles.length === 1, "成员应能查看项目文件");
  assert(projectFiles[0].canDelete === false, "普通成员不能删除 Owner 项目文件");

  const downloadedProjectFile = await requestDownload(projectFile.id, {
    token: memberToken
  });
  assert(
    downloadedProjectFile.content === projectContent,
    "下载的项目文件内容不正确"
  );
  assert(
    downloadedProjectFile.contentDisposition?.includes("attachment"),
    "下载响应应使用 attachment"
  );

  await requestDownload(projectFile.id, {
    token: outsiderToken,
    expectedStatus: 404,
    expectedCode: 40401
  });
  await request(`/files/${projectFile.id}`, {
    method: "DELETE",
    token: memberToken,
    expectedStatus: 403,
    expectedCode: 40301
  });

  const memberTaskContent = `member-task-file-${suffix}`;
  const memberTaskFile = (
    await requestMultipart(`/tasks/${taskId}/files`, {
      token: memberToken,
      formData: createFormData({
        fileName: "member-task.txt",
        content: memberTaskContent
      })
    })
  ).data.file;
  assert(memberTaskFile.taskId === taskId, "任务附件 taskId 错误");
  assert(memberTaskFile.category === "task", "任务附件 category 应为 task");
  assert(memberTaskFile.canDelete === true, "上传人应可删除自己的任务附件");

  taskFiles = (
    await request(`/tasks/${taskId}/files`, { token: ownerToken })
  ).data.files;
  assert(taskFiles.length === 1, "Owner 应能查看任务附件");
  assert(taskFiles[0].canDelete === true, "Owner 应可删除成员上传的任务附件");

  await request(`/files/${memberTaskFile.id}`, {
    method: "DELETE",
    token: ownerToken
  });
  taskFiles = (
    await request(`/tasks/${taskId}/files`, { token: memberToken })
  ).data.files;
  assert(taskFiles.length === 0, "删除后任务附件列表应为空");

  const archivedTaskFile = (
    await requestMultipart(`/tasks/${taskId}/files`, {
      token: memberToken,
      formData: createFormData({
        fileName: "archived-history.txt",
        content: "archived-history"
      })
    })
  ).data.file;

  await database.execute(
    "UPDATE projects SET status = 'archived', archived_at = NOW() WHERE id = ?",
    [projectId]
  );

  await requestMultipart(`/projects/${projectId}/files`, {
    token: ownerToken,
    formData: createFormData({ fileName: "archived-project.txt" }),
    expectedStatus: 409,
    expectedCode: 40904
  });
  await requestMultipart(`/tasks/${taskId}/files`, {
    token: memberToken,
    formData: createFormData({ fileName: "archived-task.txt" }),
    expectedStatus: 409,
    expectedCode: 40904
  });

  projectFiles = (
    await request(`/projects/${projectId}/files`, { token: ownerToken })
  ).data.files;
  taskFiles = (
    await request(`/tasks/${taskId}/files`, { token: memberToken })
  ).data.files;
  assert(projectFiles[0].canDelete === false, "归档后项目文件应只读");
  assert(taskFiles[0].canDelete === false, "归档后任务附件应只读");

  await requestDownload(projectFile.id, { token: ownerToken });
  await request(`/files/${archivedTaskFile.id}`, {
    method: "DELETE",
    token: ownerToken,
    expectedStatus: 409,
    expectedCode: 40904
  });

  await database.execute(
    "DELETE FROM project_members WHERE project_id = ? AND user_id = ?",
    [projectId, member.id]
  );
  await request(`/tasks/${taskId}/files`, {
    token: memberToken,
    expectedStatus: 404,
    expectedCode: 40401
  });
  await requestDownload(projectFile.id, {
    token: memberToken,
    expectedStatus: 404,
    expectedCode: 40401
  });

  console.log("模块九真实 HTTP + MySQL 文件验收通过。");
} catch (error) {
  if (serverLogs.length > 0) {
    console.error("后端输出：\n", serverLogs.join(""));
  }
  throw error;
} finally {
  await cleanup();
  await stopServer(serverProcess);
}
