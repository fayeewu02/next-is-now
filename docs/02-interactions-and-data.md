# 02 · 交互、状态和存储

## 抽取与搜索

`state.filters = {mode:'random'|'target', minutes:15|30|90|0, category:null|类目, custom:string}`。先以估算分钟数筛选（0 不筛时间），再按目标类目筛选。自填项用本批收藏标题 / 标签、意图词映射搜索；具体词优先于泛类目，听和阅读区分。没有远程请求。查询框最多 40 字符。

一轮不重复用 `seen: Map<JSON.stringify(filters), Set<itemId>>`，刷新失效。不合条件是 no-match；有合条件但看完是 exhausted，可重新装一轮。扭蛋进行中避免重复点击，改变路线后丢弃过期动画结果。

## 材料 / 假推荐

`needsChecklist` 仅判断手工、美食。原始材料 `{id,label,optional}`；missing 是取消勾选的 ID 集合。

- 缺可选装饰：可省略，不阻止开玩。
- 缺必需材料：原方案不能开始，显示“帮我找替代方法”。
- 模拟查找有加载状态，700ms（减少动画 100ms），明显“未联网搜索”。以 itemId + 缺料组合匹配 8 条预设。
- 每条方案的 handles 必须覆盖全部缺失必需项，不能只解决其中一个；无实例明确空态。
- 模拟帖说明新效果 / 清单 / 新增材料 / 时长 / 步骤。必须勾选“我已确认新方案的材料，并接受效果变化”才能采用，关闭不改变原方案。
- 接受后 `state.demoPlan` 存新方案，标题 / 简介 / 材料 / 步骤 / 时间同步更新；清单展示已确认静态项。可重新选择或恢复原方案。
- 时间超过预算阻止开玩，只能用户主动扩时或换方案。缺料结果由 token + materialKey 防止旧请求覆盖新条件。

完整 8 条预设在 `manifests/demo-alternatives.json`。原代码构建逻辑在 `dist/alternatives-demo.js`；JSON 不能替代构建逻辑。并非每种手工、美食和任意缺料组合都有实例。

## 日记数据

数据库 `next-is-now-demo`，版本 1；object store `entries`；keyPath `id`。每条已开启记录保存当时选中的方案快照，不从后来改变的收藏数据重新推导。

```text
Entry
  id: UUID/string
  itemId: saved-01 ... saved-21
  title, category, activity, durationLabel: string
  minutes: number
  materials: [{id,label,optional}]
  steps: string[]
  source: 完整收藏快照（含 cover/crop/author/guide）
  adaptation: original | omit | demo-adapted（兼容旧 adapted）
  demoAlternative?: 采用的模拟方案完整快照
  createdAt: epoch milliseconds
  completedAt?: epoch milliseconds
  completionMethod?: explicit | record
  updatedAt?: epoch milliseconds
  text: string
  photos: [{id,data:"data:image/webp;base64,...",name}]
```

原帖关联单独放 `localStorage['next-now-source-links']`，JSON 对象 itemId → URL。源链接校验允许 http/https 的 xiaohongshu.com / xhslink.com 及子域，升级 HTTPS，禁止 URL 凭据、非允许端口、其他域名和脚本协议。打开新页 `noopener noreferrer`。

开玩 `begin` 只创建一条已开启记录，防双击；完成 `markCompleted` 只写一次有效 completedAt（有限正数），补图文不重定日期。`completionMethod=explicit` 代表点击完成；`record` 代表直接打开旧未完成记录进入编辑时自动完成。源快照和模拟替代快照在刷新 / 补记录后仍存在。

## 完成弹层与编辑器

完成后仍在 start。完成按钮禁用，记录按钮出现；模态弹窗用纯红花开动画。「灵感记录」进 editor；「我再想想」、×、Escape 关闭弹窗，保持已完成。不可以回到可再次打卡的状态。

`state.draft` 为独立拷贝。最多 5 张，JPEG/PNG/WebP，单张输入最多 20MB；canvas 压缩最长边 1200、WebP quality .85，本地存储。读取时显示进度，满 5 张后同一个上传按钮禁用；移除恢复。文字以 `Array.from(text).length` 计算 Unicode 字符，超过 300 禁止保存，不以 UTF-16 code unit 限制。

未保存图文离开弹窗：继续写 / 不保存离开 / 存好再离开；浏览器关闭 / 刷新有 beforeunload 提示。“我再想想”不撤销已经保存的完成状态。删除记录需要确认；删除也会移除该记录对月历的贡献。

存储失败不假称已永久保存：界面显示暂存提示；页面内可继续，刷新可能丢失。

## 日历 / 时间轴

北京时间 `Asia/Shanghai` civil date，周一开头，按年月实际天数补空格，支持闰年 / 跨年。today 是动态真实日期，不是截图中固定年月。

事件时间为 completedAt（完成）否则 createdAt（已开启）。月历完成亮花，已开启灰点；同天多完成一朵花，aria-label 数量仍准确。选中日期 / 今天与完成颜色分别处理，花在数字下方不重叠。

时间轴按事件时间降序分组。上传照片才生成左侧缩略图 +N；纯文字记录没有假照片。点击记录编辑；旧无 completedAt 记录不在加载时批量完成。

## 移植注意

所有保存是当前浏览器当前 origin 的本地数据，不是源码中的数据。换 Cowork 域名或端口后不会自动继承原浏览器日记。本包未提取用户数据；若用户需要搬迁，再单独征得授权做导出 / 导入。数据库 key / 来源 URL / 用户输入必须保持转义，不能把用户文本当 HTML 注入。
