# dsh-peak-valley-clock

[![dsh-plugin](https://img.shields.io/badge/dsh--plugin-orange)](https://github.com/topics/dsh-plugin)

Peak/valley tariff reminder plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
It shows a single Chinese character badge — **峰** (peak) or **谷** (off-peak) — in the
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

> **Note on transparency.** The bundled `feng.mp4` / `gu.mp4` are real photographic clips, not
> green-screen, so the popover uses a rounded glass-blur panel rather than a true transparent
> background. See *Known limitations*.

## Requirements

- **Node.js** `^22.19 || >=24` (matches DeepSeek Harness).
- **DeepSeek Harness** — *currently unpublished on npm* (pre-1.0, `private: true`). The plugin
  depends on harness-internal packages (`@deepseek-ai/dsh-*`, `@deepseek-ai/cordis`), so it is
  **installed and built inside a harness workspace**, not as a standalone `npm install`.

## Install (inside a DeepSeek Harness workspace)

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

## Configuration

The example `cordis.yml` mounts the plugin with defaults. To override, pass config under the
plugin entry (cordis config shape):

| Key            | Default      | Meaning                                                        |
| -------------- | ------------ | ------------------------------------------------------------- |
| `schedule`     | DeepSeek 2026-08-17 | `TariffSchedule` (timezone + peak windows + prices).     |
| `videoPeak`    | `feng.mp4`   | Asset path/URL for the peak clip. Absolute, `/`-rooted, or relative to `/plugins/<pkg>/assets/`. |
| `videoOffpeak` | `gu.mp4`     | Same, for the off-peak clip.                                  |
| `corner`       | `bottom-right` | Initial corner: `top-left` / `top-right` / `bottom-left` / `bottom-right`. |
| `defaultSound` | `true`       | Whether the click-to-play video starts with sound on.        |

## Swapping the videos

`assets/feng.mp4` and `assets/gu.mp4` are **AI-generated clips** used as placeholders. To use
your own:

- Replace the two files in `assets/`, **or**
- Point `videoPeak` / `videoOffpeak` at your own URLs (absolute `https://…` or `/`-rooted paths
  served by your harness host).

**Redistribution rights are your responsibility.** The bundled videos are *not* covered by the
MIT license (see `LICENSE`). Before publishing a fork that keeps them, confirm you may
redistribute those specific files, or delete them and document that consumers must supply their
own.

## Develop

```sh
pnpm typecheck     # tsc over src/ (needs harness types in the workspace)
pnpm test          # vitest — pure tariff logic, no harness runtime required
pnpm build         # tsdown bundle -> lib/{index,invariant,client}.js
```

> Run these from inside a harness workspace; the package's dev dependencies resolve to the
> harness's `@deepseek-ai/*` packages there.

## Known limitations

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

## License

Code: [MIT](LICENSE). Bundled video assets: see the note in `LICENSE` — their terms are
separate from the code license.

Add the **`dsh-plugin`** topic to this repository so it shows up in the plugin ecosystem.
