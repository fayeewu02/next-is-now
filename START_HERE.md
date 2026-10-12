# 下次就是现在 · Cowork 接手入口

这是 **v6 缺料替代方案演示版**的完整迁移资料，不是一份让你重新发挥的设计简报。请先跑现成代码，再按需求继续开发。

## 先做这三件事

1. 阅读 `AGENTS.md`、`docs/01-product.md`、`docs/02-interactions-and-data.md`。
2. 在本目录执行 `node scripts/serve.mjs`，打开 `http://127.0.0.1:4917/`。也可以 `npm start`。网页运行不需要 npm install、不需要 API Key、不需要构建。
3. 对照 `references/screenshots/` 和 `docs/05-acceptance.md`，确认基线再修改。不要直接双击 HTML，浏览器本地存储需要稳定的 HTTP origin。

## 材料在哪

| 目录 / 文件 | 内容 | 如何使用 |
| --- | --- | --- |
| `dist/` | 可编辑 HTML/CSS/JS 原样代码；21 张原始收藏截图 | 这是界面和功能的唯一代码基准，可直接作为静态站发布 |
| `assets/covers/` | 21 张精确裁剪、无文字标题栏的 PNG 封面 | 重构组件时可选用；原代码仍按裁剪坐标展示原图 |
| `assets/illustrations/`、`assets/icons/` | 代码原生 SVG，透明 PNG 的 2x / 3x 导出 | 扭蛋机、五瓣红花、分类插画、线性图标 |
| `dist/fonts/` | Noto Sans SC 可变字体 + OFL 原始许可证 + 可选样式 | 不是原版微软雅黑；跨系统备用，见字体说明 |
| `dist/portable-fonts.html` | 开源字体试运行入口 | 与原版相比仅切换字体；不要把它误当原版像素基准 |
| `manifests/` | 收藏 / 指南 / 假替代方案 JSON、素材索引、设计变量、状态机、文件哈希 | 给 agent 读取、移植和核对 |
| `references/` | 当前代码生成的页面截图、截图索引、测试报告、字体渲染信息 | 图片中的日记和照片是隔离测试样例，不是用户真实数据 |
| `tests/` | 六组可移植 Playwright 回归检查 | 不再依赖原开发电脑的绝对路径 |
| `docs/` | 产品、交互、视觉、素材权利、验收、迁移边界说明 | 先读最新整合说明；旧提案仅作背景 |
| `COWORK_PROMPT.txt` | 可直接粘贴给 Cowork agent 的中文任务指令 | 用户无需重新描述历史需求 |

## 两个快速示范路径

- 缺料：我有目标 → 半小时 → 美食 → 扭一个 → 取消「皮蛋」→ 帮我找替代方法 → 打开「无皮蛋版肉酱拌面」→ 确认新材料与效果变化 → 用这个方案 → 就它，开玩！
- 打卡：我有目标 → 阅读 → 开玩 → 体验已完成！→ 动画弹窗 → 灵感记录 → 添加照片 / 写字 → 存起来 → 我的日记。

## 检查包是否完整

执行 `node tools/verify-package.mjs`。应全部通过。哈希清单记录的是交付时文件；开发后变化属于正常，不要为了“通过哈希”删除自己的改动。

要运行交互测试：`npm install` → `npx playwright install chromium` → 在另一个终端保持 `npm start` → `npm run qa`。离线直接运行网页不需要这些测试依赖。测试依赖要求 Node >= 20.9，建议 Node 24；本次验证使用 Node 24、Windows Chrome。其他系统的字体和 emoji 可能不同，不能承诺跨系统逐像素一致。

原帖完整视频、正文、真实链接和真实用户日记不在本包中。缺料查询按用户要求是 **假的 Demo 实例**，不联网。
