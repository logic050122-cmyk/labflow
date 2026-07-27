import type { PoolConnection } from "mysql2/promise";

import { AppError } from "../../common/http";
import { db } from "../../config/db";
import {
  notifyTaskApproved,
  notifyTaskAssigned,
  notifyTaskOverdue,
  notifyTaskRejected,
  notifyTaskSubmitted
} from "../notifications/notifications.service";
import { findProjectByIdForUser } from "../projects/projects.repository";

import {
  findProjectForTaskWriteForUpdate,
  findTaskDetailForUser,
  findTaskForReviewForUpdate,
  findTaskForStartForUpdate,
  findDueTasksForUpdate,
  findTaskForTaskWriteForUpdate,
  findTasksByProject,
  findTasksForAssignee,
  hasProjectMemberForUpdate,
  insertTask,
  updateTask,
  updateTaskStatusToDoing,
  updateTaskStatusToDoingAfterRejection,
  updateTaskStatusToOverdue,
  updateTaskStatusToDone,
  updateTaskStatusToSubmitted
} from "./tasks.repository";
import type {
  ApproveTaskResult,
  CreateTaskInput,
  CreateTaskResult,
  GetTaskResult,
  ListTasksInput,
  ListTasksResult,
  RejectTaskInput,
  RejectTaskResult,
  StartTaskResult,
  SubmitTaskInput,
  SubmitTaskResult,
  TaskProjectWriteTarget,
  TaskReviewTarget,
  UpdateTaskInput,
  UpdateTaskResult
} from "./tasks.types";

// Owner 权限和项目状态是所有“写入任务”动作的共同前提，集中在这里避免遗漏。
const assertOwnerCanManageTasks = (
  project: TaskProjectWriteTarget,
  currentUserId: number
): void => {
  if (project.ownerUserId !== currentUserId) {
    throw new AppError("仅项目负责人可以创建、编辑或分配任务", 403, 40301);
  }

  if (project.status !== "active") {
    throw new AppError("项目当前状态不允许创建或编辑任务", 409, 40904);
  }
};

const assertAssigneeIsProjectMember = async (
  connection: PoolConnection,
  projectId: number,
  assigneeUserId: number
): Promise<void> => {
  const isProjectMember = await hasProjectMemberForUpdate(connection, {
    projectId,
    userId: assigneeUserId
  });

  if (!isProjectMember) {
    throw new AppError("任务负责人必须是当前项目成员", 404, 40403);
  }
};

const assertProjectAllowsTaskReview = (target: TaskReviewTarget): void => {
  // 已完成或已归档项目只保留历史数据，不能继续产生新的任务状态流转。
  if (target.projectStatus !== "active") {
    throw new AppError("项目当前状态不允许提交或审核任务", 409, 40904);
  }
};

const getLockedTaskReviewTarget = async (
  connection: PoolConnection,
  taskId: number,
  currentUserId: number
): Promise<TaskReviewTarget> => {
  // 查询和后续更新必须使用同一个事务连接。
  // repository 会用 FOR UPDATE 锁住任务，避免两个请求同时基于旧状态执行提交、通过或驳回。
  const target = await findTaskForReviewForUpdate(connection, {
    taskId,
    currentUserId
  });

  // 把“不存在”和“不是项目成员”合并返回，避免向无权限用户泄露任务是否真实存在。
  if (!target) {
    throw new AppError("任务不存在或你不是所属项目成员", 404, 40401);
  }

  return target;
};

export const listProjectTasks = async (
  projectId: number,
  input: ListTasksInput,
  currentUserId: number
): Promise<ListTasksResult> => {
  // 先复用项目模块的成员隔离查询，Owner 和 Member 都能只读查看自己项目的任务。
  const project = await findProjectByIdForUser({ projectId, userId: currentUserId });
  if (!project) {
    throw new AppError("项目不存在或你不是项目成员", 404, 40401);
  }

  const result = await findTasksByProject(projectId, input);
  return {
    ...result,
    page: input.page,
    pageSize: input.pageSize
  };
};

export const listMyTasks = async (
  input: ListTasksInput,
  currentUserId: number
): Promise<ListTasksResult> => {
  // “我的任务”不信任 query 中的负责人，repository 固定使用 currentUserId。
  const result = await findTasksForAssignee(currentUserId, input);
  return {
    ...result,
    page: input.page,
    pageSize: input.pageSize
  };
};

export const getTask = async (
  taskId: number,
  currentUserId: number
): Promise<GetTaskResult> => {
  const task = await findTaskDetailForUser({ taskId, currentUserId });
  if (!task) {
    throw new AppError("任务不存在或你不是所属项目成员", 404, 40401);
  }

  return { task };
};

export const createTask = async (
  projectId: number,
  input: CreateTaskInput,
  currentUserId: number
): Promise<CreateTaskResult> => {
  const connection = await db.getConnection();

  try {
    // 项目、成员校验和任务写入在同一事务中完成，避免留下负责人无效的任务。
    await connection.beginTransaction();

    const project = await findProjectForTaskWriteForUpdate(connection, {
      projectId,
      currentUserId
    });
    if (!project) {
      throw new AppError("项目不存在或你不是项目成员", 404, 40401);
    }

    assertOwnerCanManageTasks(project, currentUserId);
    await assertAssigneeIsProjectMember(connection, projectId, input.assigneeUserId);

    // status 和 creatorUserId 不接受客户端传入，创建任务永远从 todo 状态开始。
    const task = await insertTask(connection, {
      ...input,
      projectId,
      creatorUserId: currentUserId,
      status: "todo"
    });

    // 任务和分配通知在同一事务中写入，任一步失败都会整体回滚。
    await notifyTaskAssigned(connection, {
      assigneeUserId: task.assigneeUserId,
      projectId: task.projectId,
      taskId: task.id,
      taskTitle: task.title
    });

    await connection.commit();
    return { task };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateTaskByOwner = async (
  taskId: number,
  input: UpdateTaskInput,
  currentUserId: number
): Promise<UpdateTaskResult> => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const taskTarget = await findTaskForTaskWriteForUpdate(connection, {
      taskId,
      currentUserId
    });
    if (!taskTarget) {
      throw new AppError("任务不存在或你不是所属项目成员", 404, 40401);
    }

    assertOwnerCanManageTasks(taskTarget, currentUserId);

    // 模块五只负责 todo 任务的编辑和改派，其他状态由模块六、七的规则接管。
    if (taskTarget.taskStatus !== "todo") {
      throw new AppError("当前任务状态不允许编辑或重新分配", 409, 40907);
    }

    await assertAssigneeIsProjectMember(
      connection,
      taskTarget.projectId,
      input.assigneeUserId
    );

    const task = await updateTask(connection, {
      ...input,
      taskId,
      projectId: taskTarget.projectId,
      creatorUserId: currentUserId,
      // updateTask 不会写 status，此处只为复用完整 repository 输入类型。
      status: taskTarget.taskStatus
    });

    // 只有负责人确实变化时才发送新分配通知，普通标题或日期编辑不打扰成员。
    if (taskTarget.assigneeUserId !== task.assigneeUserId) {
      await notifyTaskAssigned(connection, {
        assigneeUserId: task.assigneeUserId,
        projectId: task.projectId,
        taskId: task.id,
        taskTitle: task.title
      });
    }

    await connection.commit();
    return { task };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// 只有任务负责人可以把 todo/overdue 任务开始为 doing。
export const startTask = async (
  taskId: number,
  currentUserId: number
): Promise<StartTaskResult> => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 查询任务并加锁，同时确认当前用户仍是任务所属项目的成员。
    const taskTarget = await findTaskForStartForUpdate(connection, {
      taskId,
      currentUserId
    });

    if (!taskTarget) {
      throw new AppError(
        "任务不存在或你不是所属项目成员",
        404,
        40401
      );
    }

    // 当前登录用户必须就是这个任务的负责人。
    if (taskTarget.assigneeUserId !== currentUserId) {
      throw new AppError(
        "仅任务负责人可以开始任务",
        403,
        40302
      );
    }

    // 已完成或已归档项目不能继续处理任务。
    if (taskTarget.projectStatus !== "active") {
      throw new AppError(
        "项目当前状态不允许开始任务",
        409,
        40904
      );
    }

    // 只允许 todo/overdue -> doing。
    if (
      taskTarget.taskStatus !== "todo" &&
      taskTarget.taskStatus !== "overdue"
    ) {
      throw new AppError(
        "当前任务状态不允许开始",
        409,
        40908
      );
    }

    const task = await updateTaskStatusToDoing(
      connection,
      taskTarget.taskId
    );

    await connection.commit();

    return { task };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const submitTask = async (
  taskId: number,
  input: SubmitTaskInput,
  currentUserId: number
): Promise<SubmitTaskResult> => {
  const connection = await db.getConnection();

  try {
    // 状态校验和状态更新必须是一个原子操作，否则并发请求可能都通过旧状态校验。
    await connection.beginTransaction();

    const target = await getLockedTaskReviewTarget(
      connection,
      taskId,
      currentUserId
    );

    // 提交权限以任务表中的 assignee_user_id 为准，不能相信客户端传入的用户或角色。
    if (target.assigneeUserId !== currentUserId) {
      throw new AppError("仅任务负责人可以提交任务", 403, 40302);
    }

    assertProjectAllowsTaskReview(target);

    // 锁定任务后再判断状态，保证只能执行 doing -> submitted。
    if (target.taskStatus !== "doing") {
      throw new AppError("当前任务状态不允许提交", 409, 40909);
    }

    const task = await updateTaskStatusToSubmitted(connection, {
      taskId: target.taskId,
      submitContent: input.submitContent
    });

    await notifyTaskSubmitted(connection, {
      ownerUserId: target.ownerUserId,
      projectId: task.projectId,
      taskId: task.id,
      taskTitle: task.title,
      assigneeName: task.assigneeNickname || task.assigneeUsername
    });

    await connection.commit();
    return { task };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const approveTask = async (
  taskId: number,
  currentUserId: number
): Promise<ApproveTaskResult> => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const target = await getLockedTaskReviewTarget(
      connection,
      taskId,
      currentUserId
    );

    // Owner 的唯一判断依据是 projects.owner_user_id，不能只相信 project_members.role。
    if (target.ownerUserId !== currentUserId) {
      throw new AppError("仅项目负责人可以审核任务", 403, 40301);
    }

    assertProjectAllowsTaskReview(target);

    // Member 不能直接完成任务，只有 submitted 状态才能由 Owner 审核为 done。
    if (target.taskStatus !== "submitted") {
      throw new AppError("当前任务状态不允许审核", 409, 40910);
    }

    const task = await updateTaskStatusToDone(connection, {
      taskId: target.taskId,
      reviewerUserId: currentUserId
    });

    await notifyTaskApproved(connection, {
      assigneeUserId: task.assigneeUserId,
      projectId: task.projectId,
      taskId: task.id,
      taskTitle: task.title
    });

    await connection.commit();
    return { task };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const rejectTask = async (
  taskId: number,
  input: RejectTaskInput,
  currentUserId: number
): Promise<RejectTaskResult> => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const target = await getLockedTaskReviewTarget(
      connection,
      taskId,
      currentUserId
    );

    // 驳回也属于审核行为，同样只能由 projects.owner_user_id 指向的负责人执行。
    if (target.ownerUserId !== currentUserId) {
      throw new AppError("仅项目负责人可以审核任务", 403, 40301);
    }

    assertProjectAllowsTaskReview(target);

    // 只允许 submitted -> doing，避免重复驳回或覆盖已经通过的任务。
    if (target.taskStatus !== "submitted") {
      throw new AppError("当前任务状态不允许审核", 409, 40910);
    }

    const task = await updateTaskStatusToDoingAfterRejection(connection, {
      taskId: target.taskId,
      reviewerUserId: currentUserId,
      reason: input.reason
    });

    await notifyTaskRejected(connection, {
      assigneeUserId: task.assigneeUserId,
      projectId: task.projectId,
      taskId: task.id,
      taskTitle: task.title,
      reason: input.reason
    });

    await connection.commit();
    return { task };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// 定时任务默认全量执行；可选 projectId 让运维检查或验收限定到一个明确项目。
export const markOverdueTasks = async (
  now = new Date(),
  projectId?: number
): Promise<number> => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const targets = await findDueTasksForUpdate(connection, now, projectId);

    for (const target of targets) {
      await updateTaskStatusToOverdue(connection, target);

      // 负责人和项目 Owner 都要收到通知；两者相同时只写一条，避免重复提醒。
      const receiverUserIds = new Set([
        target.assigneeUserId,
        target.ownerUserId
      ]);
      for (const receiverUserId of receiverUserIds) {
        await notifyTaskOverdue(connection, {
          receiverUserId,
          projectId: target.projectId,
          taskId: target.taskId,
          taskTitle: target.title
        });
      }
    }

    await connection.commit();
    return targets.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
