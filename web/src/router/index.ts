import { createRouter, createWebHistory } from "vue-router";

import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: "/dashboard" },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { title: "登录" }
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/RegisterView.vue"),
      meta: { title: "注册" }
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("@/views/DashboardView.vue"),
      meta: { title: "工作台", requiresAuth: true }
    },
    {
      path: "/projects/:projectId",
      name: "project-detail",
      component: () => import("@/views/ProjectDetailView.vue"),
      meta: { title: "项目详情", requiresAuth: true }
    },
    // 未知地址统一回到工作台，未登录时会再由守卫跳转到登录页。
    { path: "/:pathMatch(.*)*", redirect: "/dashboard" }
  ]
});

//路由守卫
// 进入页面前检查登录状态，刷新受保护页面时会通过 /api/auth/me 恢复用户。
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const isAuthPage = to.name === "login" || to.name === "register";

  //to.meta.requiresAuth表示如果返回turee，则表示该路由需要登录才能访问
  if (to.meta.requiresAuth) {
    // 如果没有 token，直接跳转到登录页，并把当前地址作为 redirect 查询参数传过去。
    if (!authStore.token) {
      // to.fullPath用户准备进入页面的完整地址。
      return { name: "login", query: { redirect: to.fullPath } };
    }
    // 如果有 token，但没有用户信息，尝试恢复登录态。
    if (!authStore.user) {
      const restored = await authStore.restoreSession();
      // 如果恢复失败，说明 token 无效，跳转到登录页。
      if (!restored) {
        return { name: "login", query: { redirect: to.fullPath } };
      }
    }
  }

  // 已登录用户不需要再次进入登录或注册页。
  // 当前用户已经登录了，访问登录页/注册页时，
  // 就不应该再停留在那两个页面，而应该直接跳到工作台。
  if (isAuthPage && authStore.token) {
    if (authStore.user || (await authStore.restoreSession())) {
      return { name: "dashboard" };
    }
  }

  return true; // “检查通过，继续走路由”，必须返回 true，否则路由不会继续。
});

// 统一维护标签标题，避免各页面直接操作 document。
router.afterEach((to) => {
  document.title = `${String(to.meta.title || "LabFlow")} | LabFlow`;
});

export default router;
