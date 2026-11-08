# Dream assistant — static motion studies v1

本轮仅制作静态参考，未替换首页人物或加入动画。使用内置 imagegen，以 `assets/dream-assistant-full-body-v2.png` 为人物身份与像素风格参考；未调用项目的 OpenAI 接口。

## 素材

- `assistant-poses-v1.png`：4 列 × 3 行透明背景动作设定。
  - 第一行：向右走路的四个姿态。
  - 第二行：思考、伸笔、绘制、收笔。
  - 第三行：站立、思考、坐着记梦、抱着梦境本。
- `dream-doodles-v1.png`：独立的像素涂鸦参考页，供后续背景逐笔出现使用。

## 生成提示词要点

人物稿：Preserve the reference blue bob covering one eye, upright animal ears, purple cream-trim shirt, grey-green shorts and purple boots. Coarse square pixel clusters, hard stair-step edges, limited flat palette. A transparent 4×3 contact sheet: four right-walking poses, four dream-doodling poses, idle/thinking/notebook-writing/notebook-hugging. Consistent identity and proportions; full figures inside cells. No gradients, blur, scenery, labels or UI.

涂鸦稿：Transparent 4×3 sheet of isolated lightweight pixel doodles: crescent, star, cloud, sparkles, notebook, sleepy face, feather, ringed planet, spiral, wavy dream trail, abstract handwriting squiggles and pencil with trail. Muted ink blue and pale lavender, coarse square pixels, thin sparse outlines, no character or text, no gradients or smoothing.

## 接入动画前

这是生成式动作设定，尚不是已经逐像素校准的最终精灵图。需检查步态左右脚交替，统一画布、脚底基线、人物大小与笔尖位置，清理边缘碎点，并检查在首页实际尺寸下的可读性。

建议循环：缓慢走几步 → 停下思考 → 画出一个小图案 → 看看笔记 → 继续走。让人物仅在首页中央留白区内活动，避开语音气泡、文字、按钮及导航；涂鸦保持少量、低对比度。后续实现时适配减少动态效果设置，离开首页即暂停。

## 首页动画 v1（已接入）

运行素材为 `assets/assistant-motion-v1.png`（560×660，4×3 帧，每帧 140×220）和 `assets/assistant-doodles-v1.png`（192×144，每格 48×48）。人物原稿按行区域 0–32%、32–64.5%、64.5–100% 提取非透明范围，以最近邻 0.42 倍缩放、居中、脚底距帧底 8px；涂鸦最长边 34px。原设定稿保留。

`assistant-motion.js` 控制 28 秒循环：站立 → 向右走 → 思考 → 涂鸦 → 向左走 → 坐下记梦 → 抱笔记本 → 走回中央。低帧率切换，位移轻量插值；转向独立切换，避免横向压扁。涂鸦使用本地固定素材。

暂停状态仅在当前页面内存中保留，刷新恢复播放。系统减少动态效果时静止站立、隐藏涂鸦；离开首页释放计时器，滚出可见区和隐藏标签页时暂停时间推进。精灵加载失败继续显示原静态人物。UI 重绘清理旧实例，无外部库、无 API 调用，不改动梦境数据。

这是动作设定衍生的首版像素循环，后续可继续精修步幅、笔尖衔接与表情。浏览器检查脚本：`tests/assistant-motion.cjs`。
