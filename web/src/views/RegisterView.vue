<script setup lang="ts">
import PagePlaceholder from "@/components/PagePlaceholder.vue";
</script>

<template>
  <main class="auth-page">
    <RouterLink class="auth-page__brand" to="/dashboard">LabFlow</RouterLink>
    <PagePlaceholder eyebrow="ACCESS / 02" title="注册" description="注册表单将在认证模块开发时接入。" />
    <RouterLink class="auth-page__link" to="/login">返回登录页</RouterLink>
  </main>
</template>
