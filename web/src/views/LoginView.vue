<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/stores/auth";

// 登录成功后，通过 authStore 保存后端返回的 Token。
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

// 注册页会通过路由参数告诉登录页：注册已成功，并带回刚注册的用户名。
const registeredSuccessfully = route.query.registered === "1";
const registeredUsername =
  typeof route.query.username === "string" ? route.query.username : "";

// 保存用户在登录表单中输入的内容。
const form = reactive({
  username: registeredUsername,
  password: ""
});

// 保存每个输入框对应的错误提示。
const errors = reactive({
  username: "",
  password: ""
});

// 保存登录失败后显示在页面上的错误提示。
const statusMessage = ref("");
const isSubmitting = ref(false);

// 验证表单输入，输入了内容就为true，否则为false。
const validate = () => {
  errors.username = "";
  errors.password = "";

  if (!form.username.trim()) {
    errors.username = "请输入用户名";
  }

  if (!form.password) {
    errors.password = "请输入密码";
  }

 return errors.username === "" && errors.password === "";// 如果没有错误提示，说明输入了内容，返回true，否则返回false
};

// 处理登录表单提交
const handleSubmit = async () => {
  if (isSubmitting.value) {
    return;
  }

  statusMessage.value = "";

  if (!validate()) { //输入框没有内容直接返回，不进行登录请求
    return;
  }

  isSubmitting.value = true;

  try {
    // 调用 authStore 的 login 方法进行登录请求
    await authStore.login({
      username: form.username.trim(),
      password: form.password
    });

    // 如果是被路由守卫拦截后跳来的，登录成功后回到原页面。
    const redirect =
      typeof route.query.redirect === "string" &&
      route.query.redirect.startsWith("/")
        ? route.query.redirect
        : "/dashboard";

    await router.replace(redirect);
  } catch (error: unknown) {
    statusMessage.value = error instanceof Error ? error.message : "登录失败，请稍后重试";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <!-- 页面只保留登录表单，卡片外壳、导航和切换动画由 AuthCard 统一负责。 -->
  <el-form class="auth-form auth-form--login" :model="form" @submit.prevent="handleSubmit">
    <el-alert
      v-if="registeredSuccessfully"
      class="auth-success-alert"
      title="注册成功，请使用新账号登录"
      type="success"
      show-icon
      :closable="false"
    />

    <div class="auth-form__grid auth-form__grid--login">
      <el-form-item
        class="auth-field"
        label="用户名"
        :error="errors.username"
      >
        <el-input
          id="login-username"
          v-model="form.username"
          placeholder="请输入用户名"
          autocomplete="username"
          size="large"
        >
          <template #prefix>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" />
            </svg>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item
        class="auth-field"
        label="密码"
        :error="errors.password"
      >
        <el-input
          id="login-password"
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
          autocomplete="current-password"
          show-password
          size="large"
        >
          <template #prefix>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2.5" />
            </svg>
          </template>
        </el-input>
      </el-form-item>
    </div>

    <el-button
      class="auth-submit"
      native-type="submit"
      :loading="isSubmitting"
      :disabled="isSubmitting"
    >
      登录
    </el-button>
    <p v-if="statusMessage" class="auth-status" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>

    <div class="auth-divider" aria-hidden="true">
      <span>或</span>
    </div>
    <p class="auth-switch">
      还没有账号？
      <RouterLink to="/register">立即注册</RouterLink>
    </p>
  </el-form>
</template>
