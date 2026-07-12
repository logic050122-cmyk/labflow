import { Router } from "express";

import { login, register } from "./auth.controller";

// authRoutes 只负责把 HTTP 方法和路径交给对应 controller。
export const authRoutes = Router();

// app.ts 挂载 /api/auth 后，这里的完整地址是 POST /api/auth/register。
authRoutes.post("/register", register);

// 完整地址是 POST /api/auth/login。
authRoutes.post("/login", login);
