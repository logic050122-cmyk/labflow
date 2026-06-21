import { createRouter, createWebHistory } from "vue-router";

import AppLayout from "@/layouts/AppLayout.vue";

// 路由表负责把 URL 映射到页面组件，不在这里编写页面业务逻辑。
const router = createRouter({
  // history 模式生成 /projects 这样的正常路径，而不是 /#/projects。
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 登录和注册不使用后台 Layout，所以放在父路由外层。
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
      path: "/",
      component: AppLayout,
      // children 中的页面会渲染到 AppLayout 内部的 RouterView。
      children: [
        { path: "", redirect: "/dashboard" },
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/views/DashboardView.vue"),
          meta: { title: "工作台" }
        },
        {
          path: "projects",
          name: "projects",
          component: () => import("@/views/ProjectsView.vue"),
          meta: { title: "项目列表" }
        },
        {
          path: "projects/:projectId",
          name: "project-detail",
          component: () => import("@/views/ProjectDetailView.vue"),
          meta: { title: "项目详情" }
        },
        {
          path: "my-tasks",
          name: "my-tasks",
          component: () => import("@/views/MyTasksView.vue"),
          meta: { title: "我的任务" }
        },
        {
          path: "notifications",
          name: "notifications",
          component: () => import("@/views/NotificationsView.vue"),
          meta: { title: "通知中心" }
        },
        {
          path: "profile",
          name: "profile",
          component: () => import("@/views/ProfileView.vue"),
          meta: { title: "个人中心" }
        }
      ]
    }
  ]
});

// 每次路由切换后，根据 meta.title 更新浏览器标签标题。
router.afterEach((to) => {
  document.title = `${String(to.meta.title || "LabFlow")} | LabFlow`;
});

export default router;
