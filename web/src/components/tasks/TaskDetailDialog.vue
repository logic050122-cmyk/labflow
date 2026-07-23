<script setup lang="ts">
import { ref, watch } from "vue";

import { getTask } from "@/api/tasks";
import {
  TASK_PRIORITY_TAG_TYPE,
  TASK_PRIORITY_TEXT,
  TASK_STATUS_TAG_TYPE,
  TASK_STATUS_TEXT,
  type Task
} from "@/types/tasks";

const props = defineProps<{
  modelValue: boolean;
  taskId: number | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const task = ref<Task | null>(null);
const loading = ref(false);
const errorMessage = ref("");

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "未设置";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
};

// 每次重新打开弹窗都按当前 taskId 请求详情，避免列表更新后仍展示旧数据。
const loadTask = async () => {
  if (!props.taskId) {
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  task.value = null;

  try {
    const result = await getTask(props.taskId);
    task.value = result.task;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "任务详情加载失败";
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      void loadTask();
    }
  }
);
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    title="任务详情"
    width="620px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="loading" v-loading="true" class="task-detail-dialog__loading" />

    <el-alert v-else-if="errorMessage" type="error" :closable="false" show-icon>
      <template #title>
        {{ errorMessage }}
        <el-button link type="primary" @click="loadTask">重新加载</el-button>
      </template>
    </el-alert>

    <template v-else-if="task">
      <div class="task-detail-dialog__heading">
        <div>
          <p>{{ task.projectName }}</p>
          <h2>{{ task.title }}</h2>
        </div>
        <div class="task-detail-dialog__tags">
          <el-tag :type="TASK_STATUS_TAG_TYPE[task.status]">
            {{ TASK_STATUS_TEXT[task.status] }}
          </el-tag>
          <el-tag :type="TASK_PRIORITY_TAG_TYPE[task.priority]" effect="plain">
            {{ TASK_PRIORITY_TEXT[task.priority] }}优先级
          </el-tag>
        </div>
      </div>

      <p class="task-detail-dialog__description">
        {{ task.description || "该任务暂时没有描述。" }}
      </p>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="负责人">
          {{ task.assigneeNickname }}（@{{ task.assigneeUsername }}）
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          {{ task.creatorNickname }}（@{{ task.creatorUsername }}）
        </el-descriptions-item>
        <el-descriptions-item label="任务标签">
          {{ task.tag || "未设置" }}
        </el-descriptions-item>
        <el-descriptions-item label="截止时间">
          {{ formatDateTime(task.dueAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDateTime(task.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="最近更新">
          {{ formatDateTime(task.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </template>
  </el-dialog>
</template>

<style scoped>
.task-detail-dialog__loading {
  min-height: 260px;
}

.task-detail-dialog__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.task-detail-dialog__heading p {
  margin: 0 0 6px;
  color: #5c7fb5;
  font-size: 13px;
}

.task-detail-dialog__heading h2 {
  margin: 0;
  color: #27364c;
  font-size: 22px;
}

.task-detail-dialog__tags {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.task-detail-dialog__description {
  min-height: 72px;
  margin: 22px 0;
  color: #667085;
  line-height: 1.75;
  white-space: pre-wrap;
}
</style>
