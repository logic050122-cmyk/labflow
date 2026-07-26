import { defineStore } from "pinia";

import { getUnreadNotificationCount } from "@/api/notifications";

// 未读数量会同时显示在工作台和通知页，因此放进 Pinia 共享。
export const useNotificationStore = defineStore("notifications", {
  state: () => ({
    unreadCount: 0,
    loading: false
  }),

  actions: {
    async fetchUnreadCount() {
      this.loading = true;
      try {
        const result = await getUnreadNotificationCount();
        this.unreadCount = result.unreadCount;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.unreadCount = 0;
      this.loading = false;
    }
  }
});

