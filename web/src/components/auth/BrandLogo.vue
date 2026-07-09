<script setup lang="ts">
import logoImage from "@/assets/labflow-logo.png";

withDefaults(
  defineProps<{
    width?: number;
  }>(),
  {
    width: 112
  }
);
</script>

<template>
  <!-- 原始品牌图四周带有白边，这个裁切容器只负责还原文档中的横向 Logo。 -->
  <span class="brand-logo" :style="{ '--brand-logo-width': `${width}px` }">
    <img :src="logoImage" alt="LabFlow" />
  </span>
</template>
