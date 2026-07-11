<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

import BrandLogo from "@/components/auth/BrandLogo.vue";
import { register } from "@/api/auth";

const router = useRouter();

// 保存用户在注册表单中输入的内容。
const form = reactive({
  username: "",
  nickname: "",
  email: "",
  phone: "",
  direction: "",
  password: "",
  confirmPassword: ""
});

// 保存每个输入框对应的错误提示。
const errors = reactive({
  username: "",
  nickname: "",
  email: "",
  password: "",
  confirmPassword: ""
});

// 保存注册失败后显示在当前页面上的提示文字。
const statusMessage = ref("");

// 用来判断用户填写的邮箱格式是否基本正确。
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 验证注册表单中的输入内容。
const validate = () => {
  errors.username = "";
  errors.nickname = "";
  errors.email = "";
  errors.password = "";
  errors.confirmPassword = "";

  if (!form.username.trim()) {
    errors.username = "请输入用户名";
  }

  if (!form.nickname.trim()) {
    errors.nickname = "请输入昵称";
  }

  if (form.email.trim() && !emailPattern.test(form.email.trim())) {
    errors.email = "请输入正确的电子邮箱";
  }

  if (!form.password.trim()) {
    errors.password = "请输入密码";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "请再次输入密码";
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "两次输入的密码不一致";
  }

  return (
    !errors.username &&
    !errors.nickname &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword
  );
};

// 验证通过后，将注册数据发送给后端。
const handleSubmit = async () => {
  statusMessage.value = "";

  if (!validate()) {
    return;
  }

  try {
    const username = form.username.trim();

    await register({
      username,
      password: form.password,
      nickname: form.nickname.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      direction: form.direction.trim() || undefined
    });

    // 注册成功后进入登录页，并让登录页显示注册成功提示。
    await router.push({
      name: "login",
      query: {
        registered: "1",
        username
      }
    });
  } catch (error: unknown) {
    statusMessage.value = error instanceof Error ? error.message : "注册失败，请稍后重试";
  }
};
</script>

<template>
  <main class="register-page">
    <el-form class="auth-card auth-card--register" :model="form" @submit.prevent="handleSubmit">
      <header class="register-brand">
        <BrandLogo :width="112" />
        <p>项目协作管理平台</p>
      </header>

      <div class="auth-card__header auth-card__header--centered">
        <h1>创建账号</h1>
        <p>加入我们，开启高效的团队协作</p>
      </div>

      <div class="auth-card__fields auth-card__fields--register">
        <el-form-item
          class="auth-field"
          label="用户名"
          :error="errors.username"
        >
          <el-input
            id="register-username"
            v-model="form.username"
            placeholder="输入您的用户名"
            autocomplete="username"
            :maxlength="50"
          />
        </el-form-item>

        <el-form-item
          class="auth-field"
          label="昵称"
          :error="errors.nickname"
        >
          <el-input
            id="register-nickname"
            v-model="form.nickname"
            placeholder="输入您的昵称"
            autocomplete="nickname"
            :maxlength="50"
          />
        </el-form-item>

        <el-form-item
          class="auth-field"
          label="电子邮箱"
          :error="errors.email"
        >
          <el-input
            id="register-email"
            v-model="form.email"
            type="email"
            placeholder="输入您的电子邮箱（选填）"
            autocomplete="email"
            :maxlength="100"
          />
        </el-form-item>

        <el-form-item class="auth-field" label="手机号">
          <el-input
            id="register-phone"
            v-model="form.phone"
            type="tel"
            placeholder="输入您的手机号（选填）"
            autocomplete="tel"
            :maxlength="20"
          />
        </el-form-item>

        <el-form-item class="auth-field" label="所属方向">
          <el-input
            id="register-direction"
            v-model="form.direction"
            placeholder="例如：前端、后端、测试（选填）"
            :maxlength="50"
          />
        </el-form-item>

        <el-form-item
          class="auth-field"
          label="密码"
          :error="errors.password"
        >
          <el-input
            id="register-password"
            v-model="form.password"
            type="password"
            placeholder="输入您的密码"
            autocomplete="new-password"
            show-password
          />
        </el-form-item>

        <el-form-item
          class="auth-field"
          label="确认密码"
          :error="errors.confirmPassword"
        >
          <el-input
            id="register-confirm-password"
            v-model="form.confirmPassword"
            type="password"
            placeholder="再次输入您的密码"
            autocomplete="new-password"
            show-password
          />
        </el-form-item>
      </div>

      <el-button class="auth-submit" native-type="submit">注册</el-button>
      <p v-if="statusMessage" class="auth-status" role="status" aria-live="polite">
        {{ statusMessage }}
      </p>
      <div class="auth-divider" aria-hidden="true"></div>
      <p class="auth-switch">已有账号？<RouterLink to="/login">去登录</RouterLink></p>
      <small class="auth-copyright auth-copyright--register">© 2024 LabFlow. All rights reserved.</small>
    </el-form>
  </main>
</template>
