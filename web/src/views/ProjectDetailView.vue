<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { useRoute, useRouter } from "vue-router";

import BrandLogo from "@/components/auth/BrandLogo.vue";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog.vue";
import { getProject, updateProject } from "@/api/projects";
import { useAuthStore } from "@/stores/auth";
import type { CreateProjectRequest, ProjectDetail, ProjectStatus } from "@/types/projects";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const project = ref<ProjectDetail | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const editDialogVisible = ref(false);
const editLoading = ref(false);

const projectStatusText: Record<ProjectStatus, string> = {
  active: "进行中",
  finished: "已完成",
  archived: "已归档"
};

const projectId = Number(route.params.projectId);

const loadProject = async () => {
  if (!Number.isSafeInteger(projectId) || projectId < 1) {
    errorMessage.value = "项目 ID 不正确";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await getProject(projectId);
    project.value = result.project;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "项目详情加载失败";
  } finally {
    loading.value = false;
  }
};

const goBackToProjects = () => {
  void router.push({ name: "dashboard" });
};

const handleLogout = async () => {
  authStore.logout();
  await router.replace("/login");
};

const handleUpdateProject = async (payload: CreateProjectRequest) => {
  if (!project.value) {
    return;
  }

  editLoading.value = true;
  try {
    const result = await updateProject(project.value.id, payload);
    project.value = result.project;
    editDialogVisible.value = false;
    ElMessage.success("项目更新成功");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "项目更新失败");
  } finally {
    editLoading.value = false;
  }
};

onMounted(loadProject);
</script>

<template>
  <main class="project-detail-page projects-page">
    <header class="projects-header">
      <div class="projects-header__brand">
        <BrandLogo :width="102" />
        <span class="project-detail-header__title">项目详情</span>
      </div>

      <div class="projects-user">
        <el-avatar :size="34" class="projects-user__avatar">
          {{ authStore.user?.nickname?.slice(0, 1) || "U" }}
        </el-avatar>
        <div class="projects-user__info">
          <strong>{{ authStore.user?.nickname }}</strong>
          <span>{{ authStore.user?.username }}</span>
        </div>
        <el-button text class="projects-user__logout" @click="handleLogout">退出</el-button>
      </div>
    </header>

    <section class="project-detail-content projects-content">
      <el-button text class="project-detail-back" @click="goBackToProjects">
        ← 返回我的项目
      </el-button>

      <div v-if="loading" v-loading="true" class="project-detail-loading" />

      <el-alert
        v-else-if="errorMessage"
        type="error"
        :closable="false"
        show-icon
        class="project-detail-error"
      >
        <template #title>
          {{ errorMessage }}
          <el-button link type="primary" @click="loadProject">重新加载</el-button>
        </template>
      </el-alert>

      <section v-else-if="project" class="project-detail-card" aria-label="项目详情">
        <div class="project-detail-card__heading">
          <div>
            <p class="projects-heading__eyebrow">PROJECT DETAIL</p>
            <h1>{{ project.name }}</h1>
            <p>{{ project.description || "这个项目暂时没有描述。" }}</p>
          </div>
          <div class="project-detail-card__tags">
            <el-tag :type="project.status === 'active' ? 'success' : 'info'" effect="plain">
              {{ projectStatusText[project.status] }}
            </el-tag>
            <el-tag :type="project.role === 'owner' ? 'primary' : 'info'">
              {{ project.role === "owner" ? "负责人" : "成员" }}
            </el-tag>
          </div>
        </div>

        <div v-if="project.role === 'owner'" class="project-detail-card__actions">
          <el-button type="primary" :loading="editLoading" @click="editDialogVisible = true">
            编辑项目
          </el-button>
        </div>

        <div class="project-detail-card__grid">
          <div>
            <span>项目编号</span>
            <strong>#{{ project.id }}</strong>
          </div>
          <div>
            <span>开始日期</span>
            <strong>{{ project.startDate }}</strong>
          </div>
          <div>
            <span>截止日期</span>
            <strong>{{ project.endDate }}</strong>
          </div>
          <div>
            <span>创建时间</span>
            <strong>{{ project.createdAt }}</strong>
          </div>
        </div>
      </section>

      <CreateProjectDialog
        v-if="project"
        v-model="editDialogVisible"
        title="编辑项目"
        :initial-value="{
          name: project.name,
          description: project.description || '',
          startDate: project.startDate,
          endDate: project.endDate
        }"
        @submit="handleUpdateProject"
      />
    </section>
  </main>
</template>

<style scoped>
.project-detail-header__title {
  color: #697386;
  font-size: 14px;
  font-weight: 600;
}

.project-detail-back {
  margin-bottom: 22px;
  padding-left: 0;
  color: #5c7fb5;
}

.project-detail-loading,
.project-detail-error {
  min-height: 260px;
}

.project-detail-error {
  min-height: auto;
}

.project-detail-card {
  padding: clamp(26px, 4vw, 46px);
  background: #ffffff;
  border: 1px solid #e6eaf0;
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(38, 53, 79, 0.04);
}

.project-detail-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 30px;
  border-bottom: 1px solid #edf0f4;
}

.project-detail-card h1 {
  margin: 0;
  color: #1d2939;
  font-size: clamp(28px, 3vw, 36px);
}

.project-detail-card__heading p:last-child {
  max-width: 680px;
  margin: 12px 0 0;
  color: #7b8494;
  line-height: 1.7;
}

.project-detail-card__tags {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.project-detail-card__actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 22px;
}

.project-detail-card__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  padding-top: 30px;
}

.project-detail-card__grid div {
  display: grid;
  gap: 8px;
}

.project-detail-card__grid span {
  color: #98a2b3;
  font-size: 12px;
}

.project-detail-card__grid strong {
  color: #344054;
  font-size: 14px;
}

@media (max-width: 720px) {
  .project-detail-card__heading {
    display: block;
  }

  .project-detail-card__tags {
    margin-top: 20px;
  }

  .project-detail-card__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
