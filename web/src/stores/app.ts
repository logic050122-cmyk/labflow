import { defineStore } from "pinia";
import { ref } from "vue";

// 这个 store 只保存全局界面状态，不保存项目、任务等业务数据。
export const useAppStore = defineStore("app", () => {
  // ref 让布尔值具备响应式：值改变后，使用它的界面会自动更新。
  const sidebarOpen = ref(false);

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value;
  };

  const closeSidebar = () => {
    sidebarOpen.value = false;
  };

  // 只有返回的状态和方法才能被组件使用。
  return { sidebarOpen, toggleSidebar, closeSidebar };
});
