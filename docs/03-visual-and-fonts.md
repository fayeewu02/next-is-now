# 03 · 视觉与字体复刻

## 不要重新猜数值

`dist/styles.css` 是全部精确样式；保留级联顺序。文件前部存在老组件样式，后部有现行覆盖，不能只挑最早同名规则，也不能以“没用到”猜测删掉依赖。`manifests/design-tokens.json` 仅是便于检索的变量表，不代替完整 CSS。

整体：温暖活泼的扁平插画、黑色描边和硬阴影、明亮红 / 淡粉 / 淡蓝、奶黄底、纸页胶带和生活碎片。不是拟物 3D 风，也不是全黑白工具界面。

| 基础色 | 值 | 用途 |
| --- | --- | --- |
| red | #ff2442 | 主按钮、标题重点、完成花、已完成日期 |
| ink | #202124 | 主文字、线框、硬阴影 |
| paper | #fff8cf | 首页黄底、标签 |
| yellow | #ffe45c | 时间选中、小点缀 |
| blue | #bfefff | 次按钮、手工分类 |
| pink | #ffd6de | 目标入口、运动分类 |
| cyan | #22b8be | 扭蛋与插画点缀 |
| warm body | #fff8e1 | 非首页暖背景 |
| notebook | #fffdf4 | 日记纸与暖卡片 |

分类色依次为 `#bfefff,#d7edaa,#ffe45c,#ffd6de,#fff0b6,#c7efe4`。基础 radius=24px，具体按钮、纸页和卡片单独定义。

## 响应式 / 构图

- 首页标题位于上方中央，错落三层；intro 较小，最后一句约主行 .7/.72 倍。视口与高度影响标题 44–56px（移动）/ 64px（桌面），机器 230–262px（移动）/ 310–340px（桌面）。精确验收尺寸在 `references/test-results/home-layout/results.json`。
- 320 / 360 窄屏、390 / 430 手机、768 和 1440 桌面均要适配；760px 主断点，另有 360px 窄屏和 760 / 950px 高度规则。底栏留 safe-area，不盖住入口。
- 分类移动端三列，每行三个紧凑卡片，选中全部黑框；文件夹形状的伪元素不得遮挡框线。
- 收藏纸签顶部有微缩扭蛋机、拆蛋、纸条引线；纸签边缘打孔 / 波浪、层叠阴影用 CSS。封面原截图裁出上部图片，下部标题由真实可编辑文字呈现。
- 日记纸页有胶带、装订孔、折角、横线与不齐整边；文字每行 32px，线位置一致。上传照片为稍旋转的拍立得形状，支持删除。
- 月历数字上、红花下，纯红五瓣，花 15×15px；花心与花瓣同色，不是黄色。不能拿完成弹窗的大花尺寸给月历用。
- 时间轴暖纸卡，有照片才左右图文布局，无照片纯文字。参考所有当前截图，不能用最早的黑白参考稿覆盖成品。

## 素材使用方式

首页 SVG 由 `machineSVG()` 生成；动画对应 `.rotor/.capsules/.exit-capsule` 和 CSS keyframes。独立 SVG 和 PNG 已导出，但原机器必须用内联 SVG 才能继续转动；用整张 PNG 会失去转柄和掉蛋动画。

五瓣花 `flower()` 为五个旋转 ellipse + 同色中心覆盖圆，视觉是纯色五瓣花；没有黄色中心。线性 icon 统一 viewBox24、stroke2、round。`gacha-machine.svg` 用 `#capsule` 引用；多个 SVG 同页面内联需要 ID 前缀避免碰撞，或者仍按当前渲染结构使用。拆开的蛋也已单独导出。

扭蛋 / 弹窗动画不在单张切图中；完整动作代码已在 app.js / styles.css 保留。PNG 切图是迁移参考，2x/3x 表示物理尺寸倍率。横线、纸页、胶带、品牌标记以及按钮形状为 CSS/文字组件，不存在遗漏的外部背景图。

## 字体包：原版与备用必须分开

原版 font stack：`"Microsoft YaHei","PingFang SC",system-ui,sans-serif`，`font-synthesis:none`。没有自建字体文件或外部字体 CDN。Chrome 实际采用的字体见 `references/font-rendering.json`；粗细可能包含系统 fallback，不要仅看 CSS weight 推断真实字体文件。

没有把微软雅黑 / 苹方 / Segoe 等系统字体从电脑复制进包。微软官方明确限制 Windows 字体再分发和应用嵌入；原版可以使用目标电脑已安装字体，但迁移包不是额外授权。说明来源：[Microsoft 字体再分发 FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq)。苹果字体同样没有额外再分发许可依据，因此不附二进制。

已附官方 Noto Sans SC 简体中文可变 TTF，100–900 字重，以及官方 OFL 1.1 原文。文件未改名、未子集化、未转换；原文件内版权元数据保留。字体不能单独售卖；分发时保留许可和版权信息。来源及固定版本见 `manifests/fonts.json`，官方：[Noto CJK 下载说明](https://github.com/notofonts/noto-cjk/blob/main/Sans/README.md)、[原始许可证](https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/LICENSE)。

打开 `/portable-fonts.html` 可试用开源字体版。只有新入口附加 `fonts/portable-fonts.css`，原始 `index.html` / `styles.css` 未修改。Noto **不是**微软雅黑同字形替代，行宽、字重和断行可能变化；只有核心布局做了备用版烟测，原版完整六组测试另列。不要声称已跨平台逐像素验收。

分类 emoji 为 ✂️ / 📖 / 🎧 / 👟 / 🥣 / ✎，模式 ⚑ / ✦，底栏 ✦ / ▤。这是 Unicode + 系统字体，Windows、macOS、Android 外形不一样；本包没有复制系统 emoji 字库。代码保留码点；PNG 页面参考固定的是本机已验收效果。如果以后需要每个平台完全相同的 emoji，应经用户确认选有授权的统一图标并重新验收，不默默改原版。
