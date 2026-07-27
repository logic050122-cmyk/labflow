<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import ProjectQuickActions from "@/components/projects/ProjectQuickActions.vue";
import { getProjects } from "@/api/projects";
import type {
  ProjectListItem,
  ProjectStatus
} from "@/types/projects";

const router = useRouter();
// 列表数据和页面状态放在当前页面，因为暂时没有其他页面共享这些数据。
const projects = ref<ProjectListItem[]>([]); // 存储项目列表数据
const projectTotal = ref(0); // 存储项目总数
const projectPage = ref(1);
const projectPageSize = 10;
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
    // 页码来自页面状态，用户切页后会请求后端对应的数据，不会再永久停留在第一页。
    const result = await getProjects({
      page: projectPage.value,
      pageSize: projectPageSize
    });
    projects.value = result.list;
    projectTotal.value = result.total;
  } catch (error) {
    projectListError.value = error instanceof Error ? error.message : "项目列表加载失败";
  } finally {
    projectListLoading.value = false;
  }
};

const handlePageChange = (nextPage: number) => {
  projectPage.value = nextPage;
  void loadProjects();
};

// 创建或加入项目后回到第一页，确保用户能立即看到刚产生的新数据。
const handleProjectsChanged = () => {
  projectPage.value = 1;
  void loadProjects();
};

const handleProjectClick = (project: ProjectListItem) => {
  void router.push({
    name: "project-detail",
    params: { projectId: project.id }
  });
};

onMounted(() => {
  void loadProjects();
});
</script>

<template>
  <main class="projects-content">
      <div class="projects-heading">
        <div>
          <p class="projects-heading__eyebrow">PROJECT SPACE</p>
          <h1>我的项目</h1>
          <p class="projects-heading__description">在这里查看和管理你参与的项目。</p>
        </div>

        <ProjectQuickActions @changed="handleProjectsChanged" />
      </div>

      <section class="projects-panel" aria-label="项目数据">
        <div class="projects-panel__header">
          <div>
            <h2>项目列表</h2>
            <p>你创建或参与的项目会显示在这里。</p>
            <span class="projects-panel__mobile-hint">左右滑动列表可查看完整信息</span>
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
              <!-- 项目列表使用高对比度状态胶囊，缩放截图和浅色屏幕下也能辨认。 -->
              <span
                class="projects-status-chip"
                :class="row.status === 'active'
                  ? 'projects-status-chip--active'
                  : 'projects-status-chip--muted'"
              >
                {{ projectStatusText[row.status] }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="我的角色" width="110">
            <template #default="{ row }: { row: ProjectListItem }">
              <span
                class="projects-status-chip"
                :class="row.role === 'owner'
                  ? 'projects-status-chip--owner'
                  : 'projects-status-chip--muted'"
              >
                {{ row.role === "owner" ? "负责人" : "成员" }}
              </span>
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

        <el-pagination
          v-if="projectTotal > projectPageSize"
          class="projects-pagination"
          background
          layout="prev, pager, next"
          :current-page="projectPage"
          :page-size="projectPageSize"
          :total="projectTotal"
          @current-change="handlePageChange"
        />
      </section>

  </main>
</template>
