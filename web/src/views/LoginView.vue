<script setup lang="ts">
import PagePlaceholder from "@/components/PagePlaceholder.vue";
</script>

<template>
  <main class="auth-page">
    <RouterLink class="auth-page__brand" to="/dashboard">LabFlow</RouterLink>
    <PagePlaceholder eyebrow="ACCESS / 01" title="登录" description="登录表单将在认证模块开发时接入。" />
    <RouterLink class="auth-page__link" to="/register">前往注册页</RouterLink>
  </main>
</template>
