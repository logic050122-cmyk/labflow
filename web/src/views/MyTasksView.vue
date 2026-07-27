<script setup lang="ts">
import MyTaskList from "@/components/tasks/MyTaskList.vue";
</script>

<template>
  <main class="projects-content">
      <div class="projects-heading">
        <div>
          <p class="projects-heading__eyebrow">MY TASKS</p>
          <h1>我的任务</h1>
          <p class="projects-heading__description">这里仅展示当前登录账号负责的任务。</p>
        </div>
      </div>

      <!-- 列表、筛选和详情放到独立组件，避免页面文件堆积成难以阅读的业务代码。 -->
      <MyTaskList />
  </main>
</template>
