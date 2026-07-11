<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute } from "vue-router";

import authIllustration from "@/assets/auth-illustration.png";
import BrandLogo from "@/components/auth/BrandLogo.vue";
import { useAuthStore } from "@/stores/auth";

// 登录成功后，通过 authStore 保存后端返回的 Token。
const authStore = useAuthStore();
const route = useRoute();

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
  statusMessage.value = ""; 

  if (!validate()) { //输入框没有内容直接返回，不进行登录请求
    return;
  }

  try {
    // 调用 authStore 的 login 方法进行登录请求
    await authStore.login({
      username: form.username.trim(),
      password: form.password
    });
  } catch (error: unknown) {
    statusMessage.value = error instanceof Error ? error.message : "登录失败，请稍后重试";
  }
};
</script>

<template>
  <main class="login-page">
    <section class="login-intro" aria-labelledby="login-product-title">
      <BrandLogo :width="100" />

      <div class="login-intro__copy">
        <h1 id="login-product-title">LabFlow 项目协作管理平台</h1>
        <p>面向实验室 / 工作室 / 学生团队的项目协作管理平台</p>
      </div>

      <img class="login-intro__image" :src="authIllustration" alt="青蓝色数据面板科技插图" />
      <small class="auth-copyright">© 2024 LabFlow. All rights reserved.</small>
    </section>

    <section class="login-panel" aria-label="登录区域">
      <el-form class="auth-card auth-card--login" :model="form" @submit.prevent="handleSubmit">
        <header class="auth-card__header">
          <h2>欢迎登录</h2>
          <p>登录以继续访问您的项目</p>
        </header>

        <el-alert
          v-if="registeredSuccessfully"
          class="auth-success-alert"
          title="注册成功，请使用新账号登录"
          type="success"
          show-icon
          :closable="false"
        />

        <div class="auth-card__fields">
          <el-form-item
            class="auth-field"
            label="用户名"
            :error="errors.username"
          >
            <el-input
              id="login-username"
              v-model="form.username"
              placeholder="输入您的用户名"
              autocomplete="username"
            />
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
              placeholder="输入您的密码"
              autocomplete="current-password"
              show-password
            />
          </el-form-item>
        </div>

        <el-button class="auth-submit" native-type="submit">登录</el-button>
        <p v-if="statusMessage" class="auth-status" role="status" aria-live="polite">
          {{ statusMessage }}
        </p>
        <p class="auth-switch">没有账号？<RouterLink to="/register">去注册</RouterLink></p>
      </el-form>
    </section>
  </main>
</template>
