# OpenAI 梦境整理接入

日期：2026-11-07。用户已选择本轮先完成接入与测试，不调用真实模型。**真实 OpenAI 联调、账号模型可用性与输出忠实度尚未验收。**

## 当前实现

前端仍是原生 HTML/CSS/JavaScript + IndexedDB。新增同源 Node 服务，不引入前端框架，也不创建服务端数据库。

调用路径：浏览器 `tidy.js` → `POST /api/organize` → `server/organize.cjs` → 官方 OpenAI SDK / Responses API。角色规则单独存于 `server/prompts/organize.cjs`，不能由客户端替换。依赖固定在 package.json / pnpm-lock.yaml。

- 输入只有当前这条文字，不发送全部梦境库、图片、其他梦境或完整历史。
- 提示要求只整理表达、标点和段落，保留原语言、人物、情节顺序、不确定性与碎片，不解释或扩写梦。
- Structured Outputs 返回 organizedText 与 suggestedTags；JSON 结构正确不等于事实忠实，用户仍须复核。
- 标签最多 8 个，每个最多 40 字符，类型为 person/place/theme/event。服务端仅保留能在原文中逐字找到的标签；全部默认不选，用户确认后才进入档案与统计。
- 统计改为读取已确认标签与实体类型，并补上 Places 分类，避免新人物或中文标签被旧固定名单漏掉。关系图仍为预设演示。
- 真实接口失败时不会回退成固定回复。其他解梦、图像与语音仍为演示。

## 原文保护与关联

1. 点击 AI 整理，先在 IndexedDB 原子保存当前输入。新梦获得唯一 ID；已有梦新增 pendingDraft，不覆盖已确认正文或首次原文。
2. 保存失败则不发送 API 请求，输入仍在编辑页。
3. 输入保存成功后，仅发送该份文字。模型返回后展示原文、可编辑整理稿与未勾选建议标签。
4. 确认保存：仍用同一 dreamId，增加正文版本，记录 source=openai，首次原文保持不变；清除 pendingDraft。
5. 接口失败、超限或取消：已保存输入可在详情通过 Resume saved input 恢复。刷新不会偷偷重新调用模型。

pendingDraft 是 v1 快照的可选字段，包含 text、title、date、tags、transcriptText、baseVersion、savedAt，旧库无需重置。备份包含此输入。`saveForTidy` 不重复建立梦境或递增正文版本。新确认标签通过独立类型提示写入统一目录，ID 与关联不受中英切换影响。

未确认的模型结果、对整理稿的新修改和建议标签没有自动持久化；刷新前有未保存提醒。恢复入口恢复的是请求前的用户输入，重新请求需用户主动点击，可能再次计费。

## 长度、超时与错误

- 整理输入最多 4,000 个 JavaScript 字符（UTF-16 code units），HTTP body 最多 32 KB。超限原文照常保存在本地，但不请求模型、不截断。
- 输出预算 6,000 tokens；若输出未完成、拒绝、JSON 无效或正文超过 8,000 字符，则提示失败而不把部分结果当成功。
- SDK 超时 55 秒，浏览器等待上限 65 秒，SDK maxRetries=0；没有无限/静默重试。
- 同一请求 ID 在单个服务进程中短暂共享结果，防重复调用；缓存约 2 分钟、最多 100 项。每 IP 20 次/10 分钟、最多 4 个并行调用。
- 分别返回缺少配置、鉴权失败、额度不足、限流、超时、模型不可用、配置无效、服务不可用、拒绝及无效输出错误。响应只含安全错误码，不透传提供商完整异常。
- 取消和导航离开会忽略迟到结果，不能覆盖新输入；取消浏览器等待不保证提供商已接受的请求停止计费。

## 本地启动

已在本机使用 Node 24 和 pnpm 11 安装并运行。新环境需 Node 24+ 与 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm start
```

访问 http://localhost:5174/ 。先停止占用 5174 的旧 Python 预览。仍使用 localhost:5174，不改变已有档案的 origin；查询参数变化不会创建新档案。

Python 预览只适合静态 UI，没有整理接口。真实整理必须使用 Node 服务。Node 服务目前只监听 127.0.0.1，不对外发布。

## 密钥与模型

仅在尚无 `.env` 的首次配置时，将 `.env.example` 复制为 `.env`。填入你自己的 `OPENAI_API_KEY`，并设置：

```dotenv
OPENAI_MODEL=gpt-6-luna
```

`.env.example` 本身只含占位值。`.env` 与 `.env.*` 已被 Git 忽略，不能放进前端构建变量、聊天或 GitHub。配置改变后重启服务。也可直接通过服务端进程环境变量配置。

当前选择 gpt-6-luna，服务端显式设置 reasoning.effort=none 与 service_tier=default（Standard），避免默认 medium 推理与项目级加速档位造成额外用量。模型名称仍只由服务端环境读取。SDK 固定使用 OpenAI 官方 API 地址，不采用其他兼容服务商的地址。

按官方 2026-11-07 查询的 Standard 价格，输入 $0.10/百万、输出 $0.50/百万；假设 1,200 输入 + 800 输出 tokens，约 $0.00052/次。不是固定价，输入和实际输出会影响费用。账号是否有 gpt-6-luna 权限仍需真实测试。原先 gpt-5.4-mini 为早期候选，不再是当前首选。

[GPT-6 Luna 官方参数与价格](https://developers.openai.com/api/docs/models/gpt-6-luna)；[Responses service_tier](https://developers.openai.com/api/reference/typescript/resources/responses)。

准备好有效凭据并愿意进行付费联调后，才手动运行：

```sh
pnpm test:live
```

该脚本会发送两条虚构的中英文梦境给真实 OpenAI，检查结构和人物名称，不打印梦境或完整异常。通过也不能代替人工对照原文评审。

## 隐私与部署边界

静态资源严格白名单，`.env`、server、node_modules、Git 元数据和测试文件不对浏览器开放。SDK logLevel=off，默认不记录完整梦境、结果、请求正文或密钥。请求设置 store:false；这不是零留存承诺，仍以 OpenAI 的数据政策和账户设置为准。

当前只有本地服务，没有生产部署。现有仓库没有已确认的 API 托管配置。未来上线需选支持 Node/服务端函数的环境，在部署平台单独配置两个服务端环境变量；静态文件托管本身不能运行此接口。当前限流/去重是进程内机制，不是公开多用户服务的分布式配额或认证；公网开放前需另行加入访问与成本控制，本轮不发布。

## 验收结果分类

- 25 项自动测试通过：存储、语言、音频、服务端参数/错误/限制、官方 SDK 序列化和客户端状态。SDK fetch 使用测试响应，没有连接 OpenAI。
- `tests/tidy-browser.cjs`：真实本地 HTTP 缺配置错误；其余成功/限流/取消用明确的浏览器接口夹具。验证中英文原文保存、恢复、人工修改确认、类型化标签、统计来源、重复点击、超长输入、存储失败不发送、迟到结果隔离及手机宽度。
- 原主要路径、IndexedDB/备份/重启、中英切换回归通过；旧回归脚本的整理步骤使用 `tests/fixtures/tidy.cjs`，不属于真实 AI 验收。
- 没有有效 API 凭据，且用户本轮明确选择不调用真实模型：**未完成真实 API 联调、账号权限/额度验证、中英文整理质量验收和真实请求耗时测量。**

## 官方依据

- [GPT-5.4 mini 模型、Responses 与价格](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI 数据控制](https://developers.openai.com/api/docs/guides/your-data)
