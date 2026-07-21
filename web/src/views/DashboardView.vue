<script setup lang="ts">
import { useRouter } from "vue-router";

import BrandLogo from "@/components/auth/BrandLogo.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

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
          <el-button type="primary" disabled>创建项目</el-button>
          <el-button disabled>通过邀请码加入</el-button>
        </div>
      </div>

      <section class="projects-panel" aria-label="项目数据">
        <div class="projects-panel__header">
          <div>
            <h2>项目列表</h2>
            <p>你创建或参与的项目会显示在这里。</p>
          </div>
          <span class="projects-panel__count">0 个项目</span>
        </div>

        <el-empty class="projects-empty" :image-size="96" description="暂时还没有项目">
          <template #description>
            <div class="projects-empty__description">
              <p>暂时还没有项目</p>
              <span>创建项目功能将在模块 2 接入。</span>
            </div>
          </template>
        </el-empty>
      </section>
    </section>
  </main>
</template>
