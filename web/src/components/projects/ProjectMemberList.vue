<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { getProjectMembers, removeProjectMember } from "@/api/members";
import type { ProjectMemberListItem } from "@/types/members";
import type { ProjectRole, ProjectStatus } from "@/types/projects";

const props = defineProps<{
  projectId: number;
  projectRole: ProjectRole;
  projectStatus: ProjectStatus;
}>();

const members = ref<ProjectMemberListItem[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const removingUserId = ref<number | null>(null);

// 前端只负责隐藏不适用的按钮，后端 service 仍会重新校验真实权限和项目状态。
const canManageMembers = computed(() => {
  return props.projectRole === "owner" && props.projectStatus === "active";
});

const loadMembers = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    // request 已经自动携带 Token，这里只接收接口 data 中的 members。
    const result = await getProjectMembers(props.projectId);
    members.value = result.members;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "项目成员加载失败";
  } finally {
    loading.value = false;
  }
};

const formatJoinedAt = (value: string): string => {
  const joinedAt = new Date(value);

  // 如果后端时间意外无法解析，保留原值，避免页面直接显示 Invalid Date。
  if (Number.isNaN(joinedAt.getTime())) {
    return value;
  }

  return joinedAt.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const handleRemoveMember = async (member: ProjectMemberListItem) => {
  if (!canManageMembers.value || member.role === "owner" || removingUserId.value !== null) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      `移除后，${member.nickname} 将无法继续访问该项目。确认移除吗？`,
      "移除项目成员",
      {
        confirmButtonText: "确认移除",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    // 用户点击取消或关闭弹窗时不发送删除请求。
    return;
  }

  removingUserId.value = member.userId;
  try {
    const result = await removeProjectMember(props.projectId, member.userId);
    ElMessage.success("成员移除成功");

    // 使用接口返回的 removedUserId 确认目标，再重新请求列表保持页面与数据库一致。
    if (result.removedUserId === member.userId) {
      await loadMembers();
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "成员移除失败");
  } finally {
    removingUserId.value = null;
  }
};

onMounted(loadMembers);
</script>

<template>
  <section class="project-member-card" aria-label="项目成员">
    <div class="project-member-card__heading">
      <div>
        <p>PROJECT MEMBERS</p>
        <h2>项目成员</h2>
      </div>
      <span v-if="!loading && !errorMessage">共 {{ members.length }} 人</span>
    </div>

    <div v-if="loading" v-loading="true" class="project-member-card__loading" />

    <el-alert
      v-else-if="errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="project-member-card__error"
    >
      <template #title>
        {{ errorMessage }}
        <el-button link type="primary" @click="loadMembers">重新加载</el-button>
      </template>
    </el-alert>

    <el-empty
      v-else-if="members.length === 0"
      :image-size="80"
      description="当前项目还没有成员"
    />

    <el-table v-else :data="members" class="project-member-table">
      <el-table-column label="成员" min-width="210">
        <template #default="scope: { row: ProjectMemberListItem }">
          <div class="project-member-table__user">
            <el-avatar :size="36">
              {{ scope.row.nickname.slice(0, 1) || "U" }}
            </el-avatar>
            <div>
              <strong>{{ scope.row.nickname }}</strong>
              <span>@{{ scope.row.username }}</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="项目角色" width="120">
        <template #default="scope: { row: ProjectMemberListItem }">
          <el-tag :type="scope.row.role === 'owner' ? 'primary' : 'info'" effect="plain">
            {{ scope.row.role === "owner" ? "负责人" : "成员" }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="任务完成" width="130">
        <template #default="scope: { row: ProjectMemberListItem }">
          <strong class="project-member-table__tasks">
            {{ scope.row.completedTaskCount }} / {{ scope.row.totalTaskCount }}
          </strong>
        </template>
      </el-table-column>

      <el-table-column label="加入时间" min-width="180">
        <template #default="scope: { row: ProjectMemberListItem }">
          {{ formatJoinedAt(scope.row.joinedAt) }}
        </template>
      </el-table-column>

      <el-table-column
        v-if="canManageMembers"
        label="操作"
        width="110"
        fixed="right"
      >
        <template #default="scope: { row: ProjectMemberListItem }">
          <el-button
            v-if="scope.row.role === 'member'"
            link
            type="danger"
            :loading="removingUserId === scope.row.userId"
            :disabled="removingUserId !== null && removingUserId !== scope.row.userId"
            @click="handleRemoveMember(scope.row)"
          >
            移除
          </el-button>
          <span v-else class="project-member-table__owner-action">—</span>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<style scoped>
.project-member-card {
  margin-top: 22px;
  padding: clamp(24px, 3vw, 34px);
  background: #ffffff;
  border: 1px solid #e6eaf0;
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(38, 53, 79, 0.04);
}

.project-member-card__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.project-member-card__heading p {
  margin: 0 0 6px;
  color: #8ba5c8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.project-member-card__heading h2 {
  margin: 0;
  color: #1d2939;
  font-size: 22px;
}

.project-member-card__heading > span {
  color: #7b8494;
  font-size: 13px;
}

.project-member-card__loading {
  min-height: 180px;
}

.project-member-card__error {
  margin-bottom: 4px;
}

.project-member-table {
  width: 100%;
}

.project-member-table__user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-member-table__user div {
  display: grid;
  gap: 3px;
}

.project-member-table__user strong {
  color: #344054;
}

.project-member-table__user span {
  color: #98a2b3;
  font-size: 12px;
}

.project-member-table__tasks {
  color: #5c7fb5;
}

.project-member-table__owner-action {
  color: #c0c4cc;
}

@media (max-width: 720px) {
  .project-member-card {
    padding: 20px 16px;
    overflow-x: auto;
  }

  .project-member-table {
    min-width: 680px;
  }
}
</style>
