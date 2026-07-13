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
  <main class="dashboard-page">
    <header class="dashboard-header">
      <BrandLogo :width="104" />
      <el-button plain @click="handleLogout">退出登录</el-button>
    </header>

    <section class="dashboard-content">
      <div class="dashboard-welcome">
        <p>工作台</p>
        <h1>你好，{{ authStore.user?.nickname }}</h1>
        <span>当前账号：{{ authStore.user?.username }}</span>
      </div>

      <el-alert
        title="登录状态正常"
        description="当前用户信息已通过受保护接口获取。"
        type="success"
        show-icon
        :closable="false"
      />

      <section class="dashboard-empty" aria-label="项目数据">
        <h2>我的项目与任务</h2>
        <el-empty description="项目和任务模块将在后续步骤接入" />
      </section>
    </section>
  </main>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background: #f4f7fb;
  color: #1f2937;
}

.dashboard-header {
  min-height: 68px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #dfe7f1;
}

.dashboard-content {
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
  padding: 48px 0;
}

.dashboard-welcome {
  margin-bottom: 28px;
}

.dashboard-welcome p {
  margin: 0 0 8px;
  color: #1765ad;
  font-weight: 600;
}

.dashboard-welcome h1 {
  margin: 0 0 10px;
  font-size: 30px;
  letter-spacing: 0;
}

.dashboard-welcome span {
  color: #64748b;
}

.dashboard-empty {
  margin-top: 24px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #dfe7f1;
  border-radius: 8px;
}

.dashboard-empty h2 {
  margin: 0;
  font-size: 18px;
}

@media (max-width: 640px) {
  .dashboard-header {
    padding: 0 16px;
  }

  .dashboard-content {
    padding: 32px 0;
  }

  .dashboard-welcome h1 {
    font-size: 26px;
  }
}
</style>
