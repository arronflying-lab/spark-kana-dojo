# Spark KanaDojo 部署手册

## 运行边界

- `build` job 使用 GitHub hosted runner 构建 `.next/standalone` 运行产物。
- `deploy` job 使用上海主机上的专用 runner 标签 `shanghai-kana-dojo`，只下载产物、写入服务端环境并重启 PM2。
- 上海主机不执行 `npm ci`、`next build` 或 TypeScript 构建，避免 4GB 生产机发生 OOM。
- 下游 PM2 名称为 `spark-kana-dojo`，监听 `127.0.0.1:3102`。

## 首次注册专用 runner

在上海主机恢复后，以 `ubuntu` 用户执行受控安装：

1. 使用 GitHub Actions runner registration token 注册到 `arronflying-lab/spark-kana-dojo`。
2. Runner 名称：`shanghai-kana-dojo-01`。
3. 标签：`self-hosted,linux,shanghai-kana-dojo`。
4. 工作目录使用独立的 `/home/ubuntu/kana-dojo-runner/_work`，不得复用主门户 runner 的工作目录。
5. 安装并启用 systemd 服务，确认 GitHub 显示 `online` 后再触发部署工作流。

注册 token 只用于一次注册，不写入仓库、日志或环境文件。

## 发布与回滚

- 手动运行 `Deploy Spark adapter (Shanghai)`，指定 `main` 或已核验的提交。
- 构建产物保留 7 天；运行时健康检查失败时恢复上一个 `.next` 运行产物。
- 外部入口由主门户仓库的 `Configure KanaDojo mount (Shanghai)` 独立启用或禁用。
- 当前阶段不执行数据库 migration；内容读取由下游服务端通过现有星火视图完成。
