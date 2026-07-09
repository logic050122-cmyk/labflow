import { defineStore } from "pinia";

import {
  login as requestLogin,
   LoginPayload
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
    token: localStorage.getItem(TOKEN_STORAGE_KEY) || ""
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
    }
  }
});