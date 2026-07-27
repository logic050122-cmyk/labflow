<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

import BrandLogo from "@/components/auth/BrandLogo.vue";

const route = useRoute();
const bodyElement = ref<HTMLElement | null>(null);
const bodyHeight = ref<number | null>(null);

let resizeObserver: ResizeObserver | null = null;
let heightFrame: number | null = null;

// 目标路由决定表单滑动方向，同时驱动导航下划线的位置。
const isRegisterRoute = computed(() => route.name === "register");
const transitionName = computed(() =>
  isRegisterRoute.value ? "auth-route-forward" : "auth-route-backward"
);
const bodyStyle = computed(() =>
  bodyHeight.value === null ? undefined : { height: `${bodyHeight.value}px` }
);

// 表单校验提示或响应式换行会改变内容高度，观察后同步更新卡片高度。
const updateBodyHeight = (element: Element) => {
  if (element instanceof HTMLElement && element.scrollHeight > 0) {
    bodyHeight.value = Math.ceil(element.scrollHeight);
  }
};

const observeRouteContent = (element: Element) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry) {
      updateBodyHeight(entry.target);
    }
  });
  resizeObserver.observe(element);
};

// 新表单进入后，将容器从旧高度平滑调整到新表单的真实高度。
const handleEnter = (element: Element) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  const nextHeight = Math.ceil(element.scrollHeight);
  if (heightFrame !== null) {
    cancelAnimationFrame(heightFrame);
  }

  heightFrame = requestAnimationFrame(() => {
    bodyHeight.value = nextHeight;
    heightFrame = null;
  });
};

const handleAfterEnter = (element: Element) => {
  updateBodyHeight(element);
  observeRouteContent(element);
};

onMounted(async () => {
  await nextTick();
  const currentRoute = bodyElement.value?.querySelector(".auth-card__route");

  if (currentRoute) {
    updateBodyHeight(currentRoute);
    observeRouteContent(currentRoute);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();

  if (heightFrame !== null) {
    cancelAnimationFrame(heightFrame);
  }
});
</script>

<template>
  <section class="auth-card-shell" aria-label="登录与注册">
    <!-- 顶部 logo + 大写标题，仿 pure-admin 的 avatar + h2。 -->
    <div class="auth-card__header">
      <BrandLogo :width="300" />
      <h2 class="auth-card__title">LabFlow</h2>
    </div>

    <nav class="auth-card__tabs" aria-label="账号入口">
      <RouterLink
        class="auth-card__tab"
        :class="{ 'auth-card__tab--active': !isRegisterRoute }"
        to="/login"
      >
        登录
      </RouterLink>
      <RouterLink
        class="auth-card__tab"
        :class="{ 'auth-card__tab--active': isRegisterRoute }"
        to="/register"
      >
        注册
      </RouterLink>
      <span
        class="auth-card__indicator"
        :class="{ 'auth-card__indicator--register': isRegisterRoute }"
        aria-hidden="true"
      ></span>
    </nav>

    <div ref="bodyElement" class="auth-card__body" :style="bodyStyle">
      <RouterView v-slot="{ Component, route: currentRoute }">
        <Transition
          :name="transitionName"
          @enter="handleEnter"
          @after-enter="handleAfterEnter"
        >
          <div :key="String(currentRoute.name)" class="auth-card__route">
            <component :is="Component" />
          </div>
        </Transition>
      </RouterView>
    </div>
  </section>
</template>

<style scoped>
/* 仿 pure-admin：表单无卡片边框/阴影，直接置于背景上，固定 360px 宽。 */
.auth-card-shell {
  width: 360px;
  max-width: 100%;
  text-align: center;
}

.auth-card__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
}

.auth-card__title {
  margin: 15px 0;
  color: #999;
  font:
    bold 200% Consolas,
    Monaco,
    monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.auth-card__tabs {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  margin-bottom: 20px;
  border-bottom: 1px solid #e7edf5;
}

.auth-card__tab {
  padding: 10px 0 14px;
  color: #7b8798;
  font-size: 15px;
  font-weight: 650;
  text-align: center;
  text-decoration: none;
  transition: color 300ms ease;
}

.auth-card__tab--active {
  color: var(--el-color-primary);
}

.auth-card__indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 50%;
  height: 2px;
  transform: translateX(0);
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-card__indicator::after {
  position: absolute;
  right: 20%;
  left: 20%;
  height: 2px;
  border-radius: 2px;
  background: var(--el-color-primary);
  content: "";
}

.auth-card__indicator--register {
  transform: translateX(100%);
}

.auth-card__body {
  position: relative;
  width: 100%;
  overflow: hidden;
  transition: height 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-card__route {
  width: 100%;
}

.auth-route-forward-enter-active,
.auth-route-forward-leave-active,
.auth-route-backward-enter-active,
.auth-route-backward-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transition:
    opacity 300ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}

.auth-route-forward-enter-active,
.auth-route-backward-enter-active {
  z-index: 2;
}

.auth-route-forward-leave-active,
.auth-route-backward-leave-active {
  z-index: 1;
  pointer-events: none;
}

.auth-route-forward-enter-from,
.auth-route-backward-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.auth-route-forward-leave-to,
.auth-route-backward-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

@media screen and (max-width: 1180px) {
  .auth-card-shell {
    width: 290px;
  }

  .auth-card__title {
    font-size: 2.4rem;
    margin: 8px 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-card__tab,
  .auth-card__indicator,
  .auth-card__body,
  .auth-route-forward-enter-active,
  .auth-route-forward-leave-active,
  .auth-route-backward-enter-active,
  .auth-route-backward-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
