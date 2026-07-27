<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRoute, useRouter } from "vue-router";
import FileListPanel from "@/components/files/FileListPanel.vue";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog.vue";
import ProjectInviteDialog from "@/components/projects/ProjectInviteDialog.vue";
import ProjectMemberList from "@/components/projects/ProjectMemberList.vue";
import ProjectTaskList from "@/components/tasks/ProjectTaskList.vue";
import {
  archiveProject,
  finishProject,
  getProject,
  updateProject
} from "@/api/projects";
import type { CreateProjectRequest, ProjectDetail, ProjectStatus } from "@/types/projects";
const route = useRoute();
const router = useRouter();
const project = ref<ProjectDetail | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const editDialogVisible = ref(false);
const editLoading = ref(false);
const inviteDialogVisible = ref(false);
const statusChanging = ref(false);
const memberListRefreshKey = ref(0);
const formatDate = (date: string) => {
  return new Date(date).toLocaleString("zh-CN");
};

const projectStatusText: Record<ProjectStatus, string> = {
  active: "进行中",
  finished: "已完成",
  archived: "已归档"
};
const projectId = Number(route.params.projectId);
type ProjectTab = "overview" | "tasks" | "members" | "files" | "settings";
const projectTabs: ProjectTab[] = ["overview", "tasks", "members", "files", "settings"];
// 查询参数让刷新和复制地址后仍能回到同一个项目区域。
const activeTab = computed<ProjectTab>({
  get() {
    const requestedTab = String(route.query.tab || "overview") as ProjectTab;
    if (!projectTabs.includes(requestedTab)) {
      return "overview";
    }
    if (requestedTab === "settings" && project.value?.role !== "owner") {
      return "overview";
    }
    return requestedTab;
  },
  set(tab) {
    void router.replace({
      query: { ...route.query, tab: tab === "overview" ? undefined : tab }
    });
  }
});
const loadProject = async () => {
  if (!Number.isSafeInteger(projectId) || projectId < 1) {
    errorMessage.value = "项目 ID 不正确";
    return;
  }
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await getProject(projectId);
    console.log("项目详情", result);
    project.value = result.project;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "项目详情加载失败";
  } finally {
    loading.value = false;
  }
};
const goBackToProjects = () => {
  void router.push({ name: "projects" });
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

const handleTasksChanged = () => {
  memberListRefreshKey.value += 1;
};
const handleFinishProject = async () => {
  if (!project.value || statusChanging.value) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      "完成后成员不能继续处理任务，确认将项目标记为已完成吗？",
      "完成项目",
      { type: "warning", confirmButtonText: "确认完成", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }

  statusChanging.value = true;
  try {
    const result = await finishProject(project.value.id);
    project.value = result.project;
    ElMessage.success("项目已完成");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "完成项目失败");
  } finally {
    statusChanging.value = false;
  }
};

const handleArchiveProject = async () => {
  if (!project.value || statusChanging.value) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      "归档后项目只保留历史查看，确认归档吗？",
      "归档项目",
      { type: "warning", confirmButtonText: "确认归档", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }

  statusChanging.value = true;
  try {
    const result = await archiveProject(project.value.id);
    project.value = result.project;
    ElMessage.success("项目已归档，成员已收到通知");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "归档项目失败");
  } finally {
    statusChanging.value = false;
  }
};

onMounted(loadProject);
</script>

<template>
  <main class="project-detail-page project-detail-content projects-content">
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

      <el-tabs v-else-if="project" v-model="activeTab" class="project-detail-tabs">
        <el-tab-pane label="项目概览" name="overview" />
        <el-tab-pane label="项目任务" name="tasks" />
        <el-tab-pane label="项目成员" name="members" />
        <el-tab-pane label="项目文件" name="files" />
        <el-tab-pane v-if="project.role === 'owner'" label="项目设置" name="settings" />
      </el-tabs>

      <section
        v-if="project && activeTab === 'overview'"
        class="project-detail-card"
        aria-label="项目详情"
      >
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
            <strong>{{ formatDate(project.createdAt ) }}</strong>
          </div>
        </div>
      </section>

      <FileListPanel
        v-if="project && activeTab === 'files'"
        :project-id="project.id"
        :project-role="project.role"
        :project-status="project.status"
        card
      />

      <ProjectTaskList
        v-if="project && activeTab === 'tasks'"
        :project-id="project.id"
        :project-role="project.role"
        :project-status="project.status"
        @tasks-changed="handleTasksChanged"
      />

      <!-- 成员组件自己负责请求和错误重试，详情页只提供当前项目 ID。 -->
      <ProjectMemberList
        v-if="project && activeTab === 'members'"
        :project-id="project.id"
        :project-role="project.role"
        :project-status="project.status"
        :refresh-key="memberListRefreshKey"
      />

      <section
        v-if="project && activeTab === 'settings' && project.role === 'owner'"
        class="project-detail-card project-settings"
      >
        <div>
          <h2>项目设置</h2>
          <p>管理邀请码、项目信息和项目状态。状态变更后会按业务规则限制写操作。</p>
        </div>
        <div class="project-detail-card__actions">
          <el-button @click="inviteDialogVisible = true">项目邀请码</el-button>
          <el-button
            v-if="project.status === 'active'"
            type="primary"
            :loading="editLoading"
            @click="editDialogVisible = true"
          >编辑项目</el-button>
          <el-button
            v-if="project.status === 'active'"
            :loading="statusChanging"
            @click="handleFinishProject"
          >完成项目</el-button>
          <el-button
            v-if="project.status === 'finished'"
            type="warning"
            :loading="statusChanging"
            @click="handleArchiveProject"
          >归档项目</el-button>
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

      <ProjectInviteDialog
        v-if="project && project.role === 'owner'"
        v-model="inviteDialogVisible"
        :project-id="project.id"
        :project-name="project.name"
      />
  </main>
</template>
