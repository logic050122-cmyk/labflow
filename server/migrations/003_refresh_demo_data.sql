-- LabFlow 演示数据刷新脚本
-- 目标环境：MySQL 8.0+
-- 作用：把分页测试遗留的符号、英文占位和乱码替换为真实感更强的中文虚拟数据。
-- 保护原则：不删除数据、不修改表结构；只更新能通过明确条件识别出的演示数据。

SET NAMES utf8mb4;
USE `labflow`;

START TRANSACTION;

-- 保留 owner/member 登录名和密码，只修复演示用户的展示资料。
UPDATE `users`
SET
  `username` = CASE `id`
    WHEN 5 THEN 'chensiyuan'
    WHEN 6 THEN 'zhaojianing'
    WHEN 13 THEN 'sunmingzhe'
    WHEN 18 THEN 'wangruoxi'
    WHEN 19 THEN 'liuzihan'
    WHEN 20 THEN 'huangjiacheng'
    WHEN 21 THEN 'xuanran'
    WHEN 22 THEN 'shenbowen'
    WHEN 23 THEN 'gaoyiyan'
    WHEN 24 THEN 'hejunjie'
    WHEN 25 THEN 'tangxinyi'
    WHEN 26 THEN 'luojingxing'
    WHEN 27 THEN 'songjianing'
    WHEN 28 THEN 'jiangwenhao'
    WHEN 29 THEN 'yezhiqiu'
    WHEN 30 THEN 'hanzimo'
    WHEN 31 THEN 'guqingyan'
    WHEN 32 THEN 'zhengkaiwen'
    WHEN 33 THEN 'fangkexin'
    WHEN 34 THEN 'pengyuhang'
    WHEN 35 THEN 'linsiqi'
    WHEN 36 THEN 'xumo'
    WHEN 37 THEN 'chengxiaotong'
    ELSE `username`
  END,
  `nickname` = CASE `id`
    WHEN 1 THEN '林致远'
    WHEN 2 THEN '周雨桐'
    WHEN 5 THEN '陈思远'
    WHEN 6 THEN '赵嘉宁'
    WHEN 13 THEN '孙明哲'
    WHEN 18 THEN '王若曦'
    WHEN 19 THEN '刘子涵'
    WHEN 20 THEN '黄嘉诚'
    WHEN 21 THEN '许安然'
    WHEN 22 THEN '沈博文'
    WHEN 23 THEN '高语嫣'
    WHEN 24 THEN '何俊杰'
    WHEN 25 THEN '唐欣怡'
    WHEN 26 THEN '罗景行'
    WHEN 27 THEN '宋佳宁'
    WHEN 28 THEN '蒋文昊'
    WHEN 29 THEN '叶知秋'
    WHEN 30 THEN '韩子墨'
    WHEN 31 THEN '顾清妍'
    WHEN 32 THEN '郑凯文'
    WHEN 33 THEN '方可欣'
    WHEN 34 THEN '彭宇航'
    WHEN 35 THEN '林思齐'
    WHEN 36 THEN '许墨'
    WHEN 37 THEN '程晓彤'
  END,
  `email` = CASE `id`
    WHEN 1 THEN 'lin.zhiyuan@labflow.test'
    WHEN 2 THEN 'zhou.yutong@labflow.test'
    WHEN 5 THEN 'chen.siyuan@labflow.test'
    WHEN 6 THEN 'zhao.jianing@labflow.test'
    WHEN 13 THEN 'sun.mingzhe@labflow.test'
    WHEN 18 THEN 'wang.ruoxi@labflow.test'
    WHEN 19 THEN 'liu.zihan@labflow.test'
    WHEN 20 THEN 'huang.jiacheng@labflow.test'
    WHEN 21 THEN 'xu.anran@labflow.test'
    WHEN 22 THEN 'shen.bowen@labflow.test'
    WHEN 23 THEN 'gao.yiyan@labflow.test'
    WHEN 24 THEN 'he.junjie@labflow.test'
    WHEN 25 THEN 'tang.xinyi@labflow.test'
    WHEN 26 THEN 'luo.jingxing@labflow.test'
    WHEN 27 THEN 'song.jianing@labflow.test'
    WHEN 28 THEN 'jiang.wenhao@labflow.test'
    WHEN 29 THEN 'ye.zhiqiu@labflow.test'
    WHEN 30 THEN 'han.zimo@labflow.test'
    WHEN 31 THEN 'gu.qingyan@labflow.test'
    WHEN 32 THEN 'zheng.kaiwen@labflow.test'
    WHEN 33 THEN 'fang.kexin@labflow.test'
    WHEN 34 THEN 'peng.yuhang@labflow.test'
    WHEN 35 THEN 'lin.siqi@labflow.test'
    WHEN 36 THEN 'xu.mo@labflow.test'
    WHEN 37 THEN 'cheng.xiaotong@labflow.test'
    ELSE `email`
  END,
  `direction` = CASE `id`
    WHEN 1 THEN '后端开发'
    WHEN 2 THEN '前端开发'
    WHEN 5 THEN '产品设计'
    WHEN 6 THEN '测试工程'
    WHEN 13 THEN '数据分析'
    WHEN 18 THEN '前端开发'
    WHEN 19 THEN '后端开发'
    WHEN 20 THEN '测试工程'
    WHEN 21 THEN '产品设计'
    WHEN 22 THEN '数据分析'
    WHEN 23 THEN '前端开发'
    WHEN 24 THEN '后端开发'
    WHEN 25 THEN '交互设计'
    WHEN 26 THEN '测试工程'
    WHEN 27 THEN '数据分析'
    WHEN 28 THEN '前端开发'
    WHEN 29 THEN '后端开发'
    WHEN 30 THEN '项目管理'
    WHEN 31 THEN '测试工程'
    WHEN 32 THEN '前端开发'
    WHEN 33 THEN '产品设计'
    WHEN 34 THEN '后端开发'
    WHEN 35 THEN '数据分析'
    WHEN 36 THEN '交互设计'
    WHEN 37 THEN '测试工程'
  END
WHERE `id` BETWEEN 1 AND 37;

-- 修复两个明显的手工测试项目，邀请码保持不变，避免已有加入流程失效。
UPDATE `projects`
SET
  `name` = CASE `id`
    WHEN 2 THEN '校园实验室预约管理平台'
    WHEN 3 THEN '校园闲置物品交易小程序'
  END,
  `description` = CASE `id`
    WHEN 2 THEN '支持设备预约、时段冲突校验、审批确认和使用记录查询，服务实验室日常开放管理。'
    WHEN 3 THEN '面向校内师生提供闲置物品发布、筛选、沟通和交易状态跟踪功能。'
  END
WHERE `id` IN (2, 3) AND `owner_user_id` = 13;

-- 把自动化验证任务改成可用于答辩演示的真实业务任务。
UPDATE `tasks`
SET
  `title` = CASE `id`
    WHEN 5 THEN '补充项目详情页接口联调'
    WHEN 6 THEN '完成任务列表筛选测试'
  END,
  `description` = CASE `id`
    WHEN 5 THEN '联调项目详情、成员列表和任务列表接口，确认加载状态与异常提示能够正常展示。'
    WHEN 6 THEN '覆盖状态、负责人、优先级和关键词筛选，整理测试结果并提交验收。'
  END,
  `tag` = CASE `id` WHEN 5 THEN '功能' WHEN 6 THEN '测试' END
WHERE `id` IN (5, 6) AND `project_id` = 1;

-- 24 个演示项目各有一个主要任务，任务标题由项目名称生成，避免编号占位。
UPDATE `tasks` AS `t`
JOIN `projects` AS `p` ON `p`.`id` = `t`.`project_id`
SET
  `t`.`title` = CONCAT('完善', `p`.`name`, '核心功能'),
  `t`.`description` = CONCAT('围绕“', `p`.`name`, '”完成核心流程开发、页面联调和验收材料整理。'),
  `t`.`tag` = CASE MOD(`t`.`id` - 7, 6)
    WHEN 0 THEN '功能' WHEN 1 THEN 'UI' WHEN 2 THEN '测试'
    WHEN 3 THEN '文档' WHEN 4 THEN '优化' ELSE '功能'
  END
WHERE `t`.`id` BETWEEN 7 AND 30
  AND `t`.`tag` = 'seed';

-- 每个演示项目补充三条有业务含义的任务，保留原有状态分布用于页面展示。
UPDATE `tasks` AS `t`
JOIN `projects` AS `p` ON `p`.`id` = `t`.`project_id`
SET
  `t`.`title` = CONCAT(`p`.`name`, '：', CASE MOD(`t`.`id` - 31, 3)
    WHEN 0 THEN '接口联调与异常处理'
    WHEN 1 THEN '测试用例与缺陷修复'
    ELSE '演示材料与交付整理'
  END),
  `t`.`description` = CASE MOD(`t`.`id` - 31, 3)
    WHEN 0 THEN CONCAT('完成', `p`.`name`, '主要接口联调，补充参数校验和异常提示。')
    WHEN 1 THEN CONCAT('为', `p`.`name`, '整理核心场景测试用例，修复验收过程中发现的问题。')
    ELSE CONCAT('整理', `p`.`name`, '的演示数据、操作说明和阶段交付材料。')
  END,
  `t`.`tag` = CASE MOD(`t`.`id` - 31, 3)
    WHEN 0 THEN '功能' WHEN 1 THEN '测试' ELSE '文档'
  END
WHERE `t`.`id` BETWEEN 31 AND 102
  AND `t`.`tag` = 'seed';

-- 将乱码评论和分页测试评论改成与任务内容对应的沟通记录。
UPDATE `task_comments` AS `c`
JOIN `tasks` AS `t` ON `t`.`id` = `c`.`task_id`
SET `c`.`content` = CONCAT('已完成“', `t`.`title`, '”的阶段工作，当前结果已提交到项目协作空间，请负责人查看。')
WHERE `c`.`id` BETWEEN 4 AND 27;

UPDATE `task_comments` AS `c`
JOIN `tasks` AS `t` ON `t`.`id` = `c`.`task_id`
SET `c`.`content` = CONCAT('已根据评审意见更新“', `t`.`title`, '”，补充了测试结果和待确认事项。')
WHERE `c`.`id` BETWEEN 28 AND 99
  AND `c`.`content` = 'Seed comment for pagination test';

-- 附件名称改为真实的项目交付材料名称，仍然只更新分页演示附件。
UPDATE `files` AS `f`
JOIN `tasks` AS `t` ON `t`.`id` = `f`.`task_id`
SET
  `f`.`original_name` = CONCAT('阶段验收材料-', `t`.`id`, '.pdf'),
  `f`.`stored_name` = CONCAT('deliverable-', LPAD(`t`.`id`, 3, '0'), '.pdf'),
  `f`.`storage_path` = CONCAT('uploads/deliverables/deliverable-', LPAD(`t`.`id`, 3, '0'), '.pdf'),
  `f`.`mime_type` = 'application/pdf'
WHERE `f`.`id` BETWEEN 2 AND 25
  AND `f`.`stored_name` LIKE 'seed-project-%';

-- 将分页测试通知和日志改为根据真实项目、任务生成的提示文本。
UPDATE `notifications` AS `n`
JOIN `projects` AS `p` ON `p`.`id` = `n`.`project_id`
SET
  `n`.`title` = '项目进度提醒',
  `n`.`content` = CONCAT('项目「', `p`.`name`, '」有新的协作进展，请进入项目查看详情。')
WHERE `n`.`id` BETWEEN 10 AND 33;

UPDATE `operation_logs` AS `o`
JOIN `projects` AS `p` ON `p`.`id` = `o`.`project_id`
SET
  `o`.`target_name` = `p`.`name`,
  `o`.`description` = CONCAT('项目负责人更新了项目「', `p`.`name`, '」的演示进度。')
WHERE `o`.`id` BETWEEN 22 AND 45;

COMMIT;
