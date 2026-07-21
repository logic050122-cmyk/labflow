-- LabFlow 演示项目数据修复脚本
-- 目标环境：MySQL 8.0+
-- 作用：将项目列表分页测试留下的乱码占位数据替换为可展示、可答辩的真实业务项目。
-- 注意：只更新 owner_user_id=1 且邀请码仍为 SEEDPAGE 开头的 24 条旧演示项目，
--       不删除数据，不影响用户手动创建的项目。

SET NAMES utf8mb4;
USE `labflow`;

START TRANSACTION;

-- 这些项目用于项目列表、项目详情和分页演示；名称、简介、日期和状态保持业务一致。
UPDATE `projects`
SET
  `name` = CASE `id`
    WHEN 6 THEN 'LabFlow 项目协作平台 1.0'
    WHEN 7 THEN '高校实验室官网改版'
    WHEN 8 THEN '智能温室数据采集系统'
    WHEN 9 THEN '校园二手交易小程序'
    WHEN 10 THEN '毕业设计选题管理平台'
    WHEN 11 THEN '2026 创新创业竞赛申报'
    WHEN 12 THEN '数据结构课程设计：图书管理系统'
    WHEN 13 THEN '实验室设备预约系统'
    WHEN 14 THEN '室内定位巡检原型'
    WHEN 15 THEN '学术论文检索助手'
    WHEN 16 THEN '学生竞赛报名管理系统'
    WHEN 17 THEN '2026 春季招新与培训'
    WHEN 18 THEN '校园失物招领平台'
    WHEN 19 THEN '计算机组成原理实验管理'
    WHEN 20 THEN '社团活动报名与签到系统'
    WHEN 21 THEN '校园导航 Web 应用'
    WHEN 22 THEN '实验室周报自动汇总工具'
    WHEN 23 THEN '软件工程课程项目验收'
    WHEN 24 THEN '智能问答知识库原型'
    WHEN 25 THEN '开放实验室值班排班系统'
    WHEN 26 THEN '校园快递代取管理平台'
    WHEN 27 THEN '医院预约挂号流程原型'
    WHEN 28 THEN '毕业设计过程管理平台'
    WHEN 29 THEN '2026 夏令营报名系统'
  END,
  `description` = CASE `id`
    WHEN 6 THEN '面向实验室成员的项目、任务、审核、通知与操作记录协作平台第一版开发。'
    WHEN 7 THEN '完成实验室官网首页、成果展示、成员介绍与后台内容维护流程改版。'
    WHEN 8 THEN '采集温湿度、光照和土壤湿度数据，完成仪表盘和异常提醒原型。'
    WHEN 9 THEN '为校内闲置物品提供发布、浏览、沟通与交易进度记录的微信小程序。'
    WHEN 10 THEN '覆盖选题发布、学生志愿填报、教师审核和答辩安排的毕业设计管理系统。'
    WHEN 11 THEN '完成商业计划书、路演 PPT、财务测算和答辩材料整理，项目已结项。'
    WHEN 12 THEN '实现图书入库、借阅、归还、查询及逾期提醒等课程设计核心功能。'
    WHEN 13 THEN '提供设备预约、时段冲突校验、审批和使用记录查询的实验室预约系统。'
    WHEN 14 THEN '基于蓝牙信标探索室内定位、地图标注和巡检路线记录的可行性。'
    WHEN 15 THEN '帮助学生检索论文、收藏条目、生成阅读笔记并管理参考文献。'
    WHEN 16 THEN '支持竞赛通知发布、团队报名、材料提交和报名审核的校内协作平台。'
    WHEN 17 THEN '完成招新宣传、面试排期、新成员培训和结营反馈，活动已结束。'
    WHEN 18 THEN '集中发布失物招领信息，支持认领核验、状态更新和处理记录。'
    WHEN 19 THEN '面向课程实验的任务发布、报告提交、教师批改和成绩反馈管理。'
    WHEN 20 THEN '支持活动发布、在线报名、二维码签到和参与数据导出的社团管理工具。'
    WHEN 21 THEN '整合教学楼、食堂、宿舍和办事地点信息的校园导航 Web 应用。'
    WHEN 22 THEN '自动汇总成员周报，生成项目进度摘要并提醒未提交成员。'
    WHEN 23 THEN '完成需求文档、代码仓库、测试报告和答辩材料的课程项目验收。'
    WHEN 24 THEN '基于实验室文档构建问答流程，验证知识检索与答案引用的基础能力。'
    WHEN 25 THEN '用于安排开放实验室值班、换班申请和负责人确认的轻量协作工具。'
    WHEN 26 THEN '记录代取需求、接单状态、取件凭证和完成确认的校园服务项目。'
    WHEN 27 THEN '梳理预约、挂号、候诊和取消流程，完成 Web 原型及可用性测试。'
    WHEN 28 THEN '覆盖开题、中期检查、周报、导师反馈和答辩资料归档的过程管理平台。'
    WHEN 29 THEN '完成招生宣传、在线报名、材料初审和录取通知，活动已结束。'
  END,
  `status` = CASE `id`
    WHEN 11 THEN 'finished'
    WHEN 17 THEN 'finished'
    WHEN 23 THEN 'finished'
    WHEN 29 THEN 'finished'
    ELSE 'active'
  END,
  `start_date` = CASE `id`
    WHEN 6 THEN '2026-06-20' WHEN 7 THEN '2026-07-01'
    WHEN 8 THEN '2026-07-05' WHEN 9 THEN '2026-06-25'
    WHEN 10 THEN '2026-07-10' WHEN 11 THEN '2026-04-01'
    WHEN 12 THEN '2026-07-01' WHEN 13 THEN '2026-06-15'
    WHEN 14 THEN '2026-07-08' WHEN 15 THEN '2026-06-28'
    WHEN 16 THEN '2026-07-01' WHEN 17 THEN '2026-03-10'
    WHEN 18 THEN '2026-07-03' WHEN 19 THEN '2026-06-22'
    WHEN 20 THEN '2026-07-06' WHEN 21 THEN '2026-06-18'
    WHEN 22 THEN '2026-07-12' WHEN 23 THEN '2026-03-01'
    WHEN 24 THEN '2026-07-08' WHEN 25 THEN '2026-07-01'
    WHEN 26 THEN '2026-07-09' WHEN 27 THEN '2026-06-30'
    WHEN 28 THEN '2026-07-15' WHEN 29 THEN '2026-04-15'
  END,
  `end_date` = CASE `id`
    WHEN 6 THEN '2026-09-15' WHEN 7 THEN '2026-08-20'
    WHEN 8 THEN '2026-09-05' WHEN 9 THEN '2026-08-31'
    WHEN 10 THEN '2026-10-15' WHEN 11 THEN '2026-06-30'
    WHEN 12 THEN '2026-08-10' WHEN 13 THEN '2026-08-30'
    WHEN 14 THEN '2026-09-10' WHEN 15 THEN '2026-09-01'
    WHEN 16 THEN '2026-09-20' WHEN 17 THEN '2026-05-31'
    WHEN 18 THEN '2026-08-25' WHEN 19 THEN '2026-08-15'
    WHEN 20 THEN '2026-09-12' WHEN 21 THEN '2026-08-28'
    WHEN 22 THEN '2026-08-16' WHEN 23 THEN '2026-06-20'
    WHEN 24 THEN '2026-09-18' WHEN 25 THEN '2026-08-31'
    WHEN 26 THEN '2026-09-08' WHEN 27 THEN '2026-08-22'
    WHEN 28 THEN '2026-10-30' WHEN 29 THEN '2026-07-10'
  END,
  `invite_code` = CASE `id`
    WHEN 6 THEN 'LABFLOWV1' WHEN 7 THEN 'LABWEB26'
    WHEN 8 THEN 'GREENHOUSE26' WHEN 9 THEN 'TRADEMINI26'
    WHEN 10 THEN 'THESISMGMT26' WHEN 11 THEN 'BIZPLAN2026'
    WHEN 12 THEN 'BOOKSYS2026' WHEN 13 THEN 'LABBOOKING26'
    WHEN 14 THEN 'INDOORPOS26' WHEN 15 THEN 'PAPERHELP26'
    WHEN 16 THEN 'CONTEST26' WHEN 17 THEN 'RECRUIT26'
    WHEN 18 THEN 'LOSTFOUND26' WHEN 19 THEN 'COALAB26'
    WHEN 20 THEN 'CLUBEVENT26' WHEN 21 THEN 'CAMPUSMAP26'
    WHEN 22 THEN 'WEEKLYBOT26' WHEN 23 THEN 'SEACHECK26'
    WHEN 24 THEN 'KNOWLEDGE26' WHEN 25 THEN 'LABDUTY26'
    WHEN 26 THEN 'EXPRESS26' WHEN 27 THEN 'MEDICALUX26'
    WHEN 28 THEN 'THESISFLOW26' WHEN 29 THEN 'SUMMERCAMP26'
  END
WHERE `id` BETWEEN 6 AND 29
  AND `owner_user_id` = 1
  AND `invite_code` LIKE 'SEEDPAGE%';

COMMIT;
