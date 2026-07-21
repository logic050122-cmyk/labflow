<script setup lang="ts">
import { reactive, watch } from "vue";

import type { CreateProjectRequest } from "@/types/projects";

const PROJECT_NAME_MAX_LENGTH = 100; //表示项目名称的最大长度为100个字符
const PROJECT_DESCRIPTION_MAX_LENGTH = 2000; //表示项目描述的最大长度为2000个字符
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/; // 用于匹配 YYYY-MM-DD 格式的正则表达式

// 定义表单数据和错误提示的接口
interface CreateProjectFormModel {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

// 定义表单错误提示的接口
interface CreateProjectFormErrors {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}
    //Partial是TypeScript的一个工具类型，
    //它将给定类型的所有属性变为可选的。
    // 这里表示initialValue可以是CreateProjectRequest类型的部分属性集合，
    // 允许传入部分字段来初始化表单。
const props = defineProps<{
  modelValue: boolean;
  title?: string;
  initialValue?: Partial<CreateProjectRequest>; 
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [value: CreateProjectRequest];
}>();

const emptyForm = (): CreateProjectFormModel => ({
  name: "",
  description: "",
  startDate: "",
  endDate: ""
});

const form = reactive<CreateProjectFormModel>(emptyForm());
const errors = reactive<CreateProjectFormErrors>({
  name: "",
  description: "",
  startDate: "",
  endDate: ""
});

const clearErrors = () => {
  errors.name = "";
  errors.description = "";
  errors.startDate = "";
  errors.endDate = "";
};

const resetForm = () => {
  Object.assign(form, emptyForm(), props.initialValue ?? {});
  clearErrors();
};

const closeDialog = () => {
  emit("update:modelValue", false);
};

// 不只检查格式，还确认日期真实存在，例如 2026-02-30 会校验失败。
const isValidDate = (value: string): boolean => {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    Boolean(yearText && monthText && dayText) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// 校验函数直接放在表单组件中，打开当前文件就能看清全部规则。
const validate = (): boolean => {
  clearErrors();

  const name = form.name.trim();
  const description = form.description.trim();

  if (!name) {
    errors.name = "项目名称不能为空";
  } else if (name.length > PROJECT_NAME_MAX_LENGTH) {
    errors.name = "项目名称不能超过 100 个字符";
  }

  if (description.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
    errors.description = "项目描述不能超过 2000 个字符";
  }

  if (!form.startDate) {
    errors.startDate = "开始日期不能为空";
  } else if (!isValidDate(form.startDate)) {
    errors.startDate = "开始日期必须使用有效的 YYYY-MM-DD 日期";
  }

  if (!form.endDate) {
    errors.endDate = "截止日期不能为空";
  } else if (!isValidDate(form.endDate)) {
    errors.endDate = "截止日期必须使用有效的 YYYY-MM-DD 日期";
  }

  if (!errors.startDate && !errors.endDate && form.endDate < form.startDate) {
    errors.endDate = "截止日期不能早于开始日期";
  }

  return (
    !errors.name &&
    !errors.description &&
    !errors.startDate &&
    !errors.endDate
  );
};

const handleSubmit = () => {
  if (!validate()) {
    return;
  }

  emit("submit", {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    startDate: form.startDate,
    endDate: form.endDate
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
    :title="props.title || '创建项目'"
    width="520px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="create-project-dialog__hint">
      填写项目基本信息。创建后项目默认是“进行中”，负责人由当前登录账号自动确定。
    </p>

    <el-form :model="form" label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="项目名称" required :error="errors.name">
        <el-input
          v-model="form.name"
          placeholder="例如：实验室官网重构"
          :maxlength="PROJECT_NAME_MAX_LENGTH"
          show-word-limit
          @input="errors.name = ''"
        />
      </el-form-item>

      <el-form-item label="项目描述" :error="errors.description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="简单说明项目目标和范围（选填）"
          :maxlength="PROJECT_DESCRIPTION_MAX_LENGTH"
          show-word-limit
          @input="errors.description = ''"
        />
      </el-form-item>

      <div class="create-project-dialog__dates">
        <el-form-item label="开始日期" required :error="errors.startDate">
          <el-date-picker
            v-model="form.startDate"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder="选择开始日期"
            @change="errors.startDate = ''"
          />
        </el-form-item>

        <el-form-item label="截止日期" required :error="errors.endDate">
          <el-date-picker
            v-model="form.endDate"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder="选择截止日期"
            @change="errors.endDate = ''"
          />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确认填写</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.create-project-dialog__hint {
  margin: -4px 0 22px;
  color: #7b8494;
  font-size: 13px;
  line-height: 1.7;
}

.create-project-dialog__dates {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.create-project-dialog__dates :deep(.el-date-editor) {
  width: 100%;
}

@media (max-width: 560px) {
  .create-project-dialog__dates {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
