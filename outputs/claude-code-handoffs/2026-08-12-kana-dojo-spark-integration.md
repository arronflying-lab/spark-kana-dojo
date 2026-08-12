# KanaDojo × 星火数据适配交接

日期：2026-08-12
状态：下游框架适配已完成；未连接生产写入，未部署。

## 源码与许可证

- 上游仓库：[lingdojo/kana-dojo](https://github.com/lingdojo/kana-dojo)
- 当前集成基线：`5b034742a6d794f6a443b35e87c54d8370e536fc`
- 许可证：AGPL-3.0-or-later
- 下游保留上游目录结构和源码许可证；credits 页面新增固定提交来源链接。

## 已完成

- 新增 `/spark` 学习入口：单词和语法使用两个明确 tab，不混题。
- 新增 `SparkVocabularyGame`，把星火公开词汇映射到 KanaDojo 原生 `VocabularyGame`，保留成熟框架的选择题、进度和反馈体验。
- 新增 `SparkGrammarStudy`，读取星火语法知识点、例句和已有讲义字段；本阶段不把语法伪装成单词题。
- 新增服务端 provider：验证既有 `spark_session`，或验证门户交接后产生的 HttpOnly `spark_kana_dojo_session`，再按账号读取数据。
- 新增只读 API：`/api/spark-learning?kind=vocabulary|grammar&level=n5..n1&limit=...`。
- 新增 HMAC 交接 API：门户短时令牌只在服务端验证后换成下游 HttpOnly 会话。
- 交接令牌放在 URL fragment 中，由页面加载后读取并立即清除，不通过查询字符串发送给服务器。
- 下游 `vercel.json` 和 Next headers 统一为 `X-Frame-Options: SAMEORIGIN`，允许星火同源 iframe 挂载，仍拒绝跨站嵌入。
- 支持 `KANA_DOJO_BASE_PATH` 和 `NEXT_PUBLIC_KANA_DOJO_BASE_PATH` 的同源挂载。

## 数据边界

- 单词来源：`v_public_vocabulary`，公开质量闸门后的发布清单。
- 语法来源：`v_study_grammar_points`。
- 适配器遇到缺少必需字段的记录会丢弃并返回剩余合法记录；正式发布前应继续运行完整计数审计，确保缺失不是静默发生。
- 账号 ID 只由可信 cookie/服务端交接令牌解析，浏览器不能通过请求参数指定账号。
- 本阶段不更新 `spark_practice_attempts`、SM-2、生词本或任何生产学习记录。

## 验证

- `npm.cmd ci --ignore-scripts --no-audit --no-fund`：成功，安装 1173 个锁定依赖。
- `npm.cmd run check`：成功；TypeScript 0 errors，ESLint 0 errors，482 warnings 为上游基线告警。
- `git diff --check`：通过。

## 仍需处理

1. 完成主门户和下游的同源反向代理配置，并使用同一个 `SPARK_KANA_DOJO_HANDOFF_SECRET`。
2. 在真实测试账号下跑浏览器流程和移动宽度检查。
3. 复核当前 KanaDojo 原生游戏的题面、发音和反馈体验；用户已明确后续会修正内容与发音，本提交暂不重写成熟框架交互。
4. 若要把短时交接令牌升级为不可重放的一次性票据，需要单独设计增量表/RPC；当前实现的 60 秒 HMAC 令牌适合作为框架接入阶段，不应直接视作最终高安全认证方案。
