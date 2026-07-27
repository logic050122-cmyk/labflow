import "dotenv/config";

import { createRequire } from "node:module";

import mysql from "mysql2/promise";

import {
  assert,
  databaseConfig,
  initializeSchemaWhenRequested,
  request,
  startServer,
  stopServer
} from "./verify-modules-7-8.helpers.mjs";

const require = createRequire(import.meta.url);
const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const password = "Module10Pass!";
const users = {
  owner: { username: `m10_owner_${suffix}`, nickname: "模块十负责人" },
  member: { username: `m10_member_${suffix}`, nickname: "模块十成员" },
  outsider: { username: `m10_outsider_${suffix}`, nickname: "模块十外部用户" }
};

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
      await database.execute("DELETE FROM notifications WHERE project_id = ?", [projectId]);
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
    console.error("模块十验收数据清理失败：", error);
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

  const project = (
    await request("/projects", {
      method: "POST",
      token: ownerToken,
      body: {
        name: "模块十通知验收项目",
        description: "验证通知写入、隔离和已读管理",
        startDate: "2026-07-26",
        endDate: "2026-08-31"
      }
    })
  ).data.project;
  projectId = project.id;

  await request("/projects/join", {
    method: "POST",
    token: memberToken,
    body: { inviteCode: project.inviteCode }
  });

  let memberNotifications = (
    await request("/notifications?page=1&pageSize=20", { token: memberToken })
  ).data;
  assert(memberNotifications.total === 1, "加入项目后成员应收到一条通知");
  assert(
    memberNotifications.list[0].type === "project",
    "加入项目通知类型应为 project"
  );
  assert(
    memberNotifications.list[0].content.includes("模块十通知验收项目"),
    "加入项目通知应包含真实项目名"
  );

  const firstNotificationId = memberNotifications.list[0].id;
  await request(`/notifications/${firstNotificationId}/read`, {
    method: "PATCH",
    token: outsiderToken,
    expectedStatus: 404,
    expectedCode: 40401
  });
  const readNotification = (
    await request(`/notifications/${firstNotificationId}/read`, {
      method: "PATCH",
      token: memberToken
    })
  ).data.notification;
  assert(readNotification.isRead === true, "接收人应能标记自己的通知已读");
  assert(Boolean(readNotification.readAt), "单条已读后应记录 readAt");

  const dueAt = new Date(Date.now() + 60 * 60 * 1000);
  const task = (
    await request(`/projects/${projectId}/tasks`, {
      method: "POST",
      token: ownerToken,
      body: {
        title: "模块十审核通知任务",
        description: "验证分配、提交和审核通知",
        assigneeUserId: member.id,
        priority: "high",
        tag: "测试",
        dueAt: dueAt.toISOString()
      }
    })
  ).data.task;

  await request(`/tasks/${task.id}/start`, {
    method: "POST",
    token: memberToken
  });
  await request(`/tasks/${task.id}/submit`, {
    method: "POST",
    token: memberToken,
    body: { submitContent: "模块十验收提交" }
  });

  let ownerNotifications = (
    await request("/notifications?isRead=false&page=1&pageSize=20", {
      token: ownerToken
    })
  ).data;
  assert(
    ownerNotifications.list.some(
      (notification) =>
        notification.type === "review" && notification.taskId === task.id
    ),
    "成员提交任务后 Owner 应收到待审核通知"
  );

  await request(`/tasks/${task.id}/approve`, {
    method: "POST",
    token: ownerToken
  });
  memberNotifications = (
    await request("/notifications?page=1&pageSize=20", { token: memberToken })
  ).data;
  assert(
    memberNotifications.list.some(
      (notification) =>
        notification.title === "任务审核通过" && notification.taskId === task.id
    ),
    "审核通过后成员应收到审核结果通知"
  );

  const overdueDueAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const overdueTask = (
    await request(`/projects/${projectId}/tasks`, {
      method: "POST",
      token: ownerToken,
      body: {
        title: "模块十逾期通知任务",
        assigneeUserId: member.id,
        priority: "urgent",
        tag: "测试",
        dueAt: overdueDueAt.toISOString()
      }
    })
  ).data.task;

  // 直接调用定时任务背后的 service，并传入固定未来时间，避免等待真实 cron。
  const { markOverdueTasks } = require("../dist/modules/tasks/tasks.service.js");
  const { closeDatabase } = require("../dist/config/db.js");
  const overdueCount = await markOverdueTasks(
    new Date(overdueDueAt.getTime() + 60 * 1000),
    projectId
  );
  await closeDatabase();
  assert(overdueCount === 1, "逾期检查应只更新本次创建的到期任务");

  const [overdueRows] = await database.execute(
    "SELECT status FROM tasks WHERE id = ?",
    [overdueTask.id]
  );
  assert(overdueRows[0]?.status === "overdue", "到期任务状态应更新为 overdue");

  memberNotifications = (
    await request("/notifications?isRead=false&page=1&pageSize=50", {
      token: memberToken
    })
  ).data;
  ownerNotifications = (
    await request("/notifications?isRead=false&page=1&pageSize=50", {
      token: ownerToken
    })
  ).data;
  assert(
    memberNotifications.list.some(
      (notification) =>
        notification.type === "overdue" && notification.taskId === overdueTask.id
    ),
    "逾期后 Assignee 应收到通知"
  );
  assert(
    ownerNotifications.list.some(
      (notification) =>
        notification.type === "overdue" && notification.taskId === overdueTask.id
    ),
    "逾期后 Owner 应收到通知"
  );

  await request(`/projects/${projectId}/finish`, {
    method: "POST",
    token: memberToken,
    expectedStatus: 403,
    expectedCode: 40301
  });
  await request(`/projects/${projectId}/finish`, {
    method: "POST",
    token: ownerToken
  });
  await request(`/projects/${projectId}/archive`, {
    method: "POST",
    token: ownerToken
  });

  memberNotifications = (
    await request("/notifications?page=1&pageSize=50", { token: memberToken })
  ).data;
  assert(
    memberNotifications.list.some(
      (notification) =>
        notification.title === "项目已归档" && notification.projectId === projectId
    ),
    "项目归档后成员应收到归档通知"
  );

  const unreadBeforeAllRead = (
    await request("/notifications/unread-count", { token: memberToken })
  ).data.unreadCount;
  assert(unreadBeforeAllRead > 0, "全部已读前应存在未读通知");

  const updatedCount = (
    await request("/notifications/read-all", {
      method: "PATCH",
      token: memberToken
    })
  ).data.updatedCount;
  assert(updatedCount === unreadBeforeAllRead, "全部已读更新数量应等于原未读数");

  const unreadAfterAllRead = (
    await request("/notifications/unread-count", { token: memberToken })
  ).data.unreadCount;
  assert(unreadAfterAllRead === 0, "全部已读后未读数量应为 0");

  const unreadList = (
    await request("/notifications?isRead=false&page=1&pageSize=20", {
      token: memberToken
    })
  ).data;
  assert(unreadList.total === 0, "未读筛选结果应与未读数量一致");

  console.log("MODULE_10_HTTP_MYSQL_ACCEPTANCE_PASSED");
} catch (error) {
  if (serverLogs.length > 0) {
    console.error("后端输出：\n", serverLogs.join(""));
  }
  throw error;
} finally {
  await cleanup();
  await stopServer(serverProcess);
}
