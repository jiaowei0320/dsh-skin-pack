# M0 · 动态插件 demo（先理解机制，不改任何文件）

路径 A 的目标：**在 GUI 会话里现场定义一个"赛博朋克紫"皮肤覆盖层**，点一下授权，
整个页面立刻换皮。零构建、零文件、零重启——这是最快理解"插件 = 注册进 ctx 的能力"的方式。

> 动态插件由**运行在 DSH 里的 agent**（带 `cordis_*` 工具的会话）用
> `cordis_inspect_list` / `cordis_inspect_query` / `cordis_define` / `cordis_run`
> 等工具定义并激活。当前这个编码会话没有这些工具，所以这里的代码是**交付给你去跑**的：
> 在 GUI 里开一个带 Cordis 工具的会话（或让当前会话的模型加载 `cordis-plugin-development`
> skill），把下面的步骤和代码交给它。

## 为什么动态版只能"覆盖 token"？

动态 client 包跑在一个受限的 guard 门面里。主题座位只放行 `theme.overrideTokens(...)`：

- `source` 参数会被**强制替换**成你的包 id（`pluginId.packageId`），你无法冒充或顶掉别人的覆盖层；
- 返回的 disposer 会自动挂到 fiber 上（卸载即恢复）；
- `theme.register` / `theme.setTheme` 等其它方法被 guard 挡住，拿不到返回值。

所以动态版 = **即时生效的 token 覆盖层**；而"注册成可选的皮肤 + 设置页选择"必须走
静态 bundle（M1，`../` 这个包就是）。两者恰好互补：先感受效果，再做成产品。

## 步骤

1. **列目录**：`cordis_inspect_list`，找到 `Theme` 提供方（Client 平台）。
2. **查 token**：`cordis_inspect_query` 调 `Theme.listTokens`（只读，不改主题），
   再查 `{ "service": "theme" }` 拿到 `ThemeRuntime` 的方法签名。
3. **定义包**：`cordis_define`，`kind: "new"`，语义前缀（3–6 位小写字母，如 `skn`），
   只给 `code.client`，代码见下。
4. **运行**：`cordis_run`（`mode: "run"`）。返回 `awaiting-approval` 或 `starting` 后
   **结束当前轮次**，等浏览器里的授权卡片出现——单勾只授权这个包，双勾连未来版本一起授权。
5. **看效果**：授权后整个页面瞬间变成赛博朋克紫（`theme/change` → ui-layout 呈现器应用 token）。
6. **收掉**：`cordis_stop <pluginId>` 暂停（保留版本指针）；不需要了再 `cordis_undefine`。

## code.client（纯 JS，无 import、无 JSX）

```js
return {
  name: 'cyberpunk-overlay-demo',
  inject: ['theme'],
  apply(ctx) {
    // overrideTokens 要求每个 token 都给出 { light, dark } 双值：
    // 用户切到哪个配色方案都不会缺值。暗色皮肤两个值给同一套即可。
    const tokens = {
      '--dsw-alias-bg-base': { light: '#0d0618', dark: '#0d0618' },
      '--dsw-alias-bg-layer-1': { light: '#17102a', dark: '#17102a' },
      '--dsw-alias-bg-layer-2': { light: '#1f1636', dark: '#1f1636' },
      '--dsw-alias-bg-overlay': { light: '#251a3d', dark: '#251a3d' },
      '--dsw-alias-border-l1': { light: '#3a2a5c', dark: '#3a2a5c' },
      '--dsw-alias-border-l2': { light: '#543a8a', dark: '#543a8a' },
      '--dsw-alias-brand-primary': { light: '#b44dff', dark: '#b44dff' },
      '--dsw-alias-label-primary': { light: '#f2ecff', dark: '#f2ecff' },
      '--dsw-alias-label-secondary': { light: '#b3a3d6', dark: '#b3a3d6' },
      '--dsw-alias-state-error-primary': { light: '#ff4d6d', dark: '#ff4d6d' },
      '--dsw-alias-state-success-primary': { light: '#2ee6a8', dark: '#2ee6a8' },
      '--dsw-alias-state-warn-primary': { light: '#ffb84d', dark: '#ffb84d' },
      '--dsw-specific-sidebar-fill': { light: '#120a20', dark: '#120a20' },
    }
    // source 会被 guard 替换成你的包 id；disposer 自动挂到 fiber，卸载即恢复。
    const dispose = ctx.theme.overrideTokens('cyberpunk-demo', tokens)
    ctx.effect(() => dispose)
  },
}
```

改配色就是改这张 token 表。token 全量清单（100+ 个 `--dsw-alias-*`）在
`deepseek-harness/packages/client/ui-theme/src/styles/design-platform.css`，
核心 14 个可见于 `Theme.listTokens`。

## 常见失败

| 现象 | 原因 / 修法 |
| --- | --- |
| 报 `bare string` / `must map to a { light, dark } pair` | token 值写成了字符串，改成双值对象 |
| `cannot get property "theme" without inject` | 返回的插件对象没写 `inject: ['theme']` |
| 一直 `awaiting-approval` | 结束当前轮次，等浏览器授权卡片，别在同一轮里干等 |
| 效果没出现 | 查 `client-render` 诊断；修复要 `cordis_define` 新 Package 再 `cordis_run`，不要覆盖失败的包 |

## 到这里你已经懂了

- 插件 = 一段注册进 `ctx` 的代码；client 插件在浏览器里跑，主题是纯浏览器侧能力；
- token 层覆盖 = 换皮的原子操作；`theme/change` 事件 + 呈现器负责把 token 变成视觉效果；
- 动态包有 guard 边界（这正是"平台安全"的体现）。

下一步：M1——把这个包做成**静态 bundle**（`../` 目录里的 `dsh-skin-pack`），
注册成可选皮肤、加设置页选择、可安装分发。
