<script setup lang="ts">
import { storeToRefs } from "pinia";
import { RouterLink, RouterView } from "vue-router";

import { useAppStore } from "@/stores/app";

// 导航信息集中维护，模板通过 v-for 自动生成链接。
const navigation = [
  { to: "/dashboard", label: "工作台", index: "01" },
  { to: "/projects", label: "项目", index: "02" },
  { to: "/my-tasks", label: "我的任务", index: "03" },
  { to: "/notifications", label: "通知中心", index: "04" },
  { to: "/profile", label: "个人中心", index: "05" }
];

const appStore = useAppStore();
// storeToRefs 保留 Pinia 状态的响应式，直接解构不会丢失更新能力。
const { sidebarOpen } = storeToRefs(appStore);
</script>

<template>
  <div class="app-shell">
    <!-- 移动端侧栏打开时显示遮罩，点击遮罩即可关闭侧栏。 -->
    <button
      v-if="sidebarOpen"
      class="app-shell__backdrop"
      aria-label="关闭导航"
      @click="appStore.closeSidebar"
    ></button>

    <aside class="app-sidebar" :class="{ 'app-sidebar--open': sidebarOpen }">
      <div class="brand">
        <span class="brand__mark">LF</span>
        <div>
          <strong>LabFlow</strong>
          <small>COLLABORATION DESK</small>
        </div>
      </div>

      <p class="app-sidebar__label">工作空间</p>
      <nav class="app-nav" aria-label="主导航">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          @click="appStore.closeSidebar"
        >
          <span>{{ item.index }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="app-sidebar__footer">
        <span class="status-dot"></span>
        <div>
          <strong>基础环境</strong>
          <small>等待业务模块接入</small>
        </div>
      </div>
    </aside>

    <main class="app-main">
      <header class="app-header">
        <button class="menu-button" aria-label="打开导航" @click="appStore.toggleSidebar">
          <span></span><span></span>
        </button>
        <p>实验室 / 工作室项目协作管理平台</p>
        <span class="app-header__edition">MVP 01</span>
      </header>
      <div class="app-content">
        <!-- 子路由页面会显示在 Layout 的主内容区域。 -->
        <RouterView />
      </div>
    </main>
  </div>
</template>
