<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import BrandLogo from "@/components/auth/BrandLogo.vue";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

interface NavigationItem {
  path: string;
  label: string;
  shortLabel: string;
  iconText: string;
  showUnread?: boolean;
}

// 桌面侧栏和移动端底部导航共用同一份入口，避免两个端的菜单顺序不一致。
const navigationItems: NavigationItem[] = [
  { path: "/dashboard", label: "工作台", shortLabel: "工作台", iconText: "台" },
  { path: "/projects", label: "项目管理", shortLabel: "项目", iconText: "项" },
  { path: "/tasks", label: "任务中心", shortLabel: "任务", iconText: "任" },
  {
    path: "/notifications",
    label: "通知",
    shortLabel: "通知",
    iconText: "知",
    showUnread: true
  }
];

const logout = async () => {
  authStore.logout();
  notificationStore.reset();
  await router.replace("/login");
};

onMounted(() => {
  void notificationStore.fetchUnreadCount().catch(() => undefined);
});
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-sidebar__brand">
        <BrandLogo :width="154" />
        <p>实验室项目协作管理平台</p>
      </div>

      <nav class="app-sidebar__nav" aria-label="主导航">
        <RouterLink
          v-for="item in navigationItems"
          :key="item.path"
          class="app-sidebar__link"
          :to="item.path"
        >
          <span class="app-sidebar__icon" aria-hidden="true">{{ item.iconText }}</span>
          <span>{{ item.label }}</span>
          <span
            v-if="item.showUnread && notificationStore.unreadCount > 0"
            class="app-sidebar__unread"
          >
            {{ notificationStore.unreadCount > 99 ? "99+" : notificationStore.unreadCount }}
          </span>
        </RouterLink>
      </nav>

      <div class="app-sidebar__footer">
        <div class="app-sidebar__tip">
          <span class="app-sidebar__tip-icon" aria-hidden="true">✓</span>
          <strong>高效协作，推进项目</strong>
          <p>集中管理项目、任务和通知，让团队进展更清楚。</p>
        </div>

        <div class="app-sidebar__user">
          <el-avatar :size="38" class="app-sidebar__avatar">
            {{ authStore.user?.nickname?.slice(0, 1) || "U" }}
          </el-avatar>
          <div class="app-sidebar__user-info">
            <strong>{{ authStore.user?.nickname }}</strong>
            <span>{{ authStore.user?.username }}</span>
          </div>
          <el-button text class="app-sidebar__logout" @click="logout">退出</el-button>
        </div>
      </div>
    </aside>

    <div class="app-main">
      <header class="app-mobile-header">
        <BrandLogo :width="112" />
        <div class="app-mobile-header__user">
          <el-avatar :size="32" class="app-sidebar__avatar">
            {{ authStore.user?.nickname?.slice(0, 1) || "U" }}
          </el-avatar>
          <el-button text @click="logout">退出</el-button>
        </div>
      </header>

      <RouterView />
    </div>

    <!-- 小屏幕使用固定底部导航，让核心业务入口始终可达。 -->
    <nav class="app-mobile-nav" aria-label="移动端主导航">
      <RouterLink
        v-for="item in navigationItems"
        :key="item.path"
        class="app-mobile-nav__item"
        :to="item.path"
      >
        <span class="app-mobile-nav__icon" aria-hidden="true">{{ item.iconText }}</span>
        <span>{{ item.shortLabel }}</span>
        <span
          v-if="item.showUnread && notificationStore.unreadCount > 0"
          class="app-mobile-nav__unread"
        >
          {{ notificationStore.unreadCount > 99 ? "99+" : notificationStore.unreadCount }}
        </span>
      </RouterLink>
    </nav>
  </div>
</template>
