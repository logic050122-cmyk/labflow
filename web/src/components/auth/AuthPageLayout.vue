<script setup lang="ts">
import AuthCard from "@/components/auth/AuthCard.vue";
</script>

<template>
  <!-- 仿 vue-pure-admin：全屏背景 + 左侧插画 + 右侧表单 + 底部版权。 -->
  <div class="auth-page">
    <div class="auth-page__container">
      <!-- 1. 左侧插画：用内联 SVG 画一个团队协作场景，代替 pure-admin 的 illustration 图片。 -->
      <div class="auth-page__illustration" aria-hidden="true">
        <svg viewBox="0 0 500 380" xmlns="http://www.w3.org/2000/svg">
          <!-- 背景圆环装饰 -->
          <circle cx="250" cy="190" r="170" fill="#eef3ff" />
          <circle cx="250" cy="190" r="130" fill="#e6edff" opacity="0.6" />

          <!-- 中心看板 -->
          <rect x="150" y="90" width="200" height="150" rx="12" fill="#ffffff" stroke="#d6e0f5" stroke-width="2" />
          <!-- 看板标题条 -->
          <rect x="170" y="110" width="90" height="12" rx="6" fill="#4060ff" />
          <circle cx="330" cy="116" r="6" fill="#ffd166" />
          <!-- 看板内容行 -->
          <rect x="170" y="138" width="160" height="8" rx="4" fill="#e3e9f7" />
          <rect x="170" y="156" width="120" height="8" rx="4" fill="#e3e9f7" />
          <rect x="170" y="174" width="140" height="8" rx="4" fill="#e3e9f7" />
          <!-- 进度条 -->
          <rect x="170" y="200" width="100" height="10" rx="5" fill="#eef3ff" />
          <rect x="170" y="200" width="65" height="10" rx="5" fill="#4060ff" />
          <rect x="170" y="220" width="60" height="6" rx="3" fill="#c9d4ef" />

          <!-- 左下人物 -->
          <circle cx="120" cy="300" r="22" fill="#4060ff" />
          <circle cx="120" cy="285" r="10" fill="#ffffff" />
          <path d="M120 297 a14 14 0 0 1 14 14 v6 h-28 v-6 a14 14 0 0 1 14 -14 z" fill="#ffffff" />

          <!-- 右下人物 -->
          <circle cx="380" cy="300" r="22" fill="#8a6bff" />
          <circle cx="380" cy="285" r="10" fill="#ffffff" />
          <path d="M380 297 a14 14 0 0 1 14 14 v6 h-28 v-6 a14 14 0 0 1 14 -14 z" fill="#ffffff" />

          <!-- 连接线 + 协作节点 -->
          <path d="M142 300 Q250 260 358 300" fill="none" stroke="#b9c8ee" stroke-width="2" stroke-dasharray="4 4" />
          <circle cx="250" cy="268" r="14" fill="#22c55e" />
          <path d="M244 268 l4 5 l8 -9" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- 顶部小装饰：通知钟铛 -->
          <g transform="translate(360 70)">
            <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#d6e0f5" stroke-width="2" />
            <path d="M0 -8 a7 7 0 0 1 7 7 v3 l2 3 h-18 l2 -3 v-3 a7 7 0 0 1 7 -7 z" fill="#f59e0b" />
            <circle cx="0" cy="7" r="2" fill="#f59e0b" />
          </g>

          <!-- 顶部小装饰：任务勾选 -->
          <g transform="translate(140 70)">
            <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#d6e0f5" stroke-width="2" />
            <path d="M-6 0 l4 5 l8 -9" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </g>
        </svg>
      </div>

      <!-- 2. 右侧表单区：AuthCard 负责 logo、标题、标签切换和表单。 -->
      <div class="auth-page__box">
        <AuthCard />
      </div>
    </div>

    <!-- 3. 底部版权信息。 -->
    <div class="auth-page__footer">
      Copyright © 2020-present
      <a href="https://github.com/pure-admin" target="_blank" rel="noopener">&nbsp;LabFlow</a>
    </div>
  </div>
</template>
