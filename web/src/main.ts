import { createPinia } from "pinia";
import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

import App from "./App.vue";
import router from "./router";
import "./styles/index.css";

// main.ts 是浏览器端入口：创建应用后，按顺序注册全局插件。
const app = createApp(App);

// Pinia 提供全局状态，Router 提供页面路由。
app.use(createPinia());
app.use(router);
app.use(ElementPlus);

// 把 Vue 应用挂载到 index.html 中 id="app" 的元素。
app.mount("#app");
