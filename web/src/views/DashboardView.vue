<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { getProjects } from "@/api/projects";
import { getMyTasks } from "@/api/tasks";
import ProjectQuickActions from "@/components/projects/ProjectQuickActions.vue";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import type { ProjectListItem, ProjectStatus } from "@/types/projects";
import { TASK_STATUS_TEXT, type Task } from "@/types/tasks";

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const projects = ref<ProjectListItem[]>([]);
const tasks = ref<Task[]>([]);
const projectTotal = ref(0);
const taskTotal = ref(0);
const submittedTaskTotal = ref(0);
const projectsLoading = ref(false);
const tasksLoading = ref(false);
const projectsError = ref("");
const tasksError = ref("");

const greetingName = computed(() => authStore.user?.nickname || authStore.user?.username || "同学");

const projectStatusText: Record<ProjectStatus, string> = {
  active: "进行中",
  finished: "已完成",
  archived: "已归档"
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "暂无截止时间";
  }
  return value.slice(0, 10);
};

const loadProjects = async () => {
  projectsLoading.value = true;
  projectsError.value = "";
  try {
    const result = await getProjects({ page: 1, pageSize: 4 });
    projects.value = result.list;
    projectTotal.value = result.total;
  } catch (error) {
    projectsError.value = error instanceof Error ? error.message : "项目摘要加载失败";
  } finally {
    projectsLoading.value = false;
  }
};

const loadTasks = async () => {
  tasksLoading.value = true;
  tasksError.value = "";
  try {
    // 列表和待审核总数都来自真实任务接口，工作台只负责组合展示。
    const [taskResult, submittedResult] = await Promise.all([
      getMyTasks({ page: 1, pageSize: 5 }),
      getMyTasks({ page: 1, pageSize: 1, status: "submitted" })
    ]);
    tasks.value = taskResult.list;
    taskTotal.value = taskResult.total;
    submittedTaskTotal.value = submittedResult.total;
  } catch (error) {
    tasksError.value = error instanceof Error ? error.message : "任务摘要加载失败";
  } finally {
    tasksLoading.value = false;
  }
};

onMounted(() => {
  void loadProjects();
  void loadTasks();
  void notificationStore.fetchUnreadCount().catch(() => undefined);
});
</script>

<template>
  <main class="projects-content dashboard-page">
    <div class="projects-heading dashboard-heading">
      <div>
        <p class="projects-heading__eyebrow">WORKBENCH</p>
        <h1>工作台总览 <span aria-hidden="true">👋</span></h1>
        <p class="projects-heading__description">
          欢迎回来，{{ greetingName }}！这里汇总你当前的项目、任务和通知。
        </p>
      </div>
      <ProjectQuickActions @changed="loadProjects" />
    </div>

    <section class="dashboard-stats" aria-label="工作台数据概览">
      <article class="dashboard-stat-card dashboard-stat-card--blue">
        <span class="dashboard-stat-card__icon" aria-hidden="true">项</span>
        <div>
          <p>参与项目</p>
          <strong>{{ projectTotal }}</strong>
          <span>创建或加入的项目</span>
        </div>
      </article>
      <article class="dashboard-stat-card dashboard-stat-card--orange">
        <span class="dashboard-stat-card__icon" aria-hidden="true">任</span>
        <div>
          <p>分配给我的任务</p>
          <strong>{{ taskTotal }}</strong>
          <span>包含全部任务状态</span>
        </div>
      </article>
      <article class="dashboard-stat-card dashboard-stat-card--purple">
        <span class="dashboard-stat-card__icon" aria-hidden="true">审</span>
        <div>
          <p>待审核提交</p>
          <strong>{{ submittedTaskTotal }}</strong>
          <span>等待负责人处理</span>
        </div>
      </article>
      <article class="dashboard-stat-card dashboard-stat-card--green">
        <span class="dashboard-stat-card__icon" aria-hidden="true">知</span>
        <div>
          <p>未读通知</p>
          <strong>{{ notificationStore.unreadCount }}</strong>
          <span>项目和任务新动态</span>
        </div>
      </article>
    </section>

    <section class="dashboard-workspace">
      <section class="projects-panel dashboard-projects">
        <div class="projects-panel__header">
          <div>
            <h2>项目进度概览</h2>
            <p>最近创建或加入的项目</p>
          </div>
          <el-button text type="primary" @click="router.push('/projects')">查看全部项目</el-button>
        </div>
        <div v-if="projectsLoading" v-loading="true" class="dashboard-loading" />
        <el-alert v-else-if="projectsError" :title="projectsError" type="error" :closable="false">
          <el-button link type="primary" @click="loadProjects">重试</el-button>
        </el-alert>
        <el-empty v-else-if="projects.length === 0" description="还没有项目" />
        <div v-else class="dashboard-project-grid">
          <button
            v-for="project in projects"
            :key="project.id"
            class="dashboard-project-card"
            @click="router.push(`/projects/${project.id}`)"
          >
            <div class="dashboard-project-card__top">
              <span
                class="projects-status-chip"
                :class="project.status === 'active'
                  ? 'projects-status-chip--active'
                  : 'projects-status-chip--muted'"
              >
                {{ projectStatusText[project.status] }}
              </span>
              <span>{{ project.role === "owner" ? "负责人" : "成员" }}</span>
            </div>
            <strong>{{ project.name }}</strong>
            <p>{{ project.description || "这个项目暂未填写简介。" }}</p>
            <div class="dashboard-project-card__meta">
              <span>{{ formatDate(project.startDate) }}</span>
              <span>至</span>
              <span>{{ formatDate(project.endDate) }}</span>
            </div>
          </button>
        </div>
      </section>

      <aside class="dashboard-side">
        <section class="projects-panel dashboard-tasks">
          <div class="projects-panel__header">
            <div>
              <h2>最近任务</h2>
              <p>近期分配给你的任务</p>
            </div>
            <el-button text type="primary" @click="router.push('/tasks')">查看全部</el-button>
          </div>
          <div v-if="tasksLoading" v-loading="true" class="dashboard-loading" />
          <el-alert v-else-if="tasksError" :title="tasksError" type="error" :closable="false">
            <el-button link type="primary" @click="loadTasks">重试</el-button>
          </el-alert>
          <el-empty v-else-if="tasks.length === 0" description="暂无任务" />
          <button
            v-for="task in tasks"
            v-else
            :key="task.id"
            class="dashboard-task-item"
            @click="router.push(`/projects/${task.projectId}?tab=tasks`)"
          >
            <span class="dashboard-task-item__dot" :class="`is-${task.status}`" />
            <span class="dashboard-task-item__content">
              <strong>{{ task.title }}</strong>
              <small>{{ task.projectName }} · {{ formatDate(task.dueAt) }}</small>
            </span>
            <span class="dashboard-task-item__status">{{ TASK_STATUS_TEXT[task.status] }}</span>
          </button>
        </section>

        <button class="dashboard-notice" @click="router.push('/notifications')">
          <div>
            <strong>最近通知</strong>
            <p>查看项目、任务和审核进展</p>
          </div>
          <span class="dashboard-notice__count">
            {{ notificationStore.unreadCount > 0 ? `${notificationStore.unreadCount} 条未读` : "已全部阅读" }}
          </span>
        </button>
      </aside>
    </section>
  </main>
</template>
