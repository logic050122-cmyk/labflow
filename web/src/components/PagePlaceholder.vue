<script setup lang="ts">
// defineProps 声明父组件必须传入的内容，并获得 TypeScript 类型检查。
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <!-- 所有空页面复用同一个占位组件，避免八个页面重复写相同结构。 -->
  <section class="page-placeholder">
    <div class="page-placeholder__marker" aria-hidden="true"></div>
    <p class="page-placeholder__eyebrow">{{ eyebrow }}</p>
    <h1>{{ title }}</h1>
    <p class="page-placeholder__description">{{ description }}</p>
    <div class="page-placeholder__empty">
      <span>页面骨架已就绪</span>
      <small>业务内容将在对应模块开发时补充</small>
    </div>
  </section>
</template>
