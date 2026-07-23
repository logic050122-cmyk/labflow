<script setup lang="ts">
import { useRouter } from "vue-router";

import BrandLogo from "@/components/auth/BrandLogo.vue";
import MyTaskList from "@/components/tasks/MyTaskList.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

const goDashboard = () => {
  void router.push({ name: "dashboard" });
};

const handleLogout = async () => {
  authStore.logout();
  await router.replace("/login");
};
</script>

<template>
  <main class="projects-page">
    <header class="projects-header">
      <div class="projects-header__brand">
        <BrandLogo :width="102" />
        <el-button text type="primary" @click="goDashboard">返回我的项目</el-button>
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
          <p class="projects-heading__eyebrow">MY TASKS</p>
          <h1>我的任务</h1>
          <p class="projects-heading__description">这里仅展示当前登录账号负责的任务。</p>
        </div>
      </div>

      <!-- 列表、筛选和详情放到独立组件，避免页面文件堆积成难以阅读的业务代码。 -->
      <MyTaskList />
    </section>
  </main>
</template>
