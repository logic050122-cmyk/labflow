<script setup lang="ts">
import { reactive, watch } from "vue";

import type { ProjectMemberListItem } from "@/types/members";
import {
  TASK_PRIORITY_TEXT,
  TASK_TAG_OPTIONS,
  type CreateTaskRequest,
  type Task,
  type TaskPriority,
  type TaskTag
} from "@/types/tasks";

const TASK_TITLE_MAX_LENGTH = 150;
const TASK_DESCRIPTION_MAX_LENGTH = 2000;

interface TaskFormModel {
  title: string;
  description: string;
  assigneeUserId: number | undefined;
  priority: TaskPriority;
  tag: TaskTag | "";
  dueAt: Date | null;
}

interface TaskFormErrors {
  title: string;
  assigneeUserId: string;
  dueAt: string;
}

const props = defineProps<{
  modelValue: boolean;
  members: ProjectMemberListItem[];
  task?: Task | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [value: CreateTaskRequest];
}>();

const emptyForm = (): TaskFormModel => ({
  title: "",
  description: "",
  assigneeUserId: undefined,
  priority: "medium",
  tag: "",
  dueAt: null
});

const form = reactive<TaskFormModel>(emptyForm());
const errors = reactive<TaskFormErrors>({
  title: "",
  assigneeUserId: "",
  dueAt: ""
});

const clearErrors = () => {
  errors.title = "";
  errors.assigneeUserId = "";
  errors.dueAt = "";
};

const resetForm = () => {
  const task = props.task;
  Object.assign(form, {
    title: task?.title || "",
    description: task?.description || "",
    assigneeUserId: task?.assigneeUserId,
    priority: task?.priority || "medium",
    tag: task?.tag || "",
    dueAt: task?.dueAt ? new Date(task.dueAt) : null
  });
  clearErrors();
};

const validate = (): boolean => {
  clearErrors();
  const title = form.title.trim();

  if (!title) {
    errors.title = "任务标题不能为空";
  } else if (title.length > TASK_TITLE_MAX_LENGTH) {
    errors.title = "任务标题不能超过 150 个字符";
  }

  if (!form.assigneeUserId) {
    errors.assigneeUserId = "请选择任务负责人";
  }

  if (form.dueAt && form.dueAt.getTime() <= Date.now()) {
    errors.dueAt = "截止时间必须晚于当前时间";
  }

  return !errors.title && !errors.assigneeUserId && !errors.dueAt;
};

const closeDialog = () => {
  emit("update:modelValue", false);
};

const handleSubmit = () => {
  if (!validate() || !form.assigneeUserId) {
    return;
  }

  // Date 转 ISO 字符串后发送，后端会统一校验并保存为 DATETIME。
  emit("submit", {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    assigneeUserId: form.assigneeUserId,
    priority: form.priority,
    tag: form.tag || undefined,
    dueAt: form.dueAt?.toISOString()
  });
};

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm();
    }
  }
);
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    :title="props.task ? '编辑任务' : '创建任务'"
    width="560px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="task-form-dialog__hint">
      创建后任务状态固定为“待开始”，负责人只能从当前项目成员中选择。
    </p>

    <el-form :model="form" label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="任务标题" required :error="errors.title">
        <el-input
          v-model="form.title"
          placeholder="例如：完成登录接口参数校验"
          :maxlength="TASK_TITLE_MAX_LENGTH"
          show-word-limit
          @input="errors.title = ''"
        />
      </el-form-item>

      <el-form-item label="任务描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="说明完成目标、注意事项或交付内容（选填）"
          :maxlength="TASK_DESCRIPTION_MAX_LENGTH"
          show-word-limit
        />
      </el-form-item>

      <div class="task-form-dialog__grid">
        <el-form-item label="任务负责人" required :error="errors.assigneeUserId">
          <el-select
            v-model="form.assigneeUserId"
            placeholder="选择当前项目成员"
            filterable
            @change="errors.assigneeUserId = ''"
          >
            <el-option
              v-for="member in props.members"
              :key="member.userId"
              :label="`${member.nickname}（@${member.username}）`"
              :value="member.userId"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级" required>
          <el-select v-model="form.priority">
            <el-option
              v-for="priority in ['low', 'medium', 'high', 'urgent'] as TaskPriority[]"
              :key="priority"
              :label="TASK_PRIORITY_TEXT[priority]"
              :value="priority"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="任务标签">
          <el-select v-model="form.tag" clearable placeholder="选择标签（选填）">
            <el-option v-for="tag in TASK_TAG_OPTIONS" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>

        <el-form-item label="截止时间" :error="errors.dueAt">
          <el-date-picker
            v-model="form.dueAt"
            type="datetime"
            placeholder="选择截止时间（选填）"
            @change="errors.dueAt = ''"
          />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <el-button :disabled="props.loading" @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="props.loading" @click="handleSubmit">
        {{ props.task ? '保存修改' : '创建并分配' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.task-form-dialog__hint {
  margin: -4px 0 22px;
  color: #7b8494;
  font-size: 13px;
  line-height: 1.7;
}

.task-form-dialog__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.task-form-dialog__grid :deep(.el-select),
.task-form-dialog__grid :deep(.el-date-editor) {
  width: 100%;
}

@media (max-width: 560px) {
  .task-form-dialog__grid {
    grid-template-columns: 1fr;
  }
}
</style>
