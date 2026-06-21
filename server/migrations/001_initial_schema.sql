-- LabFlow 第一版数据库初始化脚本
-- 目标环境：MySQL 8.0+
-- 作用：创建数据库、用户表、项目表、成员表、任务表、评论表、文件表、通知表、操作日志表

-- 设置当前连接的字符集，防止中文乱码
SET NAMES utf8mb4;

-- 创建数据库 labflow
-- utf8mb4：支持中文、Emoji 等完整 Unicode 字符
-- utf8mb4_0900_ai_ci：MySQL 8.0 推荐排序规则
CREATE DATABASE IF NOT EXISTS `labflow`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- 使用 labflow 数据库
USE `labflow`;

-- =========================================================
-- 用户表
-- 作用：保存系统用户的基础信息
-- 用户可以创建项目，也可以加入项目
-- =========================================================
CREATE TABLE IF NOT EXISTS `users` (
  -- 用户ID，主键，自增
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- 登录用户名，唯一
  `username` VARCHAR(50) NOT NULL,

  -- 密码哈希值，不保存明文密码
  `password_hash` VARCHAR(255) NOT NULL,

  -- 用户昵称，用于页面展示
  `nickname` VARCHAR(50) NOT NULL,

  -- 用户头像地址
  `avatar_url` VARCHAR(500) NULL,

  -- 邮箱，可选
  `email` VARCHAR(100) NULL,

  -- 手机号，可选
  `phone` VARCHAR(20) NULL,

  -- 研究方向 / 技术方向，例如：前端、后端、算法、测试
  `direction` VARCHAR(50) NULL,

  -- 创建时间
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 更新时间，数据更新时自动刷新
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 主键
  PRIMARY KEY (`id`),

  -- 用户名唯一，不能重复注册
  UNIQUE KEY `uk_users_username` (`username`),

  -- 邮箱普通索引，方便后续按邮箱查询
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 项目表
-- 作用：保存项目信息
-- 一个项目有一个负责人 owner_user_id
-- =========================================================
CREATE TABLE IF NOT EXISTS `projects` (
  -- 项目ID，主键，自增
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- 项目名称
  `name` VARCHAR(100) NOT NULL,

  -- 项目描述
  `description` TEXT NULL,

  -- 项目负责人用户ID
  `owner_user_id` BIGINT UNSIGNED NOT NULL,

  -- 项目状态：active 进行中，finished 已完成，archived 已归档
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',

  -- 项目开始日期
  `start_date` DATE NULL,

  -- 项目结束日期
  `end_date` DATE NULL,

  -- 项目邀请码，成员可以通过邀请码加入项目
  `invite_code` VARCHAR(32) NOT NULL,

  -- 项目归档时间
  `archived_at` DATETIME NULL,

  -- 创建时间
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 更新时间
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 主键
  PRIMARY KEY (`id`),

  -- 邀请码唯一
  UNIQUE KEY `uk_projects_invite_code` (`invite_code`),

  -- 项目负责人索引，方便查询某个用户创建的项目
  KEY `idx_projects_owner_user_id` (`owner_user_id`),

  -- 限制项目状态只能是指定值
  CONSTRAINT `chk_projects_status`
    CHECK (`status` IN ('active', 'finished', 'archived')),

  -- 外键：项目负责人必须存在于 users 表
  -- ON DELETE RESTRICT：如果用户是项目负责人，不允许直接删除该用户
  CONSTRAINT `fk_projects_owner_user`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 项目成员表
-- 作用：记录用户加入了哪些项目，以及在项目中的角色
-- 一个用户可以加入多个项目
-- 一个项目也可以有多个成员
-- =========================================================
CREATE TABLE IF NOT EXISTS `project_members` (
  -- 成员记录ID，主键，自增
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- 项目ID
  `project_id` BIGINT UNSIGNED NOT NULL,

  -- 用户ID
  `user_id` BIGINT UNSIGNED NOT NULL,

  -- 项目角色：owner 项目负责人，member 普通成员
  `role` VARCHAR(20) NOT NULL,

  -- 加入项目时间
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 创建时间
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 更新时间
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 主键
  PRIMARY KEY (`id`),

  -- 限制同一个用户不能重复加入同一个项目
  UNIQUE KEY `uk_project_members_project_user` (`project_id`, `user_id`),

  -- 用户ID索引，方便查询某个用户加入了哪些项目
  KEY `idx_project_members_user_id` (`user_id`),

  -- 限制角色只能是 owner 或 member
  CONSTRAINT `chk_project_members_role`
    CHECK (`role` IN ('owner', 'member')),

  -- 外键：项目必须存在
  CONSTRAINT `fk_project_members_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 外键：用户必须存在
  CONSTRAINT `fk_project_members_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 任务表
-- 作用：保存项目下的任务信息
-- 任务由负责人创建，分配给成员处理
-- 成员提交后，由负责人审核
-- =========================================================
CREATE TABLE IF NOT EXISTS `tasks` (
  -- 任务ID，主键，自增
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- 所属项目ID
  `project_id` BIGINT UNSIGNED NOT NULL,

  -- 任务标题
  `title` VARCHAR(150) NOT NULL,

  -- 任务描述
  `description` TEXT NULL,

  -- 任务负责人 / 被分配人
  `assignee_user_id` BIGINT UNSIGNED NOT NULL,

  -- 任务创建人
  `creator_user_id` BIGINT UNSIGNED NOT NULL,

  -- 优先级：low 低，medium 中，high 高，urgent 紧急
  `priority` VARCHAR(20) NOT NULL,

  -- 任务状态：
  -- todo 待开始
  -- doing 进行中
  -- submitted 待审核
  -- done 已完成
  -- overdue 已逾期
  `status` VARCHAR(20) NOT NULL DEFAULT 'todo',

  -- 任务标签，例如：前端、后端、文档、测试
  `tag` VARCHAR(30) NULL,

  -- 截止时间
  `due_at` DATETIME NULL,

  -- 成员提交任务时填写的完成说明
  `submit_content` TEXT NULL,

  -- 审核不通过时的驳回原因
  `rejection_reason` VARCHAR(500) NULL,

  -- 提交时间
  `submitted_at` DATETIME NULL,

  -- 审核人用户ID
  `reviewer_user_id` BIGINT UNSIGNED NULL,

  -- 审核时间
  `reviewed_at` DATETIME NULL,

  -- 完成时间
  `completed_at` DATETIME NULL,

  -- 创建时间
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 更新时间
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 主键
  PRIMARY KEY (`id`),

  -- 查询某个项目下某种状态的任务
  KEY `idx_tasks_project_status` (`project_id`, `status`),

  -- 查询某个成员被分配的某种状态任务
  KEY `idx_tasks_assignee_status` (`assignee_user_id`, `status`),

  -- 查询某个用户创建的任务
  KEY `idx_tasks_creator_user_id` (`creator_user_id`),

  -- 查询某个用户审核过的任务
  KEY `idx_tasks_reviewer_user_id` (`reviewer_user_id`),

  -- 查询即将截止或已经逾期的任务
  KEY `idx_tasks_due_at` (`due_at`),

  -- 限制任务优先级只能是指定值
  CONSTRAINT `chk_tasks_priority`
    CHECK (`priority` IN ('low', 'medium', 'high', 'urgent')),

  -- 限制任务状态只能是指定值
  CONSTRAINT `chk_tasks_status`
    CHECK (`status` IN ('todo', 'doing', 'submitted', 'done', 'overdue')),

  -- 外键：任务必须属于某个项目
  CONSTRAINT `fk_tasks_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 外键：被分配人必须存在
  CONSTRAINT `fk_tasks_assignee_user`
    FOREIGN KEY (`assignee_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 外键：创建人必须存在
  CONSTRAINT `fk_tasks_creator_user`
    FOREIGN KEY (`creator_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 外键：审核人可以为空
  -- 如果审核人用户被删除，则 reviewer_user_id 设置为 NULL
  CONSTRAINT `fk_tasks_reviewer_user`
    FOREIGN KEY (`reviewer_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 任务评论表
-- 作用：保存任务下的评论，用于成员和负责人沟通
-- =========================================================
CREATE TABLE IF NOT EXISTS `task_comments` (
  -- 评论ID，主键，自增
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- 所属任务ID
  `task_id` BIGINT UNSIGNED NOT NULL,

  -- 评论用户ID
  `user_id` BIGINT UNSIGNED NOT NULL,

  -- 评论内容
  `content` TEXT NOT NULL,

  -- 创建时间
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 更新时间
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 主键
  PRIMARY KEY (`id`),

  -- 根据任务查询评论
  KEY `idx_task_comments_task_id` (`task_id`),

  -- 根据用户查询评论
  KEY `idx_task_comments_user_id` (`user_id`),

  -- 外键：评论必须属于某个任务
  CONSTRAINT `fk_task_comments_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 外键：评论用户必须存在
  CONSTRAINT `fk_task_comments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 文件表
-- 作用：保存项目文件和任务附件信息
-- 文件本体一般存储在服务器磁盘或对象存储中
-- 数据库只保存文件路径和元信息
-- =========================================================
CREATE TABLE IF NOT EXISTS `files` (
  -- 文件ID，主键，自增
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- 所属项目ID
  `project_id` BIGINT UNSIGNED NOT NULL,

  -- 所属任务ID
  -- 如果是项目文件，则为空
  -- 如果是任务附件，则不为空
  `task_id` BIGINT UNSIGNED NULL,

  -- 上传人用户ID
  `uploader_user_id` BIGINT UNSIGNED NOT NULL,

  -- 用户上传时的原始文件名
  `original_name` VARCHAR(255) NOT NULL,

  -- 服务端保存后的文件名
  -- 通常会使用 UUID 或时间戳重命名，避免文件名冲突
  `stored_name` VARCHAR(255) NOT NULL,

  -- 文件存储路径
  `storage_path` VARCHAR(500) NOT NULL,

  -- 文件大小，单位：字节
  `size_bytes` BIGINT UNSIGNED NOT NULL,

  -- 文件 MIME 类型，例如 image/png、application/pdf
  `mime_type` VARCHAR(100) NOT NULL,

  -- 文件类别：
  -- project 项目文件
  -- task 任务附件
  `category` VARCHAR(20) NOT NULL,

  -- 创建时间
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 更新时间
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 主键
  PRIMARY KEY (`id`),

  -- 查询某个项目的文件
  KEY `idx_files_project_id` (`project_id`),

  -- 查询某个任务的附件
  KEY `idx_files_task_id` (`task_id`),

  -- 查询某个用户上传的文件
  KEY `idx_files_uploader_user_id` (`uploader_user_id`),

  -- 限制文件类别和 task_id 的关系：
  -- project 文件不能绑定任务
  -- task 文件必须绑定任务
  CONSTRAINT `chk_files_category`
    CHECK (
      (`category` = 'project' AND `task_id` IS NULL)
      OR (`category` = 'task' AND `task_id` IS NOT NULL)
    ),

  -- 外键：文件必须属于某个项目
  CONSTRAINT `fk_files_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 外键：任务附件必须绑定存在的任务
  CONSTRAINT `fk_files_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- 外键：上传人必须存在
  CONSTRAINT `fk_files_uploader_user`
    FOREIGN KEY (`uploader_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 通知表
-- 作用：保存站内通知
-- 例如：任务分配、任务审核、任务逾期、项目消息等
-- =========================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  -- 通知ID，主键，自增
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- 接收通知的用户ID
  `receiver_user_id` BIGINT UNSIGNED NOT NULL,

  -- 关联项目ID，可以为空
  `project_id` BIGINT UNSIGNED NULL,

  -- 关联任务ID，可以为空
  `task_id` BIGINT UNSIGNED NULL,

  -- 通知类型：
  -- project 项目通知
  -- task 任务通知
  -- review 审核通知
  -- overdue 逾期通知
  -- system 系统通知
  `type` VARCHAR(30) NOT NULL,

  -- 通知标题
  `title` VARCHAR(150) NOT NULL,

  -- 通知内容
  `content` VARCHAR(500) NOT NULL,

  -- 是否已读：0 未读，1 已读
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,

  -- 阅读时间
  `read_at` DATETIME NULL,

  -- 创建时间
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 更新时间
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 主键
  PRIMARY KEY (`id`),

  -- 查询某个用户的未读通知，并按时间排序
  KEY `idx_notifications_receiver_read_created`
    (`receiver_user_id`, `is_read`, `created_at`),

  -- 查询某个项目相关通知
  KEY `idx_notifications_project_id` (`project_id`),

  -- 查询某个任务相关通知
  KEY `idx_notifications_task_id` (`task_id`),

  -- 限制通知类型只能是指定值
  CONSTRAINT `chk_notifications_type`
    CHECK (`type` IN ('project', 'task', 'review', 'overdue', 'system')),

  -- 限制 is_read 只能是 0 或 1
  CONSTRAINT `chk_notifications_is_read`
    CHECK (`is_read` IN (0, 1)),

  -- 外键：通知接收人必须存在
  CONSTRAINT `fk_notifications_receiver_user`
    FOREIGN KEY (`receiver_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 外键：关联项目可以为空
  -- 如果项目被删除，通知中的 project_id 设置为 NULL
  CONSTRAINT `fk_notifications_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,

  -- 外键：关联任务可以为空
  -- 如果任务被删除，通知中的 task_id 设置为 NULL
  CONSTRAINT `fk_notifications_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 操作日志表
-- 作用：记录用户在系统中的关键操作
-- 例如：创建项目、加入项目、创建任务、提交任务、审核任务、上传文件等
-- 方便后续做操作追踪和项目动态
-- =========================================================
CREATE TABLE IF NOT EXISTS `operation_logs` (
  -- 日志ID，主键，自增
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- 操作人用户ID
  -- 可以为空，例如系统自动任务产生的日志
  `operator_user_id` BIGINT UNSIGNED NULL,

  -- 关联项目ID
  `project_id` BIGINT UNSIGNED NULL,

  -- 关联任务ID
  `task_id` BIGINT UNSIGNED NULL,

  -- 操作模块，例如：project、task、file、member、notification
  `module` VARCHAR(30) NOT NULL,

  -- 操作动作，例如：create、update、delete、submit、review、upload
  `action` VARCHAR(50) NOT NULL,

  -- 操作对象类型，例如：project、task、comment、file、member
  `target_type` VARCHAR(30) NOT NULL,

  -- 操作对象ID
  `target_id` BIGINT UNSIGNED NULL,

  -- 操作对象名称，例如项目名、任务标题
  `target_name` VARCHAR(150) NULL,

  -- 操作描述，例如：张三创建了任务“完成登录页面”
  `description` VARCHAR(500) NOT NULL,

  -- 操作IP地址，IPv4 或 IPv6
  `ip_address` VARCHAR(45) NULL,

  -- 创建时间
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 更新时间
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 主键
  PRIMARY KEY (`id`),

  -- 查询某个项目的操作日志，并按时间排序
  KEY `idx_operation_logs_project_created` (`project_id`, `created_at`),

  -- 查询某个任务的操作日志，并按时间排序
  KEY `idx_operation_logs_task_created` (`task_id`, `created_at`),

  -- 查询某个用户的操作记录
  KEY `idx_operation_logs_operator_user_id` (`operator_user_id`),

  -- 外键：操作人可以为空
  -- 如果操作人被删除，operator_user_id 设置为 NULL
  CONSTRAINT `fk_operation_logs_operator_user`
    FOREIGN KEY (`operator_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,

  -- 外键：关联项目可以为空
  -- 如果项目被删除，project_id 设置为 NULL
  CONSTRAINT `fk_operation_logs_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,

  -- 外键：关联任务可以为空
  -- 如果任务被删除，task_id 设置为 NULL
  CONSTRAINT `fk_operation_logs_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;