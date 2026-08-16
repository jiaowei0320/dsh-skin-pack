# dsh-skin-pack

DeepSeek Harness Web GUI 的皮肤包 + 账户余额显示：

**皮肤** — 向内置主题系统注册 4 套第三方皮肤，并在 **设置 → 通用** 里加一个皮肤选择行。

- 赛博朋克紫 `cyberpunk`（暗色底 · 霓虹紫）
- 霓虹脉冲 `neon-pulse`（暗色底 · 霓虹青）
- 迈阿密日落 `miami-sunset`（亮色底 · 热粉/橙）
- 天空蓝 `sky-blue`（深色侧边栏 + 天蓝聊天区 + 白色内容，取自参考图 20260816-192251）

**余额** — 在侧边栏底部（设置按钮上方）显示 `充值余额 ¥xx.xx`，
悬停可看总余额 / 充值 / 赠送拆解，每 60 秒刷新一次；侧边栏收起时显示圆形 ¥ 按钮。

**近 7 天用量** — 余额旁边显示 `近7天 xx.xx M`（token 消耗总量，M = 百万）。
数据来自 DSH 本地会话日志（`assistant/message` 事件的 `usage`，与 token 计费同源），
**无需任何额外凭证**；会话日志不可用时该段自动隐藏。

**零产品改动** — 余额通过现有 `sidebar.footer.action` 槽位挂载，用量通过
`ctx.sessionPersistence` 服务读取，不修改任何产品源码，产品升级不会覆盖，
可打包分享给其他 DSH 用户。

## 它是什么（30 秒架构课）

DSH 的插件 = 一个导出 `apply(ctx)` 的模块，分两个半边：

| 半边 | 跑在哪里 | 干什么 |
| --- | --- | --- |
| host（`src/index.ts`） | Node 进程 | 注册 `GET /api/dsh-account/balance` 路由：用托管 API key 代理 DeepSeek `GET /user/balance`（30s 缓存，**key 永不进浏览器**） |
| client（`src/client/index.tsx`） | 浏览器页面 | 注册皮肤 + 设置行 + 余额徽章（`sidebar.footer.action` 槽位，60s 轮询） |

换皮的本质是覆盖主题 token：DSH 内置 `light`/`dark` 基底色板 + 一层 `--dsw-alias-*`
别名 token。本插件的 client half 调用 `ctx.theme.register({ id, colorScheme, tokens })`
注册皮肤；**DOM 呈现器在 ui-layout 里，插件不碰任何 DOM**。浏览器端通过
`window.__ModuleLoader__.load({ id, factory })` 协议加载 client bundle（见 `build.mjs`）。

## 目录

```
dsh_plugin/
├── package.json            # dsh.bundle（patch 层）+ dsh.client（浏览器条目）
├── cordis.patch.yml        # 插入一行插件
├── build.mjs               # esbuild：host ESM + client 闭包工厂产物
├── tsconfig.json           # 类型检查（strict）
├── scripts/
│   ├── link-deps.mjs       # 开发脚手架：符号链接 harness 的 workspace 包
│   └── smoke-client.mjs    # 无浏览器冒烟：host 余额路由 + client 注册/取数逻辑
├── src/
│   ├── index.ts            # host half（余额代理路由）
│   └── client/index.tsx    # client half（皮肤 + 设置行 + 余额徽章）
└── docs/M0-dynamic-skin-demo.md   # 路径 A：动态插件 demo（先理解机制）
```

## 构建与自测

```sh
# 一次性：把 deepseek-harness 的 workspace 包链接进 node_modules（不装任何东西）
node scripts/link-deps.mjs

# 构建 + 类型检查 + 冒烟
pnpm run build        # esbuild → lib/index.js + lib/client.js；tsc 产出 lib/types
pnpm run typecheck
pnpm run smoke        # 16 项断言：余额路由/规范化、注册/恢复/持久化/卸载
```

## 加载到 GUI

把包加进你的 `web` profile（等价于 `pnpm add` + 往 bundles 追加一层）：

```sh
cd /Users/william/Documents/deepseek-harness
pnpm dsh plugin --profile web add /Users/william/Documents/dsh_plugin
```

然后**重启** GUI（杀掉当前 3080 实例，重新 `pnpm dsh web`）。启动日志应出现：

```
[dsh-skin-pack] host half loaded (skins run in the browser)
```

**余额显示需要 API key**（和聊天走同一个 key）：如果 GUI 的 Models 页面已配置
DeepSeek 凭证（`DEEPSEEK_API_KEY`），或启动环境里导出了 `DEEPSEEK_API_KEY`，
无需额外操作；否则设置里配置后刷新页面即可。

打开 **设置 → 通用**：在"外观"行下面会出现"皮肤（dsh-skin-pack）"行，
三个按钮即点即换；选择会记住（localStorage），重启后恢复。侧边栏底部
（设置按钮上方）出现 `充值余额 ¥xx.xx`，侧边栏收起时显示圆形 ¥ 按钮。

## 设计取舍（为什么这样做）

1. **持久化用 localStorage，而不是 settings**：Host settings 协议的白名单里
   `ui-theme` 是产品自持的，第三方 namespace 默认答 `settings-not-exposed`。
   第三方的皮肤 id 也进不了内置偏好 schema（只认 `light`/`dark`/`system`）。
   所以选择存在 localStorage，并在用户切回内置主题时清掉，避免"死而复生"。
2. **设置行不新建页面，复用 `settings.general.item` 槽位**：和内置"外观"行同级
   （`order: 20` 排在它后面），零导航成本。
3. **余额走 host 代理路由，而不是浏览器直连 DeepSeek**：API key 不能进浏览器
   （CORS + 泄露风险）。host 用与 `dsh-llm-deepseek` 完全相同的 key 读取方式
   （凭证服务 → 环境变量）和 baseURL 处理（`$DEEPSEEK_BASE_URL`），30s 缓存防抖。
4. **余额徽章挂 `sidebar.footer.action` 槽位**（设置按钮上方，order 10）：
   账户余额是全局信息，常驻侧边栏底部最自然，且完全不碰聊天区。**零产品改动**——
   不修改任何产品源码，产品升级不会覆盖，`pnpm pack` 后即可分享给其他用户。
   两种形态：wide 显示文字行（仿设置触发行 34px 节奏），rail 显示圆形 ¥ 按钮。
   `line-height` 必须带单位：React 数字 `lineHeight: 20` 会渲染成无单位的
   `line-height: 20`（= 字号的 20 倍），导致整行高度爆炸。
5. **client half 只 type-import `@deepseek-ai/*`**：跨插件协作走 cordis 服务
   （`ctx.theme` / `ctx.slots`），不共享值——这是仓库的 bundle purity 规则，
   本包用 esbuild 构建时同样遵守（产物里 `require()` 只有 react 平台模块）。

## 里程碑对照

- [x] **M0 动态 demo** — `docs/M0-dynamic-skin-demo.md`（overrideTokens 覆盖层）
- [x] **M1 静态 bundle** — 本包：注册 3 套皮肤 + 设置行 + 持久化
- [x] **M1.5 余额显示** — host 代理路由 + 侧边栏底部徽章（零产品改动）
- [ ] **M2** — 皮肤预览缩略图 / 每套皮肤更多 token（按钮态、markdown、滚动条）
- [ ] **M3** — 发布：`pnpm pack` 出 tarball，`dsh plugin add ./dsh-skin-pack-0.1.0.tgz` 安装

## 卸载

```sh
cd /Users/william/Documents/deepseek-harness
pnpm dsh plugin --profile web remove dsh-skin-pack
# 重启 GUI 即恢复原样
```
