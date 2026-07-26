<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  deleteFile,
  downloadFile,
  getProjectFiles,
  getTaskFiles,
  uploadProjectFile,
  uploadTaskFile
} from "@/api/files";
import FileItemsTable from "@/components/files/FileItemsTable.vue";
import type { FileListItem } from "@/types/files";
import type { ProjectRole, ProjectStatus } from "@/types/projects";
const props = withDefaults(
  defineProps<{
    projectId: number;
    taskId?: number;
    projectRole?: ProjectRole;
    projectStatus: ProjectStatus;
    card?: boolean;
  }>(),
  {
    card: false
  }
);

// 组件自己维护文件列表和各种请求状态，父页面只提供项目、任务和角色信息。
const files = ref<FileListItem[]>([]);
const loading = ref(false);
const uploading = ref(false);
const deletingFileId = ref<number | null>(null);
const downloadingFileId = ref<number | null>(null);
const errorMessage = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

// 传入 taskId 表示任务附件，否则表示项目公共文件。
const isTaskAttachment = computed(() => props.taskId !== undefined);

// 归档项目一律只读；项目文件只有 Owner 上传，任务附件允许项目成员上传。
const canUpload = computed(() => {
  if (props.projectStatus === "archived") {
    return false;
  }
  return isTaskAttachment.value || props.projectRole === "owner";
});
const title = computed(() =>
  isTaskAttachment.value ? "任务附件" : "项目文件"
);

// 根据当前模式调用不同列表接口，错误保留在组件内并提供重新加载按钮。
const loadFiles = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = isTaskAttachment.value
      ? await getTaskFiles(props.taskId as number)
      : await getProjectFiles(props.projectId);
    files.value = result.files;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : `${title.value}加载失败`;
  } finally {
    loading.value = false;
  }
};

// 隐藏原生 input，由 Element Plus 按钮触发文件选择。
const openFilePicker = () => {
  if (canUpload.value && !uploading.value) {
    fileInput.value?.click();
  }
};

// 前端先做空文件和 10 MB 限制提示，后端仍会再次校验，不能只依赖页面。
const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0];
  input.value = "";
  if (!selectedFile || uploading.value || !canUpload.value) {
    return;
  }
  if (selectedFile.size < 1) {
    ElMessage.warning("不能上传空文件");
    return;
  }
  if (selectedFile.size > 10 * 1024 * 1024) {
    ElMessage.warning("文件大小不能超过 10 MB");
    return;
  }
  uploading.value = true;
  try {
    const result = isTaskAttachment.value
      ? await uploadTaskFile(props.taskId as number, selectedFile)
      : await uploadProjectFile(props.projectId, selectedFile);
    files.value.unshift(result.file);
    ElMessage.success(`${title.value}上传成功`);
  } catch (error) {
    ElMessage.error(
      error instanceof Error ? error.message : `${title.value}上传失败`
    );
  } finally {
    uploading.value = false;
  }
};

// Blob 先转换成本地临时 URL，再用隐藏链接触发浏览器下载。
const handleDownload = async (file: FileListItem) => {
  if (downloadingFileId.value !== null) {
    return;
  }
  downloadingFileId.value = file.id;
  try {
    const blob = await downloadFile(file.id);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "文件下载失败");
  } finally {
    downloadingFileId.value = null;
  }
};

// 删除前必须二次确认；成功后只从当前列表移除对应记录。
const handleDelete = async (file: FileListItem) => {
  if (!file.canDelete || deletingFileId.value !== null) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定删除文件“${file.originalName}”吗？删除后无法恢复。`,
      "删除文件",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    return;
  }
  deletingFileId.value = file.id;
  try {
    await deleteFile(file.id);
    files.value = files.value.filter((item) => item.id !== file.id);
    ElMessage.success("文件删除成功");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "文件删除失败");
  } finally {
    deletingFileId.value = null;
  }
};

// 项目或任务变化时重新读取文件；immediate 保证组件首次出现就加载。
watch(
  () => [props.projectId, props.taskId],
  () => {
    void loadFiles();
  },
  { immediate: true }
);
</script>
<template>
  <section
    class="file-panel"
    :class="{ 'file-panel--card': props.card }"
    :aria-label="title"
  >
    <div class="file-panel__heading">
      <div>
        <p v-if="props.card">PROJECT FILES</p>
        <h2>{{ title }}</h2>
        <span>
          {{
            isTaskAttachment
              ? "项目成员可上传任务附件"
              : "项目负责人可上传项目公共文件"
          }}
        </span>
      </div>
      <div>
        <input
          ref="fileInput"
          type="file"
          hidden
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
          @change="handleFileChange"
        />
        <el-button
          v-if="canUpload"
          type="primary"
          :loading="uploading"
          @click="openFilePicker"
        >
          上传文件
        </el-button>
      </div>
    </div>
    <el-alert
      v-if="props.projectStatus === 'archived'"
      class="file-panel__notice"
      type="info"
      :closable="false"
      show-icon
      title="项目已归档，只能查看和下载历史文件。"
    />
    <div v-if="loading" v-loading="true" class="file-panel__loading" />
    <el-alert v-else-if="errorMessage" type="error" :closable="false" show-icon>
      <template #title>
        {{ errorMessage }}
        <el-button link type="primary" @click="loadFiles">重新加载</el-button>
      </template>
    </el-alert>
    <el-empty
      v-else-if="files.length === 0"
      :image-size="72"
      :description="`暂时没有${title}`"
    />
    <FileItemsTable
      v-else
      :files="files"
      :deleting-file-id="deletingFileId"
      :downloading-file-id="downloadingFileId"
      @download="handleDownload"
      @delete="handleDelete"
    />
    <p v-if="canUpload" class="file-panel__help">
      单个文件最大 10 MB，支持图片、PDF、Office 文档、文本和 ZIP。
    </p>
  </section>
</template>
<style scoped>
.file-panel {
  min-width: 0;
}
.file-panel--card {
  margin-top: 22px;
  padding: clamp(24px, 3vw, 34px);
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e6eaf0;
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(38, 53, 79, 0.04);
}
.file-panel__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}
.file-panel__heading p {
  margin: 0 0 6px;
  color: #5c7fb5;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.file-panel__heading h2 {
  margin: 0;
  color: #27364c;
  font-size: 20px;
}
.file-panel__heading span,
.file-panel__help {
  color: #98a2b3;
  font-size: 12px;
}
.file-panel__heading span {
  display: block;
  margin-top: 6px;
}
.file-panel__notice {
  margin-bottom: 16px;
}
.file-panel__loading {
  min-height: 120px;
}
.file-panel__help {
  margin: 14px 0 0;
  text-align: right;
}
@media (max-width: 640px) {
  .file-panel__heading {
    flex-direction: column;
  }
}
</style>
