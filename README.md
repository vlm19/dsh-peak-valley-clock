# dsh-peak-valley-clock

[![dsh-plugin](https://img.shields.io/badge/dsh--plugin-orange)](https://github.com/topics/dsh-plugin)

> 中文文档 | [English documentation](#english-documentation)

---

## 中文文档

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 开发的**峰谷计费提醒插件**。
它在非侵入式的 `shell.overlay` 区域显示一个汉字徽章——**峰**(高峰)或 **谷**(低谷),并按档位配色。
点击徽章播放一段约 6 秒、带声音的短视频;徽章会静默预加载视频缓冲,因此点击即可瞬时播放。

```
峰  ── 高峰时段   (09:00–12:00, 14:00–18:00 Asia/Shanghai, 依 DeepSeek 2026-08-17 政策)
谷  ── 低谷时段   (其余时间;约为高峰价格的 50%)
```

- 启动时**只显示徽章**——不自动播放视频,不打扰。
- 运行中跨越峰/谷边界时,**仅切换汉字与配色**,不会重播视频(除非你点击)。
- 悬停徽章可查看卡片:下一次边界时间、各模型单价。
- 拖动徽章到任意角落;角落、声音、"今日隐藏"等选择持久化在 `localStorage`。

> **关于"透明背景"。** 内置的 `feng.mp4` / `gu.mp4` 是由**网上的 AI 照片生成的影像**(非真人、非实拍),且背景不透明(不是绿幕),因此弹层采用圆角 + 毛玻璃面板,而非真正的透明视频背景。见*已知限制*。

### 环境要求

- **Node.js** `^22.19 || >=24`(与 DeepSeek Harness 一致)。
- **DeepSeek Harness**——目前*尚未发布到 npm*(pre-1.0,`private: true`)。插件依赖 harness 内部包
  (`@deepseek-ai/dsh-*`、`@deepseek-ai/cordis`),因此需**在 harness 工作区内安装与构建**,不能单独 `npm install`。

### 安装(在 DeepSeek Harness 工作区内)

这是目前受支持的路径。

1. 克隆 DeepSeek Harness 与本仓库。
2. 把本包复制(或作为 git submodule)进 harness 工作区,例如放到
   `packages/community/dsh-peak-valley-clock`(匹配 `packages/*/*` 工作区通配)。
3. 在 harness 根目录执行:

   ```sh
   pnpm install
   pnpm run build:lib:client        # 构建所有 client 包,含本包
   ```

4. 用示例 overlay 挂载插件并启动:

   ```sh
   pnpm dsh --profile web --patch dsh-peak-valley-clock/example/cordis.yml
   # 或若复制到 packages/community 下:
   pnpm dsh --profile web --patch packages/community/dsh-peak-valley-clock/example/cordis.yml
   ```

harness 的 web 模块会加载 `/plugins/dsh-peak-valley-clock/client.js`,插件的 node half 会注册
`/plugins/dsh-peak-valley-clock/assets/*` 来伺服视频。

### 配置

示例 `cordis.yml` 以默认值挂载插件。如需覆盖,在插件条目下传入 config(cordis 配置形态):

| 键              | 默认值             | 含义                                                                  |
| --------------- | ------------------ | --------------------------------------------------------------------- |
| `schedule`      | DeepSeek 2026-08-17 | `TariffSchedule`(时区 + 高峰窗口 + 价格)。                          |
| `videoPeak`     | `feng.mp4`         | 高峰视频的资源路径/URL。绝对路径、`/`-根路径,或相对于 `/plugins/<pkg>/assets/` 的相对路径。 |
| `videoOffpeak`  | `gu.mp4`           | 同上,低谷视频。                                                      |
| `corner`        | `bottom-right`     | 初始角落:`top-left` / `top-right` / `bottom-left` / `bottom-right`。 |
| `defaultSound`  | `true`             | 点击播放的视频是否默认带声。                                        |

### 替换视频

`assets/feng.mp4` 与 `assets/gu.mp4` 是**AI 生成的占位视频**。要用自己的素材:

- 直接替换 `assets/` 下的两个文件,**或**
- 把 `videoPeak` / `videoOffpeak` 指向你自己的 URL(绝对 `https://…` 或由 harness 主机伺服的 `/`-根路径)。

**再分发权由你负责。** 内置视频*不*受 MIT 许可覆盖(见 `LICENSE`)。在保留它们的 fork 发布前,
请确认你有权再分发这两个具体文件,否则删除它们并在文档中说明使用者需自备素材。

### 开发

```sh
pnpm typecheck     # 对 src/ 做 tsc 类型检查(需工作区内的 harness 类型)
pnpm test          # vitest —— 纯峰谷逻辑,无需 harness 运行时
pnpm build         # tsdown 打包 -> lib/{index,invariant,client}.js
```

> 这些命令需在 harness 工作区内运行;包的 devDependencies 会在那里解析到 harness 的 `@deepseek-ai/*` 包。

### 已知限制

- **Harness 处于 pre-1.0。** 暂不接受外部 PR,可能做出破坏性变更。本插件依赖内部 API
  (`shell.overlay` 槽、`slots.inject`、主机 `webServer` 路由)。请固定一个已知可用的 harness commit,
  并在升级时准备相应调整。
- **无真正的透明视频。** MP4/H.264 无 alpha 通道;弹层是圆角毛玻璃面板,而非透穿视频。
- **时段默认硬编码为 DeepSeek 2026-08-17 政策。** 改 `src/tariff.ts` 的 `DEFAULT_SCHEDULE`
  (或传入 `schedule` 配置)可适配其他服务商/时区。
- **构建必须在 harness 工作区内进行**,直到 DeepSeek Harness 发布到 npm。在本包 `npm publish` 前,
  需先把 `package.json` 里的 `workspace:^` 范围替换为已发布的 harness 版本。

### 许可证

代码:[MIT](LICENSE)。内置视频素材:见 `LICENSE` 中的说明——其条款与代码许可分离。

请给本仓库添加 **`dsh-plugin`** 话题,以便在插件生态中被检索到。

---

<a id="english-documentation"></a>

## English documentation

Peak/valley tariff reminder plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
It shows a single Chinese-character badge — **峰** (peak) or **谷** (off-peak) — in the
non-intrusive `shell.overlay` area, color-coded by tier. Clicking the badge plays a short
(≈6s) video with sound; the badge silently preloads the video buffer so playback is instant.

```
峰  ── peak hours   (09:00–12:00, 14:00–18:00 Asia/Shanghai, per DeepSeek 2026-08-17 policy)
谷  ── off-peak       (everything else; ~50% of peak price)
```

- Only a badge is visible at startup — no video autoplay, no interruption.
- Crossing a peak/off-peak boundary while running only swaps the glyph + color; it does **not**
  replay the video unless you click.
- Hover the badge for a card with the next boundary time and per-model prices.
- Drag the badge to any corner; your corner, sound, and "hide for today" choices persist in
  `localStorage`.

> **Note on transparency.** The bundled `feng.mp4` / `gu.mp4` are **AI-generated clips derived from
> online AI photos (no real-person likeness)**, with opaque (non-green-screen) backgrounds, so the
> popover uses a rounded glass-blur panel rather than a true transparent background. See *Known
> limitations*.

### Requirements

- **Node.js** `^22.19 || >=24` (matches DeepSeek Harness).
- **DeepSeek Harness** — *currently unpublished on npm* (pre-1.0, `private: true`). The plugin
  depends on harness-internal packages (`@deepseek-ai/dsh-*`, `@deepseek-ai/cordis`), so it is
  **installed and built inside a harness workspace**, not as a standalone `npm install`.

### Install (inside a DeepSeek Harness workspace)

This is the supported path today.

1. Clone DeepSeek Harness and this repo.
2. Copy (or git-submodule) this package into the harness workspace, e.g. under
   `packages/community/dsh-peak-valley-clock` (matches the `packages/*/*` workspace glob).
3. From the harness root:

   ```sh
   pnpm install
   pnpm run build:lib:client        # builds every client package, including this one
   ```

4. Mount the plugin with the example overlay and launch:

   ```sh
   pnpm dsh --profile web --patch dsh-peak-valley-clock/example/cordis.yml
   # or, if copied under packages/community:
   pnpm dsh --profile web --patch packages/community/dsh-peak-valley-clock/example/cordis.yml
   ```

The harness's web module loads `/plugins/dsh-peak-valley-clock/client.js`, and the plugin's
node half registers `/plugins/dsh-peak-valley-clock/assets/*` to serve the videos.

### Configuration

The example `cordis.yml` mounts the plugin with defaults. To override, pass config under the
plugin entry (cordis config shape):

| Key            | Default      | Meaning                                                        |
| -------------- | ------------ | ------------------------------------------------------------- |
| `schedule`     | DeepSeek 2026-08-17 | `TariffSchedule` (timezone + peak windows + prices).     |
| `videoPeak`    | `feng.mp4`   | Asset path/URL for the peak clip. Absolute, `/`-rooted, or relative to `/plugins/<pkg>/assets/`. |
| `videoOffpeak` | `gu.mp4`     | Same, for the off-peak clip.                                  |
| `corner`       | `bottom-right` | Initial corner: `top-left` / `top-right` / `bottom-left` / `bottom-right`. |
| `defaultSound` | `true`       | Whether the click-to-play video starts with sound on.        |

### Swapping the videos

`assets/feng.mp4` and `assets/gu.mp4` are **AI-generated clips** (derived from online AI photos,
no real-person likeness) used as placeholders. To use your own:

- Replace the two files in `assets/`, **or**
- Point `videoPeak` / `videoOffpeak` at your own URLs (absolute `https://…` or `/`-rooted paths
  served by your harness host).

**Redistribution rights are your responsibility.** The bundled videos are *not* covered by the
MIT license (see `LICENSE`). Before publishing a fork that keeps them, confirm you may
redistribute those specific files, or delete them and document that consumers must supply their
own.

### Develop

```sh
pnpm typecheck     # tsc over src/ (needs harness types in the workspace)
pnpm test          # vitest — pure tariff logic, no harness runtime required
pnpm build         # tsdown bundle -> lib/{index,invariant,client}.js
```

> Run these from inside a harness workspace; the package's dev dependencies resolve to the
> harness's `@deepseek-ai/*` packages there.

### Known limitations

- **Harness is pre-1.0.** It does not accept external PRs yet and may make breaking changes.
  This plugin relies on internal APIs (`shell.overlay` slot, `slots.inject`, host `webServer`
  route). Pin a known-good harness commit and expect to adjust on harness upgrades.
- **No true transparent video.** MP4/H.264 has no alpha channel; the popover is a rounded
  glass-blur panel, not a see-through video.
- **Schedule is hardcoded to DeepSeek's 2026-08-17 policy** by default. Edit `DEFAULT_SCHEDULE`
  in `src/tariff.ts` (or pass `schedule` config) for other providers/zones.
- **Build must run inside a harness workspace** until DeepSeek Harness is published to npm.
  Before any `npm publish` of this package, replace the `workspace:^` ranges in `package.json`
  with the published harness versions.

### License

Code: [MIT](LICENSE). Bundled video assets: see the note in `LICENSE` — their terms are
separate from the code license.

Add the **`dsh-plugin`** topic to this repository so it shows up in the plugin ecosystem.
