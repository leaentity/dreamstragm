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
