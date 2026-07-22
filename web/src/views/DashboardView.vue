<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";

import BrandLogo from "@/components/auth/BrandLogo.vue";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog.vue";
import JoinProjectDialog from "@/components/projects/JoinProjectDialog.vue";
import { createProject, getProjects, joinProject } from "@/api/projects";
import { useAuthStore } from "@/stores/auth";
import type {
  CreateProjectRequest,
  JoinProjectRequest,
  ProjectListItem,
  ProjectStatus
} from "@/types/projects";

const authStore = useAuthStore();
const router = useRouter();
// 控制创建项目弹窗的显示状态，初始为 false，页面打开时默认不显示。
const createProjectDialogVisible = ref(false);
// 控制“通过邀请码加入项目”弹窗，加入成功后由当前页面重新加载真实项目列表。
const joinProjectDialogVisible = ref(false);
const joinProjectSubmitting = ref(false);
// 列表数据和页面状态放在当前页面，因为暂时没有其他页面共享这些数据。
const projects = ref<ProjectListItem[]>([]); // 存储项目列表数据
const projectTotal = ref(0); // 存储项目总数
const projectListLoading = ref(false);  // 控制项目列表加载状态，初始为 false，表示未加载。
const projectListError = ref(""); // 存储项目列表加载错误信息，初始为空字符串，表示没有错误。

// 后端保存英文状态，页面展示时统一转换成中文，避免模板里散落判断。
const projectStatusText: Record<ProjectStatus, string> = {
  active: "进行中",
  finished: "已完成",
  archived: "已归档"
};

const loadProjects = async () => {
  // 每次进入页面或创建项目成功后都会调用这里，重新取得最新列表。
  projectListLoading.value = true;
  projectListError.value = "";

  try {
    // 当前页面先加载第一页 20 条，分页控件留到列表数据量变大时再接入。
    const result = await getProjects({ page: 1, pageSize: 20 });
    projects.value = result.list;
    projectTotal.value = result.total;
  } catch (error) {
    projectListError.value = error instanceof Error ? error.message : "项目列表加载失败";
  } finally {
    projectListLoading.value = false;
  }
};

const handleLogout = async () => {
  authStore.logout();
  await router.replace("/login");
};

const handleCreateProject = async (project: CreateProjectRequest) => {
  try {
    // 子组件校验通过后，调用项目 API 把表单数据发送给后端。
    await createProject(project);
    createProjectDialogVisible.value = false;
    ElMessage.success("项目创建成功");
    await loadProjects();
  } catch (error) {
    // request() 已经把后端 message 转成 Error，这里直接展示给用户。
    ElMessage.error(error instanceof Error ? error.message : "项目创建失败");
  }
};

const handleJoinProject = async (payload: JoinProjectRequest) => {
  // 页面层负责串联“调用接口、关闭弹窗、刷新列表”，loading 防止重复提交。
  if (joinProjectSubmitting.value) {
    return;
  }

  joinProjectSubmitting.value = true; //用来控制“通过邀请码加入项目”弹窗的提交状态，防止重复提交。

  try {
    await joinProject(payload);
    joinProjectDialogVisible.value = false;
    ElMessage.success("加入项目成功");
    await loadProjects();
  } catch (error) {
    // request() 会优先使用后端返回的 message，例如“邀请码无效”或“已经加入项目”。
    ElMessage.error(error instanceof Error ? error.message : "加入项目失败");
  } finally {
    joinProjectSubmitting.value = false;
  }
};

const handleProjectClick = (project: ProjectListItem) => {
  void router.push({
    name: "project-detail",
    params: { projectId: project.id }
  });
};

onMounted(loadProjects);
</script>

<template>
  <main class="projects-page">
    <header class="projects-header">
      <div class="projects-header__brand">
        <BrandLogo :width="102" />

        <nav class="projects-nav" aria-label="主导航">
          <span class="projects-nav__item">工作台</span>
          <span class="projects-nav__item projects-nav__item--active">我的项目</span>
        </nav>
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

    <section class="projects-content">
      <div class="projects-heading">
        <div>
          <p class="projects-heading__eyebrow">PROJECT SPACE</p>
          <h1>我的项目</h1>
          <p class="projects-heading__description">在这里查看和管理你参与的项目。</p>
        </div>

        <div class="projects-actions" aria-label="项目操作">
          <el-button type="primary" @click="createProjectDialogVisible = true">
            创建项目
          </el-button>
          <el-button @click="joinProjectDialogVisible = true">通过邀请码加入</el-button>
        </div>
      </div>

      <section class="projects-panel" aria-label="项目数据">
        <div class="projects-panel__header">
          <div>
            <h2>项目列表</h2>
            <p>你创建或参与的项目会显示在这里。</p>
          </div>
          <span class="projects-panel__count">{{ projectTotal }} 个项目</span>
        </div>

        <div v-if="projectListLoading" v-loading="true" class="projects-loading" />

        <el-alert
          v-else-if="projectListError"
          class="projects-load-error"
          type="error"
          :closable="false"
          show-icon
        >
          <template #title>
            {{ projectListError }}
            <el-button link type="primary" @click="loadProjects">重新加载</el-button>
          </template>
        </el-alert>

        <el-table
          v-else-if="projects.length"
          :data="projects"
          class="projects-table"
          @row-click="handleProjectClick"
        >
          <el-table-column label="项目" min-width="220">
            <template #default="{ row }: { row: ProjectListItem }">
              <strong class="projects-table__name">{{ row.name }}</strong>
              <p class="projects-table__description">{{ row.description || "暂无描述" }}</p>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }: { row: ProjectListItem }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" effect="plain">
                {{ projectStatusText[row.status] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="我的角色" width="110">
            <template #default="{ row }: { row: ProjectListItem }">
              <el-tag :type="row.role === 'owner' ? 'primary' : 'info'">
                {{ row.role === "owner" ? "负责人" : "成员" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="项目周期" min-width="190">
            <template #default="{ row }: { row: ProjectListItem }">
              {{ row.startDate }} 至 {{ row.endDate }}
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-else class="projects-empty" :image-size="96" description="暂时还没有项目">
          <template #description>
            <div class="projects-empty__description">
              <p>暂时还没有项目</p>
              <span>点击“创建项目”，建立你的第一个协作项目。</span>
            </div>
          </template>
        </el-empty>
      </section>
    </section>

    <CreateProjectDialog
      v-model="createProjectDialogVisible"
      @submit="handleCreateProject"
    />

    <JoinProjectDialog
      v-model="joinProjectDialogVisible"
      :loading="joinProjectSubmitting"
      @submit="handleJoinProject"
    />
  </main>
</template>
