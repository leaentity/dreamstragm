# 开发记录

## 2026-11-06：重新锁定 GitHub 上传版

用户确认：仅以 GitHub 已上传版本为主，忽略 Claude 版和本地未上传改动；88 小时“真实个人体验 + 单机梦圈”范围继续有效。

已完成：
- 只读查询 GitHub，确认 main 为 e319068e9ac38cde38263d11c7f92e9f84f2fb47。
- 在当前工作目录独立克隆，建立 feat/november-foundation；原有目录不变。
- 记录 CURRENT_BASELINE.md、DATA_CONTRACT.md，校正先前 Claude 基准的排期前提。
- 产品源码未更改，真实 AI/语音尚未接通。

检查结果：app.js 语法检查通过；index.html、app.js、style.css 与远端 main 对应文件逐字节一致。独立本地预览使用 localhost:5174，只提供前端白名单资源，不暴露 Git 元数据或环境文件。
