<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";

import BrandLogo from "@/components/auth/BrandLogo.vue";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/api/notifications";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import type {
  Notification,
  NotificationType
} from "@/types/notifications";

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const notifications = ref<Notification[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const readFilter = ref<"all" | "unread" | "read">("all");
const loading = ref(false);
const errorMessage = ref("");
const markingAll = ref(false);
const markingIds = ref<number[]>([]);

const notificationTypeText: Record<NotificationType, string> = {
  project: "项目",
  task: "任务",
  review: "审核",
  overdue: "逾期",
  system: "系统"
};

const notificationTypeTag: Record<
  NotificationType,
  "primary" | "success" | "warning" | "danger" | "info"
> = {
  project: "primary",
  task: "success",
  review: "warning",
  overdue: "danger",
  system: "info"
};

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString("zh-CN");
};

const getReadFilterValue = (): boolean | undefined => {
  if (readFilter.value === "read") {
    return true;
  }
  if (readFilter.value === "unread") {
    return false;
  }
  return undefined;
};

const loadNotifications = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await getNotifications({
      page: page.value,
      pageSize,
      isRead: getReadFilterValue()
    });
    notifications.value = result.list;
    total.value = result.total;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "通知列表加载失败";
  } finally {
    loading.value = false;
  }
};

const refreshUnreadCount = async () => {
  try {
    await notificationStore.fetchUnreadCount();
  } catch {
    // 列表仍可正常使用时，不用未读角标错误覆盖主要页面。
  }
};

const handleFilterChange = () => {
  page.value = 1;
  void loadNotifications();
};

const handlePageChange = (nextPage: number) => {
  page.value = nextPage;
  void loadNotifications();
};

const handleMarkRead = async (notification: Notification) => {
  if (notification.isRead || markingIds.value.includes(notification.id)) {
    return;
  }

  markingIds.value.push(notification.id);
  try {
    const result = await markNotificationRead(notification.id);
    const index = notifications.value.findIndex((item) => item.id === notification.id);
    if (index >= 0) {
      notifications.value[index] = result.notification;
    }
    await refreshUnreadCount();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "标记已读失败");
  } finally {
    markingIds.value = markingIds.value.filter((id) => id !== notification.id);
  }
};

const handleMarkAllRead = async () => {
  if (markingAll.value || notificationStore.unreadCount === 0) {
    return;
  }

  markingAll.value = true;
  try {
    const result = await markAllNotificationsRead();
    ElMessage.success(
      result.updatedCount > 0
        ? `已将 ${result.updatedCount} 条通知标记为已读`
        : "没有需要处理的未读通知"
    );
    await Promise.all([loadNotifications(), refreshUnreadCount()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "全部标记已读失败");
  } finally {
    markingAll.value = false;
  }
};

const openRelatedProject = async (notification: Notification) => {
  await handleMarkRead(notification);
  if (notification.projectId) {
    await router.push({
      name: "project-detail",
      params: { projectId: notification.projectId }
    });
  }
};

const handleLogout = async () => {
  notificationStore.reset();
  authStore.logout();
  await router.replace("/login");
};

onMounted(async () => {
  await Promise.all([loadNotifications(), refreshUnreadCount()]);
});
</script>

<template>
  <main class="notifications-page projects-page">
    <header class="projects-header">
      <div class="projects-header__brand">
        <BrandLogo :width="102" />
        <span class="notifications-header__title">通知中心</span>
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

    <section class="notifications-content projects-content">
      <el-button text class="notifications-back" @click="router.push('/dashboard')">
        ← 返回工作台
      </el-button>

      <section class="notifications-panel">
        <div class="notifications-heading">
          <div>
            <p class="projects-heading__eyebrow">NOTIFICATIONS</p>
            <h1>站内通知</h1>
            <p>查看项目、任务和审核进展。当前有 {{ notificationStore.unreadCount }} 条未读。</p>
          </div>
          <div class="notifications-actions">
            <el-select
              v-model="readFilter"
              aria-label="通知已读筛选"
              @change="handleFilterChange"
            >
              <el-option label="全部通知" value="all" />
              <el-option label="只看未读" value="unread" />
              <el-option label="只看已读" value="read" />
            </el-select>
            <el-button
              :loading="markingAll"
              :disabled="notificationStore.unreadCount === 0"
              @click="handleMarkAllRead"
            >
              全部标记已读
            </el-button>
          </div>
        </div>

        <div v-if="loading" v-loading="true" class="notifications-loading" />

        <el-alert
          v-else-if="errorMessage"
          type="error"
          :closable="false"
          show-icon
        >
          <template #title>
            {{ errorMessage }}
            <el-button link type="primary" @click="loadNotifications">重新加载</el-button>
          </template>
        </el-alert>

        <div v-else-if="notifications.length" class="notifications-list">
          <article
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            :class="{ 'notification-item--unread': !notification.isRead }"
          >
            <div class="notification-item__marker" />
            <div class="notification-item__body">
              <div class="notification-item__meta">
                <el-tag :type="notificationTypeTag[notification.type]" effect="plain">
                  {{ notificationTypeText[notification.type] }}
                </el-tag>
                <span>{{ formatDateTime(notification.createdAt) }}</span>
              </div>
              <h2>{{ notification.title }}</h2>
              <p>{{ notification.content }}</p>
              <div class="notification-item__actions">
                <el-button
                  v-if="!notification.isRead"
                  link
                  type="primary"
                  :loading="markingIds.includes(notification.id)"
                  @click="handleMarkRead(notification)"
                >
                  标记已读
                </el-button>
                <el-button
                  v-if="notification.projectId"
                  link
                  @click="openRelatedProject(notification)"
                >
                  查看相关项目
                </el-button>
              </div>
            </div>
          </article>
        </div>

        <el-empty v-else description="当前筛选条件下没有通知" />

        <el-pagination
          v-if="totalPages > 1"
          class="notifications-pagination"
          background
          layout="prev, pager, next"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          @current-change="handlePageChange"
        />
      </section>
    </section>
  </main>
</template>

