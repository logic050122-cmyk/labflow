import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";

import { create } from "./projects.controller";

export const projectRoutes = Router();

// 先经过 authenticate，controller 才能使用当前登录用户的 userId。
projectRoutes.post("/", authenticate, create);
