<script setup lang="ts">
import { ref, watch } from "vue";

import { getTask } from "@/api/tasks";
import TaskComments from "@/components/comments/TaskComments.vue";
import FileListPanel from "@/components/files/FileListPanel.vue";
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
    width="760px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- 弹窗内容使用自己的滚动容器，长评论不会把弹窗撑出浏览器视口。 -->
    <div class="task-detail-dialog__body">
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

        <template
          v-if="
            task.submitContent ||
            task.rejectionReason ||
            task.submittedAt ||
            task.reviewedAt ||
            task.completedAt
          "
        >
          <el-divider content-position="left">提交与审核</el-divider>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="完成说明" :span="2">
              <span class="task-detail-dialog__review-text">
                {{ task.submitContent || "未填写完成说明" }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="提交时间">
              {{ formatDateTime(task.submittedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="审核人">
              {{
                task.reviewerNickname && task.reviewerUsername
                  ? `${task.reviewerNickname}（@${task.reviewerUsername}）`
                  : "未审核"
              }}
            </el-descriptions-item>
            <el-descriptions-item label="审核时间">
              {{ formatDateTime(task.reviewedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成时间">
              {{ formatDateTime(task.completedAt) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="task.rejectionReason" label="驳回原因" :span="2">
              <span class="task-detail-dialog__review-text task-detail-dialog__review-text--danger">
                {{ task.rejectionReason }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </template>

        <el-divider content-position="left">任务附件</el-divider>
        <FileListPanel
          :project-id="task.projectId"
          :task-id="task.id"
          :project-status="task.projectStatus"
        />

        <el-divider content-position="left">任务评论</el-divider>
        <TaskComments
          :task-id="task.id"
          :project-id="task.projectId"
          :project-status="task.projectStatus"
        />
      </template>
    </div>
  </el-dialog>
</template>

<style scoped>
.task-detail-dialog__body {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding-right: 4px;
}

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

.task-detail-dialog__review-text {
  white-space: pre-wrap;
}

.task-detail-dialog__review-text--danger {
  color: #d92d20;
}

@media (max-width: 820px) {
  .task-detail-dialog__heading {
    flex-direction: column;
  }
}
</style>
