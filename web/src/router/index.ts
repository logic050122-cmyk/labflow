import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: "/login" },
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
    // 404 页面暂时先回到登录页，避免出现用户可见的空白路由。
    { path: "/:pathMatch(.*)*", redirect: "/login" }
  ]
});

// 认证页暂时是当前唯一入口，统一维护标签标题避免各页面直接操作 document。
router.afterEach((to) => {
  document.title = `${String(to.meta.title || "LabFlow")} | LabFlow`;
});

export default router;
