<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";

import { createTask, getProjectTasks, updateTask } from "@/api/tasks";
import { getProjectMembers } from "@/api/members";
import TaskDetailDialog from "@/components/tasks/TaskDetailDialog.vue";
import TaskFormDialog from "@/components/tasks/TaskFormDialog.vue";
import type { ProjectMemberListItem } from "@/types/members";
import type { ProjectRole, ProjectStatus } from "@/types/projects";
import {
  TASK_PRIORITY_TAG_TYPE,
  TASK_PRIORITY_TEXT,
  TASK_STATUS_TAG_TYPE,
  TASK_STATUS_TEXT,
  TASK_TAG_OPTIONS,
  type CreateTaskRequest,
  type GetTasksParams,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskTag
} from "@/types/tasks";

interface TaskFilters {
  status: TaskStatus | "";
  assigneeUserId: number | undefined;
  priority: TaskPriority | "";
  tag: TaskTag | "";
  keyword: string;
}

const props = defineProps<{
  projectId: number;
  projectRole: ProjectRole;
  projectStatus: ProjectStatus;
}>();

const emit = defineEmits<{
  "tasks-changed": [];
}>();

const tasks = ref<Task[]>([]);
const members = ref<ProjectMemberListItem[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const errorMessage = ref("");
const memberErrorMessage = ref("");
const formVisible = ref(false);
const formLoading = ref(false);
const editingTask = ref<Task | null>(null);
const detailVisible = ref(false);
const detailTaskId = ref<number | null>(null);

const filters = reactive<TaskFilters>({
  status: "",
  assigneeUserId: undefined,
  priority: "",
  tag: "",
  keyword: ""
});

// 前端只负责隐藏不适用操作，后端 service 会再次校验 Owner 和 active 状态。
const canManageTasks = computed(() => {
  return props.projectRole === "owner" && props.projectStatus === "active";
});

const getQueryParams = (): GetTasksParams => ({
  page: currentPage.value,
  pageSize: pageSize.value,
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.assigneeUserId ? { assigneeUserId: filters.assigneeUserId } : {}),
  ...(filters.priority ? { priority: filters.priority } : {}),
  ...(filters.tag ? { tag: filters.tag } : {}),
  ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {})
});

const loadTasks = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await getProjectTasks(props.projectId, getQueryParams());
    tasks.value = result.list;
    total.value = result.total;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "项目任务加载失败";
  } finally {
    loading.value = false;
  }
};

const loadMembers = async () => {
  memberErrorMessage.value = "";

  try {
    const result = await getProjectMembers(props.projectId);
    members.value = result.members;
  } catch (error) {
    memberErrorMessage.value = error instanceof Error ? error.message : "项目成员加载失败";
  }
};

const handleSearch = async () => {
  currentPage.value = 1;
  await loadTasks();
};

const resetFilters = async () => {
  filters.status = "";
  filters.assigneeUserId = undefined;
  filters.priority = "";
  filters.tag = "";
  filters.keyword = "";
  currentPage.value = 1;
  await loadTasks();
};

const handlePageChange = async (page: number) => {
  currentPage.value = page;
  await loadTasks();
};

const openCreateDialog = () => {
  if (!canManageTasks.value) {
    return;
  }

  if (memberErrorMessage.value) {
    ElMessage.error("成员名单加载失败，请先重新加载页面后再创建任务");
    return;
  }

  editingTask.value = null;
  formVisible.value = true;
};

const openEditDialog = (task: Task) => {
  if (!canManageTasks.value || task.status !== "todo") {
    return;
  }

  editingTask.value = task;
  formVisible.value = true;
};

const handleFormSubmit = async (payload: CreateTaskRequest) => {
  if (formLoading.value) {
    return;
  }

  formLoading.value = true;
  try {
    if (editingTask.value) {
      await updateTask(editingTask.value.id, payload);
      ElMessage.success("任务更新成功");
    } else {
      await createTask(props.projectId, payload);
      ElMessage.success("任务创建并分配成功");
    }

    formVisible.value = false;
    await Promise.all([loadTasks(), loadMembers()]);
    // 通知父页面刷新成员任务数量，避免创建或改派后成员表格仍显示旧统计。
    emit("tasks-changed");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "任务保存失败");
  } finally {
    formLoading.value = false;
  }
};

const openDetailDialog = (taskId: number) => {
  detailTaskId.value = taskId;
  detailVisible.value = true;
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "未设置";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
};

onMounted(() => {
  void Promise.all([loadTasks(), loadMembers()]);
});
</script>

<template>
  <section class="project-task-card" aria-label="项目任务">
    <div class="project-task-card__heading">
      <div>
        <p>PROJECT TASKS</p>
        <h2>项目任务</h2>
      </div>
      <el-button v-if="canManageTasks" type="primary" @click="openCreateDialog">
        创建任务
      </el-button>
    </div>

    <el-alert
      v-if="memberErrorMessage"
      class="project-task-card__member-error"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #title>成员名单加载失败，负责人筛选和创建任务暂不可用。</template>
    </el-alert>

    <el-form class="project-task-filters" inline @submit.prevent="handleSearch">
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部状态">
          <el-option
            v-for="status in ['todo', 'doing', 'submitted', 'done', 'overdue'] as TaskStatus[]"
            :key="status"
            :label="TASK_STATUS_TEXT[status]"
            :value="status"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="负责人">
        <el-select v-model="filters.assigneeUserId" clearable placeholder="全部成员" filterable>
          <el-option
            v-for="member in members"
            :key="member.userId"
            :label="member.nickname"
            :value="member.userId"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="优先级">
        <el-select v-model="filters.priority" clearable placeholder="全部优先级">
          <el-option
            v-for="priority in ['low', 'medium', 'high', 'urgent'] as TaskPriority[]"
            :key="priority"
            :label="TASK_PRIORITY_TEXT[priority]"
            :value="priority"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="标签">
        <el-select v-model="filters.tag" clearable placeholder="全部标签">
          <el-option v-for="tag in TASK_TAG_OPTIONS" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </el-form-item>

      <el-form-item label="关键词">
        <el-input v-model="filters.keyword" placeholder="搜索标题或描述" clearable @keyup.enter="handleSearch" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSearch">筛选</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </el-form-item>
    </el-form>

    <div v-if="loading" v-loading="true" class="project-task-card__loading" />

    <el-alert v-else-if="errorMessage" type="error" :closable="false" show-icon>
      <template #title>
        {{ errorMessage }}
        <el-button link type="primary" @click="loadTasks">重新加载</el-button>
      </template>
    </el-alert>

    <el-empty v-else-if="tasks.length === 0" :image-size="80" description="当前筛选条件下没有任务" />

    <template v-else>
      <el-table :data="tasks" class="project-task-table">
        <el-table-column label="任务" min-width="210">
          <template #default="scope: { row: Task }">
            <strong>{{ scope.row.title }}</strong>
            <p>{{ scope.row.description || "暂无描述" }}</p>
          </template>
        </el-table-column>

        <el-table-column label="负责人" min-width="130">
          <template #default="scope: { row: Task }">
            {{ scope.row.assigneeNickname }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="105">
          <template #default="scope: { row: Task }">
            <el-tag :type="TASK_STATUS_TAG_TYPE[scope.row.status]" effect="plain">
              {{ TASK_STATUS_TEXT[scope.row.status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="优先级" width="100">
          <template #default="scope: { row: Task }">
            <el-tag :type="TASK_PRIORITY_TAG_TYPE[scope.row.priority]" effect="plain">
              {{ TASK_PRIORITY_TEXT[scope.row.priority] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="截止时间" min-width="165">
          <template #default="scope: { row: Task }">
            {{ formatDateTime(scope.row.dueAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="130" fixed="right">
          <template #default="scope: { row: Task }">
            <el-button link type="primary" @click="openDetailDialog(scope.row.id)">详情</el-button>
            <el-button
              v-if="canManageTasks && scope.row.status === 'todo'"
              link
              type="primary"
              @click="openEditDialog(scope.row)"
            >
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="project-task-card__pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </template>

    <TaskFormDialog
      v-model="formVisible"
      :members="members"
      :task="editingTask"
      :loading="formLoading"
      @submit="handleFormSubmit"
    />

    <TaskDetailDialog v-model="detailVisible" :task-id="detailTaskId" />
  </section>
</template>

<style scoped>
.project-task-card {
  margin-top: 22px;
  padding: clamp(24px, 3vw, 34px);
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e6eaf0;
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(38, 53, 79, 0.04);
}

.project-task-card__heading,
.project-task-card__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.project-task-card__heading {
  margin-bottom: 20px;
}

.project-task-card__heading p {
  margin: 0 0 6px;
  color: #8ba5c8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.project-task-card__heading h2 {
  margin: 0;
  color: #1d2939;
  font-size: 22px;
}

.project-task-card__member-error {
  margin-bottom: 16px;
}

.project-task-filters {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.project-task-filters :deep(.el-select),
.project-task-filters :deep(.el-input) {
  width: 150px;
}

.project-task-card__loading {
  min-height: 230px;
}

.project-task-table {
  width: 100%;
}

.project-task-table strong {
  color: #344054;
}

.project-task-table p {
  max-width: 260px;
  margin: 5px 0 0;
  overflow: hidden;
  color: #98a2b3;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-task-card__pagination {
  justify-content: flex-end;
  padding-top: 20px;
}

@media (max-width: 720px) {
  .project-task-card {
    padding: 20px 16px;
  }

  .project-task-table {
    min-width: 780px;
  }

  .project-task-card :deep(.el-table) {
    overflow-x: auto;
  }
}
</style>
