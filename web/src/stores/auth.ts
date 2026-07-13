import { defineStore } from "pinia";

import {
  getCurrentUser,
  login as requestLogin,
  type AuthUser,
  type LoginPayload
} from "@/api/auth";
import { TOKEN_STORAGE_KEY } from "@/api/http";
// 创建一个 Pinia 仓库，名字叫 auth
// 以后页面里可以通过 useAuthStore() 使用这个仓库
export const useAuthStore = defineStore("auth", {
  // state：保存数据的地方
  state: () => ({
    // token 表示当前用户的登录凭证
    // 先从 localStorage 里读取 token
    // 如果没有，就用空字符串
    token: localStorage.getItem(TOKEN_STORAGE_KEY) || "",
    // 当前登录用户由 /api/auth/me 返回；刷新页面后会重新获取。
    user: null as AuthUser | null
  }),

  // actions：保存方法的地方
  actions: {
    // 登录方法
    // payload 是登录参数，例如：
    // {
    //   username: "admin",
    //   password: "123456"
    // }
    async login(payload: LoginPayload) {
      // 调用登录接口，把账号密码发给后端
      // requestLogin 就是 api/auth.ts 里的 login 接口函数
      const data = await requestLogin(payload);

      // 如果后端没有返回 token，说明登录响应不正常
      if (!data.token) {
        throw new Error("登录响应缺少访问令牌");
      }

      // 把 token 保存到 Pinia 的 state 里
      // this 指当前 authStore
      this.token = data.token;

      // 把 token 保存到浏览器 localStorage
      // 这样刷新页面后 token 还在
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

      try {
        // 登录成功后立即获取当前用户，确认 token 可以正常使用。
        await this.loadCurrentUser();
      } catch (error) {
        this.logout();
        throw error;
      }
    },

    // 使用当前 token 获取用户信息。
    async loadCurrentUser() {
      const data = await getCurrentUser();
      this.user = data.user;
    },

    // 页面刷新时尝试恢复登录态，失败就清除本地无效 token。
    async restoreSession() {
      if (!this.token) {
        return false;
      }

      try {
        await this.loadCurrentUser();
        return true;
      } catch {
        this.logout();
        return false;
      }
    },

    // 第一版退出登录只清除浏览器中的登录态，不维护服务端会话。
    logout() {
      this.token = "";
      this.user = null;
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
});
