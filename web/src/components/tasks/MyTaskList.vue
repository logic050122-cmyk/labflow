<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getMyTasks } from "@/api/tasks";
import TaskDetailDialog from "@/components/tasks/TaskDetailDialog.vue";
import {
  TASK_PRIORITY_TAG_TYPE,
  TASK_PRIORITY_TEXT,
  TASK_STATUS_TAG_TYPE,
  TASK_STATUS_TEXT,
  TASK_TAG_OPTIONS,
  type GetTasksParams,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskTag
} from "@/types/tasks";

interface MyTaskFilters {
  status: TaskStatus | "";
  priority: TaskPriority | "";
  tag: TaskTag | "";
  keyword: string;
}

const router = useRouter();
const tasks = ref<Task[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const errorMessage = ref("");
const detailVisible = ref(false);
const detailTaskId = ref<number | null>(null);

const filters = reactive<MyTaskFilters>({
  status: "",
  priority: "",
  tag: "",
  keyword: ""
});

// “我的任务”不传负责人，后端始终从 JWT 中识别当前登录用户。
const getQueryParams = (): GetTasksParams => ({
  page: currentPage.value,
  pageSize: pageSize.value,
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.priority ? { priority: filters.priority } : {}),
  ...(filters.tag ? { tag: filters.tag } : {}),
  ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {})
});

const loadTasks = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await getMyTasks(getQueryParams());
    tasks.value = result.list;
    total.value = result.total;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "我的任务加载失败";
  } finally {
    loading.value = false;
  }
};

const handleSearch = async () => {
  currentPage.value = 1;
  await loadTasks();
};

const resetFilters = async () => {
  filters.status = "";
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

const openTaskDetail = (taskId: number) => {
  detailTaskId.value = taskId;
  detailVisible.value = true;
};

const goProject = (task: Task) => {
  void router.push({ name: "project-detail", params: { projectId: task.projectId } });
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "未设置";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
};

onMounted(() => {
  void loadTasks();
});
</script>

<template>
  <section class="projects-panel" aria-label="我的任务列表">
    <div class="projects-panel__header">
      <div>
        <h2>任务列表</h2>
        <p>通过筛选快速找到当前需要处理的任务。</p>
      </div>
      <span class="projects-panel__count">共 {{ total }} 条</span>
    </div>

    <el-form class="my-tasks-filters" inline @submit.prevent="handleSearch">
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
        <el-input v-model="filters.keyword" clearable placeholder="搜索标题或描述" @keyup.enter="handleSearch" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSearch">筛选</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </el-form-item>
    </el-form>

    <div v-if="loading" v-loading="true" class="my-tasks-loading" />

    <el-alert v-else-if="errorMessage" class="my-tasks-error" type="error" :closable="false" show-icon>
      <template #title>
        {{ errorMessage }}
        <el-button link type="primary" @click="loadTasks">重新加载</el-button>
      </template>
    </el-alert>

    <el-empty v-else-if="tasks.length === 0" class="my-tasks-empty" :image-size="96" description="暂时没有分配给你的任务" />

    <template v-else>
      <el-table :data="tasks" class="my-tasks-table">
        <el-table-column label="任务" min-width="230">
          <template #default="scope: { row: Task }">
            <strong>{{ scope.row.title }}</strong>
            <p>{{ scope.row.projectName }}</p>
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

        <el-table-column label="操作" width="160" fixed="right">
          <template #default="scope: { row: Task }">
            <el-button link type="primary" @click="openTaskDetail(scope.row.id)">详情</el-button>
            <el-button link type="primary" @click="goProject(scope.row)">进入项目</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="my-tasks-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </template>

    <TaskDetailDialog v-model="detailVisible" :task-id="detailTaskId" />
  </section>
</template>

<style scoped>
.my-tasks-filters {
  display: flex;
  flex-wrap: wrap;
  padding: 20px 26px 4px;
}

.my-tasks-filters :deep(.el-select),
.my-tasks-filters :deep(.el-input) {
  width: 160px;
}

.my-tasks-loading,
.my-tasks-empty {
  min-height: 280px;
}

.my-tasks-error {
  margin: 24px;
}

.my-tasks-table {
  width: 100%;
}

.my-tasks-table strong {
  color: #344054;
}

.my-tasks-table p {
  margin: 5px 0 0;
  color: #98a2b3;
  font-size: 12px;
}

.my-tasks-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 20px 26px;
}

@media (max-width: 720px) {
  .my-tasks-filters {
    padding: 18px 18px 2px;
  }

  .my-tasks-table {
    min-width: 720px;
  }

  .my-tasks-pagination {
    padding: 20px 18px;
  }
}
</style>
