import cron, { type ScheduledTask } from "node-cron";

import { markOverdueTasks } from "../modules/tasks/tasks.service";

// 每天 00:05 按中国时区检查一次，避开整点可能集中的其他后台任务。
const OVERDUE_TASK_CRON = "5 0 * * *";

export const startOverdueTaskJob = (): ScheduledTask => {
  return cron.schedule(
    OVERDUE_TASK_CRON,
    async () => {
      try {
        const updatedCount = await markOverdueTasks();
        if (updatedCount > 0) {
          console.log(`Marked ${updatedCount} task(s) as overdue.`);
        }
      } catch (error) {
        // 定时任务失败不能让 HTTP 服务退出，保留日志供排查，下一次仍会继续执行。
        console.error("Failed to mark overdue tasks.", error);
      }
    },
    {
      timezone: "Asia/Shanghai",
      noOverlap: true,
      name: "labflow-overdue-tasks"
    }
  );
};

