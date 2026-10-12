# 06 · 迁移路线与边界

## 最少改动路线（优先）

1. 把 `dist/` 当完整静态前端，先用 Node 服务器打开基准。
2. 在 Cowork 支持的项目中复制 dist 文件结构，保留相对路径、四个 defer script 顺序：data → content → alternatives-demo → app。
3. 静态服务器把 dist 设为根目录，默认 index.html。若平台需要自己的入口 / 配置，按平台实际支持方式设置，不携带旧站身份。
4. 先恢复完整交互和浏览器存储，再考虑技术栈重构。无需云端 API 才能体验本 Demo。

本包没有验证或猜测小红书 Cowork 的最新项目模板、构建 / 上传规则、对 IndexedDB / canvas / dialog 的运行限制。这里给出的是平台无关源码和验收契约，不是声称能一键上传成功的专用导入格式。接手 agent 应在目标环境实际运行验证。

## 若必须移植技术栈

保持页面 / 状态边界和数据模式，参照 manifests JSON，但逻辑以 app.js 为准：抽取过滤、局部搜索、轮内去重、材料方案、安全来源 URL、单次完成、草稿离开守卫、照片压缩、上海时间月历。可拆成 Home、Config、PaperTicket、MaterialAdaptation、SourceDialog、PlayGuide、CompletionDialog、Notebook、Calendar、Timeline，先行为一致后结构优化。

不要把 `collection.json` 内源图路径从 assets/... 改到错误 origin。如果调用不同的组件资源路径，需一起修改 source 快照 / source 弹层的路径解析。已保存条目可能包含旧 cover 与 crop，迁移老数据时要兼容，而不是丢弃。

## 用户日记并不在代码包里

IndexedDB 与 localStorage 绑定 origin。新平台域名和新浏览器是新的数据库空间。源码包不会自动带走旧记录；本次也没有读取用户真实日记、链接绑定和登录状态。如果用户随后要求迁移，先在原浏览器获授权导出，再校验字段 / 版本 / 照片，提供导入预览与去重，绝不批量重新打卡或改变完成日期。

## 完整复刻的实际范围

- 确保当前已有 UI 与功能的代码、生产资源、导出切图、文案数据、可移植测试和当前基准截图都在包中。
- 不承诺另一个系统的商业字体 / emoji 逐像素相同；无权限打包其字库。提供合法备用字体但明确差异。
- 不承诺拥有未提供的原帖内容或真实链接；保留用户关联来源的能力。
- 不把假的缺料实例升级成联网搜索，除非用户新指令授权。
- 不把未来功能提案当现有功能。`docs/original-notes/` 中两份内容审计 / 假方案说明作背景，产品场景扩展仅备选。

## 安全和隐私

无 .git、.openai、.env、部署凭据、cookie、用户真实数据库、node_modules 或浏览器二进制。文档保留源 commit 用于核对原版本；新平台不能沿用旧项目身份。源码有原站来源 URL 的校验，用户输入统一转义；这些不能因 Demo 简单就去掉。

## 文件追溯

基准源 commit：`b7c8e4c827dd58fc65d3417dfecb9a3985b5b2f0`。迁移时基准仓库 clean，28 个 dist 原始文件按 SHA-256 验证一致。参考截图本次从迁移副本重新生成，非仅拷贝旧参考稿。Noto 字体固定下载 commit 和哈希见 fonts.json。可通过 tools/verify-package.mjs 检查交付全包，后续开发改动需自行记录。
