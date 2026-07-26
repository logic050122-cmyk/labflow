<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { ref, watch } from "vue";

import {
  createTaskComment,
  deleteTaskComment,
  getTaskComments
} from "@/api/comments";
import { getProject } from "@/api/projects";
import { useAuthStore } from "@/stores/auth";
import type { TaskComment } from "@/types/comments";
import type { ProjectStatus } from "@/types/projects";

const props = defineProps<{
  taskId: number;
  projectId: number;
  projectStatus: ProjectStatus;
}>();

const authStore = useAuthStore();
const comments = ref<TaskComment[]>([]);
const content = ref("");
const loading = ref(false);
const submitting = ref(false);
const deletingCommentId = ref<number | null>(null);
const errorMessage = ref("");
const isProjectOwner = ref(false);

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
};

// 评论列表和当前用户项目角色一起加载，用于决定哪些删除按钮应该显示。
const loadComments = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [commentResult, projectResult] = await Promise.all([
      getTaskComments(props.taskId),
      getProject(props.projectId)
    ]);

    comments.value = commentResult.comments;
    isProjectOwner.value = projectResult.project.role === "owner";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "任务评论加载失败";
  } finally {
    loading.value = false;
  }
};

const canDeleteComment = (comment: TaskComment): boolean => {
  return comment.userId === authStore.user?.id || isProjectOwner.value;
};

const handleCreate = async () => {
  if (submitting.value || props.projectStatus === "archived") {
    return;
  }

  const normalizedContent = content.value.trim();
  if (!normalizedContent) {
    ElMessage.warning("请输入评论内容");
    return;
  }

  if (normalizedContent.length > 2000) {
    ElMessage.warning("评论内容不能超过 2000 个字符");
    return;
  }

  submitting.value = true;

  try {
    const result = await createTaskComment(props.taskId, {
      content: normalizedContent
    });

    comments.value.push(result.comment);
    content.value = "";
    ElMessage.success("评论发布成功");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "评论发布失败");
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (comment: TaskComment) => {
  if (!canDeleteComment(comment) || deletingCommentId.value !== null) {
    return;
  }

  try {
    await ElMessageBox.confirm("删除后无法恢复，确定删除这条评论吗？", "删除评论", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning"
    });
  } catch {
    return;
  }

  deletingCommentId.value = comment.id;

  try {
    await deleteTaskComment(comment.id);
    comments.value = comments.value.filter((item) => item.id !== comment.id);
    ElMessage.success("评论删除成功");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "评论删除失败");
  } finally {
    deletingCommentId.value = null;
  }
};

watch(
  () => [props.taskId, props.projectId],
  () => {
    void loadComments();
  },
  { immediate: true }
);
</script>

<template>
  <section class="task-comments" aria-label="任务评论">
    <el-alert
      v-if="props.projectStatus === 'archived'"
      class="task-comments__archived"
      type="info"
      :closable="false"
      show-icon
      title="项目已归档，只能查看和按权限删除历史评论。"
    />

    <div v-if="loading" v-loading="true" class="task-comments__loading" />

    <el-alert v-else-if="errorMessage" type="error" :closable="false" show-icon>
      <template #title>
        {{ errorMessage }}
        <el-button link type="primary" @click="loadComments">重新加载</el-button>
      </template>
    </el-alert>

    <el-empty
      v-else-if="comments.length === 0"
      :image-size="72"
      description="暂时没有评论"
    />

    <div v-else class="task-comments__list">
      <article v-for="comment in comments" :key="comment.id" class="task-comments__item">
        <div class="task-comments__meta">
          <div>
            <strong>{{ comment.nickname }}</strong>
            <span>@{{ comment.username }}</span>
          </div>
          <div class="task-comments__actions">
            <time>{{ formatDateTime(comment.createdAt) }}</time>
            <el-button
              v-if="canDeleteComment(comment)"
              link
              type="danger"
              :loading="deletingCommentId === comment.id"
              :disabled="deletingCommentId !== null"
              @click="handleDelete(comment)"
            >
              删除
            </el-button>
          </div>
        </div>
        <p>{{ comment.content }}</p>
      </article>
    </div>

    <el-form
      v-if="props.projectStatus !== 'archived'"
      class="task-comments__form"
      @submit.prevent="handleCreate"
    >
      <el-input
        v-model="content"
        type="textarea"
        :rows="3"
        maxlength="2000"
        show-word-limit
        placeholder="输入评论内容"
        :disabled="submitting"
      />
      <div class="task-comments__submit">
        <el-button
          type="primary"
          native-type="submit"
          :loading="submitting"
          :disabled="!content.trim()"
        >
          发表评论
        </el-button>
      </div>
    </el-form>
  </section>
</template>

<style scoped>
.task-comments__archived {
  margin-bottom: 16px;
}

.task-comments__loading {
  min-height: 120px;
}

.task-comments__list {
  display: grid;
  gap: 12px;
}

.task-comments__item {
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #eaecf0;
  border-radius: 10px;
}

.task-comments__meta,
.task-comments__actions,
.task-comments__submit {
  display: flex;
  align-items: center;
}

.task-comments__meta {
  justify-content: space-between;
  gap: 16px;
}

.task-comments__meta strong {
  color: #344054;
}

.task-comments__meta span,
.task-comments__meta time {
  margin-left: 6px;
  color: #98a2b3;
  font-size: 12px;
}

.task-comments__actions {
  gap: 6px;
}

.task-comments__item p {
  margin: 10px 0 0;
  color: #475467;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.task-comments__form {
  margin-top: 18px;
}

.task-comments__submit {
  justify-content: flex-end;
  margin-top: 10px;
}

@media (max-width: 640px) {
  .task-comments__meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
