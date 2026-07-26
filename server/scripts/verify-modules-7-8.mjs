import mysql from "mysql2/promise";

import {
  assert,
  databaseConfig,
  initializeSchemaWhenRequested,
  request,
  startServer,
  stopServer
} from "./verify-modules-7-8.helpers.mjs";

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const users = {
  owner: {
    username: `m78_owner_${suffix}`,
    nickname: "模块验收负责人"
  },
  member: {
    username: `m78_member_${suffix}`,
    nickname: "模块验收成员"
  },
  outsider: {
    username: `m78_outsider_${suffix}`,
    nickname: "模块验收外部用户"
  }
};
const password = "Module78Pass!";
let database;
let projectId;
let serverProcess;
let serverLogs = [];

const cleanup = async () => {
  if (!database) {
    return;
  }

  try {
    await database.beginTransaction();
    if (projectId) {
      await database.execute(
        `DELETE task_comments
         FROM task_comments
         INNER JOIN tasks ON tasks.id = task_comments.task_id
         WHERE tasks.project_id = ?`,
        [projectId]
      );
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
    console.error("验收数据清理失败：", error);
  } finally {
    await database.end();
  }
};

try {
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
    ["模块七八自动验收项目", "验证任务审核和评论权限", owner.id, `M78${suffix}`]
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
     VALUES (?, '模块七八验收任务', '验证完整状态流转', ?, ?, 'medium', 'doing')`,
    [projectId, member.id, owner.id]
  );
  const taskId = Number(taskResult.insertId);

  // 模块七：权限、驳回重提、审核人展示字段和最终完成状态。
  await request(`/tasks/${taskId}/submit`, {
    method: "POST",
    token: ownerToken,
    body: {},
    expectedStatus: 403,
    expectedCode: 40302
  });
  let task = (await request(`/tasks/${taskId}/submit`, {
    method: "POST",
    token: memberToken,
    body: { submitContent: "  第一轮提交  " }
  })).data.task;
  assert(task.status === "submitted", "成员提交后任务应为 submitted");
  assert(task.submitContent === "第一轮提交", "完成说明应去除首尾空格");

  await request(`/tasks/${taskId}/approve`, {
    method: "POST",
    token: memberToken,
    expectedStatus: 403,
    expectedCode: 40301
  });
  task = (await request(`/tasks/${taskId}/reject`, {
    method: "POST",
    token: ownerToken,
    body: { reason: "  请补充验收结果  " }
  })).data.task;
  assert(task.status === "doing", "驳回后任务应回到 doing");
  assert(task.rejectionReason === "请补充验收结果", "驳回原因应正确返回");
  assert(task.reviewerUsername === users.owner.username, "驳回应返回审核人用户名");
  assert(task.reviewerNickname === users.owner.nickname, "驳回应返回审核人昵称");

  task = (await request(`/tasks/${taskId}/submit`, {
    method: "POST",
    token: memberToken,
    body: { submitContent: "第二轮提交并补充验收结果" }
  })).data.task;
  assert(task.rejectionReason === null, "重新提交后应清空驳回原因");
  assert(task.reviewerUsername === null, "重新提交后应清空上一轮审核人");

  task = (await request(`/tasks/${taskId}/approve`, {
    method: "POST",
    token: ownerToken
  })).data.task;
  assert(task.status === "done", "审核通过后任务应为 done");
  assert(task.completedAt, "审核通过后应写入完成时间");
  assert(task.reviewerNickname === users.owner.nickname, "通过后应返回审核人昵称");
  await request(`/tasks/${taskId}/approve`, {
    method: "POST",
    token: ownerToken,
    expectedStatus: 409,
    expectedCode: 40910
  });

  // 模块八：空列表、成员隔离、作者信息和 Owner 删除权限。
  let comments = (await request(`/tasks/${taskId}/comments`, {
    token: memberToken
  })).data.comments;
  assert(comments.length === 0, "新任务评论列表应为空");
  await request(`/tasks/${taskId}/comments`, {
    token: outsiderToken,
    expectedStatus: 404,
    expectedCode: 40401
  });

  const createdComment = (await request(`/tasks/${taskId}/comments`, {
    method: "POST",
    token: memberToken,
    body: { content: "  评论接口验收通过  " }
  })).data.comment;
  assert(createdComment.content === "评论接口验收通过", "评论内容应去除首尾空格");
  assert(createdComment.username === users.member.username, "评论应返回作者用户名");

  comments = (await request(`/tasks/${taskId}/comments`, {
    token: ownerToken
  })).data.comments;
  assert(comments.length === 1, "Owner 应能查看项目评论");
  await request(`/comments/${createdComment.id}`, {
    method: "DELETE",
    token: outsiderToken,
    expectedStatus: 403,
    expectedCode: 40301
  });
  await request(`/comments/${createdComment.id}`, {
    method: "DELETE",
    token: ownerToken
  });

  // 成员关系被撤销后，原成员不能再通过已知 taskId 读取评论。
  await database.execute(
    "DELETE FROM project_members WHERE project_id = ? AND user_id = ?",
    [projectId, member.id]
  );
  await request(`/tasks/${taskId}/comments`, {
    token: memberToken,
    expectedStatus: 404,
    expectedCode: 40401
  });

  const historyComment = (await request(`/tasks/${taskId}/comments`, {
    method: "POST",
    token: ownerToken,
    body: { content: "归档前历史评论" }
  })).data.comment;
  await database.execute(
    "UPDATE projects SET status = 'archived', archived_at = NOW() WHERE id = ?",
    [projectId]
  );
  await request(`/tasks/${taskId}/comments`, {
    method: "POST",
    token: ownerToken,
    body: { content: "归档后不应创建" },
    expectedStatus: 409,
    expectedCode: 40904
  });
  comments = (await request(`/tasks/${taskId}/comments`, {
    token: ownerToken
  })).data.comments;
  assert(comments.length === 1, "归档后仍应能查看历史评论");
  await request(`/comments/${historyComment.id}`, {
    method: "DELETE",
    token: ownerToken
  });

  console.log("模块七、模块八真实 HTTP + MySQL 验收通过。");
} catch (error) {
  if (serverLogs.length > 0) {
    console.error("后端输出：\n", serverLogs.join(""));
  }
  throw error;
} finally {
  await cleanup();
  await stopServer(serverProcess);
}
