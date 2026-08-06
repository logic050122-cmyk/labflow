import type { Server } from "node:http";
import type { ScheduledTask } from "node-cron";
import { createApp } from "./app";
import { closeDatabase, connectDatabase } from "./config/db";
import { env } from "./config/env";
import { startOverdueTaskJob } from "./jobs/overdue-tasks.job";

// server.ts 是程序入口：先确认数据库可连接，再开始监听 HTTP 端口。
const startServer = async () => {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`LabFlow server is running on port ${env.port}.`);
  });
  const overdueTaskJob = startOverdueTaskJob();//这是一个定时任务，用于检查逾期任务并发送通知。

  registerShutdown(server, overdueTaskJob);
};

// Ctrl+C 或部署平台要求停止时，先停止接收新请求，再关闭数据库连接池。
// 这种有顺序的退出方式称为“优雅退出”，可减少数据处理中断。
const registerShutdown = (server: Server, overdueTaskJob: ScheduledTask) => {
  const shutdown = (signal: NodeJS.Signals) => {//定义一个 shutdown 函数，接收一个信号参数
    console.log(`${signal} received, shutting down.`);

    // 先停止调度新的逾期检查，再关闭 HTTP 服务和数据库连接。
    overdueTaskJob.stop();
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));  //不管数据库关闭成功还是失败，最后都退出进程。
    });
  };
//监听关闭信号，确保应用在收到 SIGINT 或 SIGTERM 时能优雅退出。
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);  //信号只监听一次，避免关闭逻辑重复执行。
};

// 顶层统一捕获启动失败，避免进程在未知状态下继续运行。
// 启动服务器。
// 如果启动过程中出错，就打印错误，并退出程序。
startServer().catch((error: unknown) => {
  console.error("Failed to start LabFlow server.", error);
  process.exit(1);
});
