<script setup lang="ts">
import type { FileListItem } from "@/types/files";

const props = defineProps<{
  files: FileListItem[];
  deletingFileId: number | null;
  downloadingFileId: number | null;
}>();

const emit = defineEmits<{
  download: [file: FileListItem];
  delete: [file: FileListItem];
}>();

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
};

const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
};
</script>

<template>
  <el-table :data="props.files" class="file-items-table">
    <el-table-column label="文件名" min-width="220">
      <template #default="scope: { row: FileListItem }">
        <strong>{{ scope.row.originalName }}</strong>
        <p>{{ scope.row.mimeType }}</p>
      </template>
    </el-table-column>

    <el-table-column label="上传人" min-width="130">
      <template #default="scope: { row: FileListItem }">
        {{ scope.row.uploaderNickname }}
        <small>@{{ scope.row.uploaderUsername }}</small>
      </template>
    </el-table-column>

    <el-table-column label="大小" width="100">
      <template #default="scope: { row: FileListItem }">
        {{ formatFileSize(scope.row.sizeBytes) }}
      </template>
    </el-table-column>

    <el-table-column label="上传时间" min-width="170">
      <template #default="scope: { row: FileListItem }">
        {{ formatDateTime(scope.row.createdAt) }}
      </template>
    </el-table-column>

    <el-table-column label="操作" width="150" fixed="right">
      <template #default="scope: { row: FileListItem }">
        <el-button
          link
          type="primary"
          :loading="props.downloadingFileId === scope.row.id"
          :disabled="props.downloadingFileId !== null"
          @click="emit('download', scope.row)"
        >
          下载
        </el-button>
        <el-button
          v-if="scope.row.canDelete"
          link
          type="danger"
          :loading="props.deletingFileId === scope.row.id"
          :disabled="props.deletingFileId !== null"
          @click="emit('delete', scope.row)"
        >
          删除
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.file-items-table strong {
  color: #344054;
}

.file-items-table p,
.file-items-table small {
  color: #98a2b3;
  font-size: 12px;
}

.file-items-table p {
  margin: 4px 0 0;
}

.file-items-table small {
  display: block;
  margin-top: 3px;
}
</style>
