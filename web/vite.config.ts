import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// Vite 负责开发服务器和生产构建，Vue 插件让它能够编译 .vue 文件。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 把 @ 映射到 src，避免出现 ../../ 这种难维护的相对路径。
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    port: 5173,
    // 开发环境把 /api 请求转发给 Express，页面无需处理跨域或写死后端地址。
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  }
});
