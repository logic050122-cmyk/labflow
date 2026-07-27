<script setup lang="ts">
import AuthCard from "@/components/auth/AuthCard.vue";
import BrandLogo from "@/components/auth/BrandLogo.vue";
</script>

<template>
  <main class="auth-page">
    <!-- 1. 登录和注册共用同一品牌栏，切换入口时页面不会发生视觉跳变。 -->
    <header class="auth-page__header">
      <BrandLogo :width="104" />
      <p class="auth-page__promise">
        <span class="auth-page__promise-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <circle cx="6" cy="8" r="2.2" />
            <circle cx="14" cy="8" r="2.2" />
            <path d="M2.8 15c.4-2.4 1.5-3.6 3.2-3.6s2.8 1.2 3.2 3.6M10.8 15c.4-2.4 1.5-3.6 3.2-3.6s2.8 1.2 3.2 3.6" />
          </svg>
        </span>
        让团队协作更高效，让项目交付更成功
      </p>
    </header>

    <div class="auth-page__content">
      <!-- 2. 左侧说明当前已有的项目、任务和通知能力。 -->
      <section class="auth-intro" aria-labelledby="auth-product-title">
        <div class="auth-intro__copy">
          <h1 id="auth-product-title">高效协作，<br />驱动项目成功</h1>
          <strong>LabFlow</strong>
          <span class="auth-intro__accent" aria-hidden="true"></span>
          <p>为团队打造的一体化协作平台，<br />让工作更透明、协同更高效。</p>
        </div>

        <ul class="auth-features" aria-label="平台核心能力">
          <li class="auth-feature">
            <span class="auth-feature__icon auth-feature__icon--project" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M3.5 19c.4-3 2.1-4.6 5-4.6s4.6 1.6 5 4.6" />
                <path d="M16 11.2a2.5 2.5 0 1 0 0-5" />
                <path d="M15.5 14.7c2.7.2 4.2 1.6 4.6 4.3" />
              </svg>
            </span>
            <span class="auth-feature__copy">
              <strong>项目协作</strong>
              <small>共享项目信息、明确成员分工，提升团队协作效率。</small>
            </span>
          </li>

          <li class="auth-feature">
            <span class="auth-feature__icon auth-feature__icon--task" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M8 5.5H5.8A1.8 1.8 0 0 0 4 7.3v11A1.8 1.8 0 0 0 5.8 20h12.4a1.8 1.8 0 0 0 1.8-1.7v-11a1.8 1.8 0 0 0-1.8-1.8H16" />
                <path d="M9 4h6v3H9z" />
                <path d="m8 13 2.2 2.2L16 10" />
              </svg>
            </span>
            <span class="auth-feature__copy">
              <strong>任务跟踪</strong>
              <small>统一管理任务状态与进度，确保工作按计划推进。</small>
            </span>
          </li>

          <li class="auth-feature">
            <span class="auth-feature__icon auth-feature__icon--notice" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 5 2.2 5.4 2.2 7H4.3c0-1.6 2.2-2 2.2-7Z" />
                <path d="M9.5 19.2a2.7 2.7 0 0 0 5 0" />
              </svg>
            </span>
            <span class="auth-feature__copy">
              <strong>通知提醒</strong>
              <small>及时接收关键动态，不错过任务与项目状态变化。</small>
            </span>
          </li>
        </ul>
      </section>

      <!-- 3. 公共卡片负责路由标签、动态高度和表单过渡。 -->
      <section class="auth-page__panel" aria-label="账号操作区域">
        <AuthCard />
      </section>
    </div>
  </main>
</template>
