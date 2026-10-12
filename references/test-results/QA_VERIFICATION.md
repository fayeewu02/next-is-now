# 本次原样迁移验证

2026-10-12，在迁移副本上运行 tests/qa.mjs，六组均退出成功。

- qa-assets：passed=true，21 张源图，browserErrors=[]。
- qa-calendar：passed=true，上海日界线、闰年、聚合、编辑不重定、旧记录、照片 / 纯文字、删除通过。
- qa-home：passed=true，320/360/390/430/768/1440 布局及高度差异通过。
- qa-paper：passed=true，源链接安全、纸签 / 开玩 / 日记、照片 / 字数限制与持久化通过。
- qa-checkin：passed=true，完整选框、完成弹窗 / 后续状态、照片按钮、纯红花与 reduced-motion 通过。
- qa-alternatives：passed=true，确认与超时护栏、替代快照、无实例、过期查询通过，externalRequests=[]。

分组 JSON 报告和截图由测试直接生成后复制到 references。qa-assets 的结果输出到 stdout，本说明记录其实际成功输出；其截图在 screenshots/assets。原生产文件字节一致性单独按 canonical.sha256.json 核验。备用字体版的烟测另见 portable-font-smoke.json，不代替原版完整回归。

环境：Windows，本机 Chrome，Node 24.19.0，Playwright 1.62.1，Sharp 0.35.5；独立浏览器上下文，未读取真实用户浏览器数据库。
