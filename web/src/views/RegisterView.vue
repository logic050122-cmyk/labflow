<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

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
const isSubmitting = ref(false);

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
  if (isSubmitting.value) {
    return;
  }

  statusMessage.value = "";

  if (!validate()) {
    return;
  }

  isSubmitting.value = true;

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
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <!-- 页面只保留注册字段和校验，公共卡片负责导航及动画。 -->
  <el-form class="auth-form auth-form--register" :model="form" @submit.prevent="handleSubmit">
    <header class="auth-form__header">
      <h1>创建账号</h1>
      <p>填写基础信息，加入 LabFlow 开启团队协作</p>
    </header>

    <section class="auth-form__section" aria-labelledby="register-basic-title">
      <h2 id="register-basic-title" class="auth-form__section-title">基本信息</h2>
      <div class="auth-form__grid auth-form__grid--register">
        <el-form-item
          class="auth-field auth-field--username"
          label="用户名"
          :error="errors.username"
        >
          <el-input
            id="register-username"
            v-model="form.username"
            placeholder="请输入用户名"
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
            placeholder="请输入昵称"
            autocomplete="nickname"
            :maxlength="50"
          />
        </el-form-item>

        <el-form-item
          class="auth-field"
          label="电子邮箱（选填）"
          :error="errors.email"
        >
          <el-input
            id="register-email"
            v-model="form.email"
            type="email"
            placeholder="请输入电子邮箱"
            autocomplete="email"
            :maxlength="100"
          />
        </el-form-item>

        <el-form-item class="auth-field" label="手机号（选填）">
          <el-input
            id="register-phone"
            v-model="form.phone"
            type="tel"
            placeholder="请输入手机号"
            autocomplete="tel"
            :maxlength="20"
          />
        </el-form-item>

        <el-form-item
          class="auth-field auth-field--wide"
          label="所属方向（选填）"
        >
          <el-input
            id="register-direction"
            v-model="form.direction"
            placeholder="例如：前端、后端、测试"
            :maxlength="50"
          />
        </el-form-item>
      </div>
    </section>

    <section class="auth-form__section" aria-labelledby="register-security-title">
      <h2 id="register-security-title" class="auth-form__section-title">账号安全</h2>
      <div class="auth-form__grid auth-form__grid--register">
        <el-form-item
          class="auth-field auth-field--password"
          label="密码"
          :error="errors.password"
        >
          <el-input
            id="register-password"
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="new-password"
            show-password
          />
        </el-form-item>

        <el-form-item
          class="auth-field auth-field--password"
          label="确认密码"
          :error="errors.confirmPassword"
        >
          <el-input
            id="register-confirm-password"
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            autocomplete="new-password"
            show-password
          />
        </el-form-item>
      </div>
    </section>

    <el-button
      class="auth-submit"
      native-type="submit"
      :loading="isSubmitting"
      :disabled="isSubmitting"
    >
      注册
    </el-button>
    <p v-if="statusMessage" class="auth-status" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>
    <div class="auth-divider" aria-hidden="true">
      <span>或</span>
    </div>
    <p class="auth-switch">已有账号？<RouterLink to="/login">立即登录</RouterLink></p>
  </el-form>
</template>
