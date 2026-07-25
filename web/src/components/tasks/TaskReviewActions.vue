<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { approveTask, rejectTask, submitTask } from "@/api/tasks";
import type { ProjectRole } from "@/types/projects";
import type { Task } from "@/types/tasks";

type TaskReviewMode = "assignee" | "owner";

const props = defineProps<{
  task: Task;
  mode: TaskReviewMode;
  projectRole?: ProjectRole;
}>();

const emit = defineEmits<{
  changed: [task: Task];
}>();

const submitVisible = ref(false);
const rejectVisible = ref(false);
const submitContent = ref("");
const rejectionReason = ref("");
const actionLoading = ref(false);

// “我的任务”只展示当前用户负责的任务，因此 doing 状态可直接显示提交按钮。
const canSubmit = computed(() => {
  return (
    props.mode === "assignee" &&
    props.task.projectStatus === "active" &&
    props.task.status === "doing"
  );
});

// 前端按钮只做交互提示，真正的 Owner 权限和 submitted 状态仍由后端 service 校验。
const canReview = computed(() => {
  return (
    props.mode === "owner" &&
    props.projectRole === "owner" &&
    props.task.projectStatus === "active" &&
    props.task.status === "submitted"
  );
});

const openSubmitDialog = () => {
  submitContent.value = "";
  submitVisible.value = true;
};

const handleSubmit = async () => {
  if (!canSubmit.value || actionLoading.value) {
    return;
  }

  const content = submitContent.value.trim();
  if (content.length > 10000) {
    ElMessage.error("完成说明最多 10000 个字符");
    return;
  }

  actionLoading.value = true;
  try {
    const result = await submitTask(
      props.task.id,
      content ? { submitContent: content } : {}
    );
    submitVisible.value = false;
    ElMessage.success("任务已提交，等待项目负责人审核");
    emit("changed", result.task);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "任务提交失败");
  } finally {
    actionLoading.value = false;
  }
};

const handleApprove = async () => {
  if (!canReview.value || actionLoading.value) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认通过任务“${props.task.title}”吗？通过后任务将标记为已完成。`,
      "审核通过",
      {
        confirmButtonText: "确认通过",
        cancelButtonText: "取消",
        type: "success"
      }
    );
  } catch {
    return;
  }

  actionLoading.value = true;
  try {
    const result = await approveTask(props.task.id);
    ElMessage.success("任务审核通过");
    emit("changed", result.task);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "审核任务失败");
  } finally {
    actionLoading.value = false;
  }
};

const openRejectDialog = () => {
  rejectionReason.value = "";
  rejectVisible.value = true;
};

const handleReject = async () => {
  if (!canReview.value || actionLoading.value) {
    return;
  }

  const reason = rejectionReason.value.trim();
  if (!reason) {
    ElMessage.warning("请填写驳回原因");
    return;
  }

  if (reason.length > 500) {
    ElMessage.error("驳回原因最多 500 个字符");
    return;
  }

  actionLoading.value = true;
  try {
    const result = await rejectTask(props.task.id, { reason });
    rejectVisible.value = false;
    ElMessage.success("任务已驳回，状态已恢复为进行中");
    emit("changed", result.task);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "驳回任务失败");
  } finally {
    actionLoading.value = false;
  }
};
</script>

<template>
  <span class="task-review-actions">
    <el-button
      v-if="canSubmit"
      link
      type="success"
      :loading="actionLoading"
      @click="openSubmitDialog"
    >
      提交任务
    </el-button>

    <template v-if="canReview">
      <el-button link type="success" :loading="actionLoading" @click="handleApprove">
        通过
      </el-button>
      <el-button link type="danger" :disabled="actionLoading" @click="openRejectDialog">
        驳回
      </el-button>
    </template>

    <el-dialog v-model="submitVisible" title="提交任务" width="520px" append-to-body>
      <p class="task-review-actions__hint">
        完成说明可以不填。提交后任务会进入待审核状态，等待项目负责人处理。
      </p>
      <el-input
        v-model="submitContent"
        type="textarea"
        :rows="6"
        maxlength="10000"
        show-word-limit
        placeholder="填写完成内容、测试结果或需要负责人关注的信息"
      />
      <template #footer>
        <el-button :disabled="actionLoading" @click="submitVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="handleSubmit">
          确认提交
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectVisible" title="驳回任务" width="520px" append-to-body>
      <p class="task-review-actions__hint">
        请明确说明需要修改的内容。驳回后任务会回到进行中，负责人可以继续处理并重新提交。
      </p>
      <el-input
        v-model="rejectionReason"
        type="textarea"
        :rows="5"
        maxlength="500"
        show-word-limit
        placeholder="请输入驳回原因"
      />
      <template #footer>
        <el-button :disabled="actionLoading" @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="actionLoading" @click="handleReject">
          确认驳回
        </el-button>
      </template>
    </el-dialog>
  </span>
</template>

<style scoped>
.task-review-actions {
  display: inline-flex;
  align-items: center;
}

.task-review-actions__hint {
  margin: 0 0 14px;
  color: #667085;
  line-height: 1.7;
}
</style>
