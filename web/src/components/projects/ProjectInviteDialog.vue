<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";

import { refreshProjectInviteCode } from "@/api/projects";

const props = defineProps<{
  modelValue: boolean;
  projectId: number;
  projectName: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const inviteCode = ref("");
const loading = ref(false);

const closeDialog = () => {
  emit("update:modelValue", false);
};

const handleGenerate = async () => {
  loading.value = true;

  try {
    // 后端会再次校验当前用户是否为该项目的 Owner，前端按钮隐藏不是权限控制。
    const result = await refreshProjectInviteCode(props.projectId);
    inviteCode.value = result.inviteCode;
    ElMessage.success("新邀请码已生成");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "邀请码生成失败");
  } finally {
    loading.value = false;
  }
};

const handleCopy = async () => {
  if (!inviteCode.value) {
    return;
  }

  if (!navigator.clipboard) {
    ElMessage.error("当前浏览器不支持自动复制，请手动复制邀请码");
    return;
  }

  try {
    await navigator.clipboard.writeText(inviteCode.value);
    ElMessage.success("邀请码已复制");
  } catch {
    ElMessage.error("复制失败，请手动复制邀请码");
  }
};
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    title="项目邀请码"
    width="460px"
    :close-on-click-modal="!loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="project-invite-dialog__project">{{ props.projectName }}</p>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="每次生成都会让旧邀请码立即失效，请把新邀请码发送给需要加入项目的成员。"
    />

    <div class="project-invite-dialog__code">
      <template v-if="inviteCode">
        <span>本次生成的邀请码</span>
        <div>
          <code>{{ inviteCode }}</code>
          <el-button type="primary" plain @click="handleCopy">复制邀请码</el-button>
        </div>
      </template>
      <el-empty v-else description="尚未生成本次邀请码" :image-size="70" />
    </div>

    <template #footer>
      <el-button :disabled="loading" @click="closeDialog">关闭</el-button>
      <el-button type="primary" :loading="loading" @click="handleGenerate">
        {{ inviteCode ? "重新生成" : "生成邀请码" }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.project-invite-dialog__project {
  margin: -4px 0 16px;
  color: #344054;
  font-size: 15px;
  font-weight: 600;
}

.project-invite-dialog__code {
  min-height: 138px;
  margin-top: 20px;
  padding: 18px;
  background: #f8fafc;
  border: 1px solid #e6eaf0;
  border-radius: 10px;
}

.project-invite-dialog__code > span {
  display: block;
  margin-bottom: 12px;
  color: #7b8494;
  font-size: 13px;
}

.project-invite-dialog__code > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.project-invite-dialog__code code {
  color: #1d4ed8;
  font-family: Consolas, "Courier New", monospace;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  overflow-wrap: anywhere;
}

.project-invite-dialog__code :deep(.el-empty) {
  padding: 0;
}

@media (max-width: 520px) {
  .project-invite-dialog__code > div {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
