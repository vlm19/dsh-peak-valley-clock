# 峰谷时钟（Peak Valley Clock）— 产品设计 v3

> 插件包名：`dsh-peak-valley-clock`（示例 overlay：`example/cordis.yml`）
> 状态：设计稿 v3（启动零播放：只显徽章 + 静默预加载，点击才播透明视频），等待视频素材后进入实现
> 日期：2026-08-18

## 1. 一句话定位

Web 界面边角常驻一枚单字徽章——峰时是橙色的「峰」，谷时是青色的「谷」；点击徽章，一段 6 秒透明背景的动画在徽章旁浮现、带声播放一遍后淡出。让用户一眼感知"现在调用 DeepSeek 是全价还是半价"，播放纯 opt-in，其余时间零打扰。

## 2. 背景

DeepSeek API 自 2026-08-17 00:00 起实行峰谷分时计费（北京时间）：

| 时段 | 时间（北京时间） | 价格 |
|---|---|---|
| 高峰 | 09:00–12:00、14:00–18:00 | 全价 |
| 空闲 | 其余时间（00:00–9:00、12:00–14:00、18:00–24:00） | 高峰的 50% |

以 V4-Pro 为例：高峰输出 27 元/百万 tokens，空闲 13.5 元。对长时间挂机的 agent 会话（harness 的典型用法），一次错峰可能省一半费用，但用户没有任何直观提醒——这就是本插件的空白点。

## 3. 目标与非目标

**目标**
- 峰/谷状态常驻可见，理解成本为零（一个汉字 + 一种颜色）
- **启动零播放**：harness 启动后只显示徽章，视频仅静默预加载（`preload="auto"`，本机伺服近零延迟），点击时即刻起播
- 播放 = 用户主动行为：点击徽章才有视频与音频
- 透明背景动画：无"视频窗"矩形感，动画角色直接浮在界面上
- 峰谷边界（9:00/12:00/14:00/18:00）自动切换徽章字与色，不播视频
- 时段表与价格表可配置（官方已多次调价，写死必过期）
- 可一键隐藏 / 彻底关闭

**非目标**
- 不做费用统计（token-meter 的领域）
- 不做自动错峰调度 / 暂停会话（只提醒，不干预 agent）
- 不做任何形式的自动播放（无开场、无边界触发播放）
- 不追求 Safari 之外的透明兼容特判（dsh web 宿主为 Chrome/Edge 系；见 §9 降级）

## 4. 产品行为设计

### 4.1 视觉形态

**常驻形态（默认，约 48×48px）**：圆角方形单字徽章，居中一个汉字。

```
      ╭────╮
      │ 峰 │   峰：暖橙底（#B45309 系）+ 深色字
      ╰────╯   谷：青绿底（#0F766E 系）+ 浅色字
```

**点击播放**：点击徽章 → 徽章轻微弹动一下（~150ms scale 0.92→1）→ 透明背景动画在徽章旁浮现（scale 0.85→1 + 300ms 淡入）→ **带声**播放 6 秒 → 淡出收回（~300ms）。播放中点击动画或再点徽章 = 提前结束淡出。

**静默预加载**：插件装载后即以 `preload="auto"` 拉取当前时段视频（本机 webServer 路由，近零延迟）；峰谷切换时预加载目标也随切。点击起播无缓冲等待。

**声音**：点击即有声（主动行为不默认静音）；动画角落一枚小喇叭可静音，选择记忆（localStorage）。下次点击按记忆状态播放。

**动画布局**：透明动画锚定在徽章上方/侧方（依吸附角落自动选择朝向屏内一侧），不遮挡徽章；动画本体无背景、无边框、无衬底——元素直接"站"在界面上。兜底格式（不透明视频，见 §9）时加大圆角 + 柔和投影 + 半透明毛玻璃衬底，保持优雅。

### 4.2 交互总表

| 操作 | 行为 |
|---|---|
| harness 启动 | 只显示徽章 + 后台预加载视频，**零播放** |
| 悬停徽章 | 浮出信息卡（见 4.3），无动画放大 |
| 单击徽章 | 动画浮现、带声播放 6 秒、淡出收回 |
| 播放中点击动画/徽章 | 提前结束，淡出收回 |
| 动画角小喇叭 | 静音切换，记忆选择 |
| 拖拽徽章 | 自由拖动，松手吸附最近角落，位置记忆 |
| 峰谷边界 | 徽章字与色以 ~300ms 颜色渐变切换；不播视频、无脉冲、无 toast |
| 信息卡「今日不再显示」 | 隐藏至次日 00:00（本地时间） |
| 信息卡「关闭」 | 写入设置，等同 `enabled: false`，可在设置页重开 |

### 4.3 悬停信息卡

```
╭──────────────────────────╮
│ 高峰时段 · 剩余 47 分钟      │
│ V4-Pro 输出 27 元/百万tokens │
│ V4-Flash 输出 9 元/百万tokens│
│ 18:00 后进入空闲（半价）      │
╰──────────────────────────╯
```

徽章只回答"现在是什么时段"；促成错峰决策的信息（下次边界倒计时、价格差）放在 hover 信息卡，零打扰。运行时区 ≠ 计费时区时卡片双时区展示。

### 4.4 降级形态（视频缺失/不支持时）

任一时段视频缺失、加载失败或格式不支持：该时段点击徽章 = 徽章弹动一下 + 信息卡短暂强制显示 2 秒（代替视频告知时段详情），无报错弹窗，console warn 一次。徽章、信息卡、边界切字一切照常。

## 5. 不打扰原则（产品红线）

1. **启动即终态**：打开 harness 看到的就是产品的最终形态（徽章），之后没有任何主动动画
2. **播放纯 opt-in**：视频与音频只由用户点击触发；唯一的后台行为是静默预加载，无任何可感知副作用
3. **常驻即静态**：徽章无循环动画、无呼吸/脉冲效果
4. **零焦点**：无 autofocus、无 modal、无系统通知；click-through 层内仅徽章/动画矩形 opt-in 指针事件
5. **边界零打扰**：跨峰谷只做颜色渐变，不播视频、不加脉冲
6. **可退场**：两级退场（今日隐藏 / 永久关闭），设置页有总开关

## 6. 技术架构

### 6.1 包结构（双半插件）

```
dsh-peak-valley-clock/
  package.json          # dsh.client: { inject: [runtime, locale], platform: 'web' }
                       # exports["./client"] → lib/client.js
  src/
    index.ts           # node half：注册资产路由
    tariff.ts          # 纯函数：时段判定、下次边界、价格表（共享）
    client/
      index.ts         # browser half：slots.register('shell.overlay')
      slots.ts         # SlotMap 声明合并（无新 slot，仅注册既有 shell.overlay）
      Badge.tsx         # 单字徽章（常驻形态）
      Animation.tsx     # 透明动画播放（浮现/淡出、喇叭开关、朝向解算）
      HoverCard.tsx     # 悬停信息卡
      tariff-engine.ts  # 客户端时钟：对齐边界的 setTimeout 链 + visibilitychange 重校
      stores.ts         # 位置/声音/退场状态（localStorage 持久化）
      locales.ts        # 文案（zh/en）
  assets/
    peak.webm          # 高峰动画（VP9+alpha，用户提供，见 §8）
    offpeak.webm       # 空闲动画（同上）
```

### 6.2 各机制落点（均已核实存在）

| 需求 | 机制 | 参照 |
|---|---|---|
| 可视区间 | `shell.overlay` list slot（root scope；层本身 click-through，条目自行 opt-in 指针） | `packages/client/ui-layout/src/client/index.ts:83` |
| 浏览器半装载 | package.json `dsh.client` + `exports["./client"]`，经 `window.__DSH_BOOT__` 扫描 | `packages/client/ui-input-trigger` |
| 视频伺服 | node half：`ctx.webServer.register({ kind: 'prefix', path: '/plugins/<pkg>/assets', handler })`。webserver 最长前缀优先（`match()` longest-prefix-wins），`/plugins/<pkg>/assets` 压过 client-modules 的 `/plugins` 前缀 | `packages/host/webserver/src/index.ts:242`、`packages/client/modules/src/index.ts` |
| 峰谷判定 | 纯函数 + `Intl.DateTimeFormat` 按目标时区取小时分钟（避免手动 UTC 偏移、正确处理任意时区） | 新增 `tariff.ts` |
| 边界唤醒 | `setTimeout` 链对齐下一个边界，唤醒后重读墙钟（范式中断后重算）；上限 `2^31-1` 分段；`visibilitychange`/`focus` 时重校（休眠跨边界） | `packages/schedule/schedule/src/runtime.ts` |
| 持久化 | 用户偏好（位置/声音/退场）→ localStorage；时段表/价格表/资产路径 → 插件 Config（cordis 层，进 cordis.patch.yml 可覆盖） | settings 包模式 |

### 6.3 时钟与判定（核心纯函数，先行单测）

```ts
interface TariffWindow { start: 'HH:MM'; end: 'HH:MM'; tier: 'peak' | 'offpeak' }
interface TariffSchedule {
  timezone: string                 // 默认 'Asia/Shanghai'（计费时区）
  windows: TariffWindow[]          // 默认官方两段高峰；未覆盖时间 = offpeak
  prices: Record<modelId, { peak: Price; offpeak: Price }>
}
resolveTier(schedule, now: Date): { tier; nextBoundary: Date; msRemaining }
```

要点：
- 判定基于**计费时区**（默认北京时间）而非浏览器本地时区；信息卡同时显示两者（若不同）
- 窗口允许跨午夜（`start > end` 合法），默认表不跨但配置可跨
- 边界语义：`end` 为排他（09:00:00 整点即进入峰）
- 边界事件只驱动"切字切色 + 预加载目标切换"，与视频播放完全解耦

### 6.4 安装形态

```yaml
# example/cordis.yml — 对 web profile 的 overlay
- insert:
    - id: peak-valley-clock
      name: 'dsh-peak-valley-clock'
```

三种用法：`pnpm dsh --profile web --patch example/cordis.yml`（参见本仓库 example/）；加入 profile 的 bundle 列表；或 `pnpm dsh plugin --profile web add dsh-peak-valley-clock`。在工作区内安装需三处注册：① `tsconfig.client.json` 的 `references`（让 `tsc -b` 编译本包）；② `tsconfig.base.json` 的 `paths`（让 tsx 源码启动与 `verify-cordis-config` 解析到源码）；③ resolver manifest（`web-app`）的 `dependencies`（让运行时解析包名，`verify-cordis-config` 强制）。详见 README 的安装一节。

## 7. 配置项（schemastery Config）

| 键 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 总开关 |
| `timezone` | `'Asia/Shanghai'` | 计费时区 |
| `windows` | `[{09:00–12:00, peak}, {14:00–18:00, peak}]` | 高峰窗口表；其余为谷 |
| `prices` | 2026-08-17 官方价 | 各模型峰/谷价格表（悬停信息卡显示） |
| `videos.peak` | `'assets/peak.webm'` | 相对插件根或绝对路径或 https URL |
| `videos.offpeak` | `'assets/offpeak.webm'` | 同上 |
| `corner` | `'bottom-right'` | 初始角落（用户拖拽后由 localStorage 接管） |
| `defaultSound` | `true` | 点击播放的初始声音（用户切换后由 localStorage 接管） |

（v2 的 `introPlay` 已删除：v3 没有任何自动播放路径。）

## 8. 素材规格（需你提供）

**目标格式：WebM（VP9 + alpha 通道），6 秒。** MP4/H.264 不支持透明，不可作为透明素材的交付格式。

| 项 | 要求 | 原因 |
|---|---|---|
| 首选交付 | VP9+alpha 的 WebM，6.0 秒 | `<video>` 原生透明播放，Chrome/Edge 完美支持 |
| 简化交付（推荐） | **绿幕/纯色背景的普通 MP4，6 秒**，我来 ffmpeg `chromakey` 抠成 alpha WebM | 素材制作门槛最低；6 秒小视频转码质量损失可忽略 |
| 兜底交付 | 不透明 MP4/WebM | 退化为大圆角 + 投影 + 毛玻璃衬底窗（§4.1），依然优雅 |
| 画幅 | 任意（透明角色动画可为方形/竖幅），建议 ≤ 720p | 摆脱了"视频窗 16:9"假设，角色动画自由度更高 |
| 大小 | ≤ 8 MB（越小越好） | 本机伺服 + 预加载，影响很小，但保持轻量 |
| 音轨 | 可带（轻音效/一句旁白） | 点击有声播放是 v3 的默认行为 |
| 内容 | 峰段：暖色/上升/紧张感；谷段：冷色/舒缓/下降感 | 与徽章色系一致，认知统一 |
| 命名 | `peak` / `offpeak`（扩展名随格式） | 固定约定，落入 `assets/` |
| 交付方式 | 告知文件路径即可，我来转码/接入 | — |

## 9. 边界情况

| 情况 | 行为 |
|---|---|
| 视频缺失 / 解码失败 / 404 | §4.4：点击 = 徽章弹动 + 信息卡强显 2 秒；预加载静默失败 |
| 浏览器不支持 VP9 alpha（非 Chromium 宿主） | 检测 `canPlayType`，走兜底样式（圆角+投影+毛玻璃）；再不支持则同缺失降级 |
| 浏览器拦截有声自动播放 | 不适用：v3 无自动播放；用户手势（click）内起播符合 autoplay 政策，有声合法 |
| 播放中跨越峰谷边界 | 让当前动画自然播完淡出；徽章已切新字色；预加载目标已切新视频 |
| 系统休眠跨过边界 | `visibilitychange` + `focus` 时重读墙钟切字（不补播） |
| 用户时区 ≠ 计费时区 | 判定恒按计费时区；信息卡双时区展示 |
| 首帧已过边界的 setTimeout 漂移 | 唤醒后以 `Date.now()` 重算（schedule 包同款范式） |
| 播放中再次点击/连点 | 单一播放实例：重复点击 = 提前结束或忽略，不叠加动画 |
| 插件卸载 / 禁用 | slot 注册与 webServer 路由均随 `ctx.effect()` 退场自动撤销，UI 与路由同灭 |
| headless / ACP profile | 不组合本插件（web-only：`dsh.client.platform: 'web'`；node half 的 `inject` 依赖 webServer，仅在 web 组合中出现） |

## 10. 验收标准

1. `dsh web --patch examples/peak-valley-clock/cordis.yml` 启动后：只出现徽章，无任何自动播放；网络面板可见视频预加载请求
2. 点击徽章：透明动画浮现、带声播放 6 秒、淡出收回；再次点击可提前结束；无叠影
3. 喇叭开关生效且记忆（静音后下次点击无声）
4. 手动把系统时间调至 08:59 / 11:59 等边界前 1 分钟：徽章颜色渐变切字，无视频无脉冲（或以 mock 时钟单测覆盖）
5. 「今日不再显示」「关闭」生效且可在设置重开
6. 删除视频文件后点击徽章：信息卡强显 2 秒，无报错弹窗
7. `tariff.ts` 单测：官方窗口表 + 跨午夜自定义表 + 边界整点值（09:00:00.000 属峰）+ 非东八区运行环境
8. 卸载插件后：徽章消失、`/plugins/<pkg>/assets/*` 路由 404
9. 仓库门禁：`typecheck` / `lint` / 相关单测 / `hygiene` 通过

## 11. 实施拆解（素材到位后）

1. **P0 纯逻辑**：`tariff.ts` + 单测（不依赖素材）
2. **P0 node half**：资产路由（Range 请求支持，便于进度拖动调试）+ Config
3. **P1 client half**：徽章 + 时钟引擎 + 悬停信息卡 + 边界切字（仍不依赖素材，全部可测）
4. **P1 素材接入**：预加载、点击播放、透明渲染、浮现/淡出动效、声音开关与记忆、降级链
5. **P2 打磨**：拖拽吸附持久化、双时区显示、文案、设置页 section
6. **P2 收尾**：example bundle、文档、门禁

## 12. 待确认项（不阻塞 P0–P1 开工）

1. 素材交付形式三选一：自带 alpha 的 WebM / **绿幕 MP4（推荐，我来转）** / 不透明视频走兜底样式
2. 两段素材哪段对应峰、哪段对应谷（交付时标注即可）
3. 悬停信息卡保留与否（v3 暂定保留）
4. 信息卡价格表默认显示 V4-Pro / V4-Flash 两款，是否够用
