<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";

import { createProject, joinProject } from "@/api/projects";
import type { CreateProjectRequest, JoinProjectRequest } from "@/types/projects";
import CreateProjectDialog from "./CreateProjectDialog.vue";
import JoinProjectDialog from "./JoinProjectDialog.vue";

const emit = defineEmits<{ changed: [] }>();
const createVisible = ref(false);
const joinVisible = ref(false);
const joinLoading = ref(false);

const handleCreate = async (payload: CreateProjectRequest) => {
  try {
    await createProject(payload);
    createVisible.value = false;
    ElMessage.success("项目创建成功");
    emit("changed");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "项目创建失败");
  }
};

const handleJoin = async (payload: JoinProjectRequest) => {
  if (joinLoading.value) return;
  joinLoading.value = true;
  try {
    await joinProject(payload);
    joinVisible.value = false;
    ElMessage.success("加入项目成功");
    emit("changed");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "加入项目失败");
  } finally {
    joinLoading.value = false;
  }
};
</script>

<template>
  <div class="projects-actions" aria-label="项目快捷操作">
    <el-button type="primary" @click="createVisible = true">创建项目</el-button>
    <el-button @click="joinVisible = true">邀请码加入</el-button>
  </div>
  <CreateProjectDialog v-model="createVisible" @submit="handleCreate" />
  <JoinProjectDialog v-model="joinVisible" :loading="joinLoading" @submit="handleJoin" />
</template>
