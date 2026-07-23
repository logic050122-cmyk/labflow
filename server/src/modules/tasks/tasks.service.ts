import { AppError } from "../../common/http";
import { db } from "../../config/db";
import { findProjectByIdForUser } from "../projects/projects.repository";

import {
  findProjectForTaskWriteForUpdate,
  findTaskDetailForUser,
  findTaskForTaskWriteForUpdate,
  findTasksByProject,
  findTasksForAssignee,
  hasProjectMemberForUpdate,
  insertTask,
  updateTask
} from "./tasks.repository";
import type {
  CreateTaskInput,
  CreateTaskResult,
  GetTaskResult,
  ListTasksInput,
  ListTasksResult,
  TaskProjectWriteTarget,
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
  connection: Awaited<ReturnType<typeof db.getConnection>>,
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

    await connection.commit();
    return { task };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
