# KanaDojo → 星火单词闯关服务端适配（2026-08-14）

## 结论

KanaDojo 的 Spark 单词页不再从浏览器随机取词或在本地计分。它直接调用主门户的 `/api/portal/vocab-quest/*` 接口，因此课程、题目计划、答案判定、心数、XP、进度与复习排期继续由门户服务端和 Supabase 统一掌控。

## 本次改动

- 新增 `features/SparkIntegration/portalVocabQuest.ts`：只包含浏览器到主门户既有接口的类型化适配。
- 重写 `SparkVocabularyGame`：读取冻结课程路径、呈现单元和三关解锁状态、创建服务端会话。
- 重写 `SparkVocabularyChallenge`：使用 KanaDojo 的游戏底栏、拼块组件和动画；答后在同一题面原地反馈，不再跳转单独答案页。
- 旧本地随机出题逻辑已移除。没有把作答写入 KanaDojo 本地进度或会话历史。
- 假名题使用服务端下发的 tile ID；主门户现额外公开 `answerLength`（答案格数，非答案），前端只有选满格数才允许提交。
- 旧的 `reading_input` 会话在界面明确提示结束后重开；新会话不产生输入题。

## 数据与安全边界

- 服务端 Cookie `spark_session` 的路径为 `/`，同站点 `/kanadojo` 嵌入页调用根路径 `/api/portal/vocab-quest/*` 时会携带现有门户登录会话。
- 前端未获得 Supabase service role、答案键、完整题目计划或学生原始输入。
- Supabase 只做了读取核验，未改动任何生产数据或 RLS。

## 已核验

- KanaDojo：`npx tsc --noEmit --pretty false --incremental` 通过。
- KanaDojo：词库适配和门户 API 适配共 9 个 Vitest 测试通过，ESLint 零警告，`git diff --check` 通过。
- 主门户：单词闯关题型/课程 9 个 Vitest 测试通过，TypeScript 通过，`check:vocab-quest-schema` 通过。
- 实时数据库只读审计：课程 11,304 个 slug 全部可由 `v_study_vocabulary` 解析、等级一致、必填字段齐全；无 `助词/助动词` 词性记录。

## 仍需处理 / 上线前放行

1. 历史课程清单仍含 76 条接头、接尾或 `～` 占位式词条。它们不是语法记录，但不适合作为普通词汇关；需要内容方决定移出当前课程还是形成单独构词单元，不能静默替换。
2. 本地 Playwright 对 Turbopack 静态 chunk 出现 403，无法完成带真实会话的浏览器流程；生产主机恢复后，需用试点账户在 N5/N3/N1 各走一关。
3. 生产主机仍不可用，且远端已设置禁止在 4GB 上海主机上编译的部署互锁。先恢复主机，再使用外部构建产物部署。
4. 当前工作树有 Next 开发服务器自动追加的 `AGENTS.md` 指引块；按上游注释，它会被再次生成，应与提交一起保留或在提交策略中明确处理。

## 关键路径

- KanaDojo 工作树：`C:\Users\arron\Documents\EJU成长系统\worktrees\kana-dojo-spark-vocab-ux`
- 主门户工作树：`C:\Users\arron\Documents\EJU成长系统\portal-main-rebase`
- 上游许可证：AGPL-3.0-or-later；下游仓库必须继续保留相应源码可得性和许可证义务。
