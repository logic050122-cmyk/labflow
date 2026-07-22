<script setup lang="ts">
import { reactive, ref, watch } from "vue";

import type { JoinProjectRequest } from "@/types/projects";

const INVITE_CODE_MAX_LENGTH = 32;
const INVITE_CODE_PATTERN = /^[A-Z0-9]+$/;

const props = defineProps<{
  modelValue: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [value: JoinProjectRequest];
}>();

const form = reactive({
  inviteCode: ""
});
const inviteCodeError = ref("");

const resetForm = () => {
  form.inviteCode = "";
  inviteCodeError.value = "";
};

const closeDialog = () => {
  // 请求发送后不允许关闭弹窗，避免用户误以为请求已经取消。
  if (!props.loading) {
    emit("update:modelValue", false);
  }
};

const normalizeInviteCode = () => {
  // 与后端规则保持一致：去除首尾空格，并把小写字母统一转换为大写。
  form.inviteCode = form.inviteCode.trim().toUpperCase();
};

const validate = (): boolean => {
  inviteCodeError.value = "";
  normalizeInviteCode();

  if (!form.inviteCode) {
    inviteCodeError.value = "邀请码不能为空";
  } else if (form.inviteCode.length > INVITE_CODE_MAX_LENGTH) {
    inviteCodeError.value = "邀请码不能超过 32 个字符";
  } else if (!INVITE_CODE_PATTERN.test(form.inviteCode)) {
    inviteCodeError.value = "邀请码只能包含英文字母和数字";
  }

  return !inviteCodeError.value;
};

const handleSubmit = () => {
  // loading 判断可以阻止用户连续点击造成重复加入请求。
  if (props.loading || !validate()) {
    return;
  }

  emit("submit", { inviteCode: form.inviteCode });
};

watch(
  () => props.modelValue,
  () => {
    // 打开和关闭时都清空，避免上一次输入或错误提示残留到下一次操作。
    resetForm();
  }
);
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    title="通过邀请码加入项目"
    width="460px"
    destroy-on-close
    :close-on-click-modal="!props.loading"
    :close-on-press-escape="!props.loading"
    :show-close="!props.loading"
    @update:model-value="$event ? emit('update:modelValue', true) : closeDialog()"
  >
    <p class="join-project-dialog__hint">
      输入项目负责人发送给你的邀请码，加入后你会成为该项目的成员。
    </p>

    <el-form :model="form" label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="邀请码" required :error="inviteCodeError">
        <el-input
          v-model="form.inviteCode"
          placeholder="请输入 1 至 32 位字母或数字"
          :maxlength="INVITE_CODE_MAX_LENGTH"
          show-word-limit
          autocomplete="off"
          @input="inviteCodeError = ''"
          @blur="normalizeInviteCode"
          @keyup.enter="handleSubmit"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="props.loading" @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="props.loading" @click="handleSubmit">
        确认加入
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.join-project-dialog__hint {
  margin: -4px 0 22px;
  color: #7b8494;
  font-size: 13px;
  line-height: 1.7;
}
</style>
