/**
 * Peak/valley reminder, browser half: registers the badge / video entry into
 * the existing `shell.overlay` list slot. The visible behavior is driven by
 * the local clock against the tariff schedule; the engine is a zustand
 * store the panel subscribes to.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Pulls the shell.overlay SlotMap merge from ui-layout's browser half so the
// typed register() call below sees 'shell.overlay' as a valid name.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { Panel } from './Panel.tsx'
import { createTariffEngine, type PeakValleyEngine } from './tariff-engine.ts'
import { createPrefsAdapter, type PrefsAdapter } from './prefs-adapter.ts'
import { DEFAULT_SCHEDULE, type TariffSchedule, type TariffTier } from '../tariff.ts'
import { en, NS, zh, type PeakValleyKey } from './locales.ts'

export { Panel } from './Panel.tsx'
export type { PeakValleyInjected } from './slots.ts'
export type { PeakValleyEngine, PeakValleyState } from './tariff-engine.ts'
export { createTariffEngine } from './tariff-engine.ts'
export { createPrefsAdapter } from './prefs-adapter.ts'
export { loadPrefs, savePrefs, shouldHide } from './stores.ts'
export type { PeakValleyPrefs } from './stores.ts'
export type { PeakValleyKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'peakvalley': PeakValleyKey
  }
}

export interface PeakValleyConfig {
  /** Tariff schedule; defaults to the 2026-08-17 DeepSeek policy. */
  schedule?: TariffSchedule
  /** Asset URL or relative path; if undefined, the click is a no-op with a transient card. */
  videoPeak?: string
  videoOffpeak?: string
  /** Initial corner. */
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Default sound state for click play. */
  defaultSound?: boolean
}

const DEFAULT_CONFIG: Required<PeakValleyConfig> = {
  schedule: DEFAULT_SCHEDULE,
  videoPeak: 'feng.mp4',
  videoOffpeak: 'gu.mp4',
  corner: 'bottom-right',
  defaultSound: true,
}

const PACKAGE_NAME = 'dsh-peak-valley-clock'

/** Resolve a config-relative asset URL against the webserver's plugin asset route. */
function resolveAssetUrl(value: string, packageName: string): string {
  if (/^https?:\/\//.test(value) || value.startsWith('/')) return value
  return `/plugins/${packageName}/assets/${value.replace(/^assets\//, '')}`
}

/** The single binding the registered entry consumes. */
interface Binding {
  engine: PeakValleyEngine
  prefs: PrefsAdapter
  videoFor(tier: TariffTier): string | undefined
  getActiveLocaleId(): 'zh' | 'en'
  isHidden(): boolean
  setHidden(): void
  dispose(): void
}

function createBinding(ctx: ClientContext, config: Required<PeakValleyConfig>, packageName: string): Binding {
  const engine = createTariffEngine(config.schedule)
  const prefs = createPrefsAdapter()
  // Backfill defaultSound once.
  const initial = prefs.read()
  if (initial.sound === undefined) prefs.set({ sound: config.defaultSound })

  function getActiveLocaleId(): 'zh' | 'en' {
    const id = ctx.locale.getLocale().active
    return id === 'en' ? 'en' : 'zh'
  }
  function videoFor(tier: TariffTier): string | undefined {
    const raw = tier === 'peak' ? config.videoPeak : config.videoOffpeak
    if (raw === undefined || raw === '') return undefined
    return resolveAssetUrl(raw, packageName)
  }
  function isHidden(): boolean {
    const p = prefs.read()
    if (p.hideUntil === null) return false
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return p.hideUntil >= `${y}-${m}-${d}`
  }
  function setHidden(): void {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    prefs.set({ hideUntil: `${y}-${m}-${d}` })
  }
  function dispose(): void { engine.dispose() }
  return { engine, prefs, videoFor, getActiveLocaleId, isHidden, setHidden, dispose }
}

/** Required services: locale, runtime (for slots, theme). */
export const inject = ['slots', 'locale', 'runtime']

export function apply(ctx: ClientContext): void {
  const config: Required<PeakValleyConfig> = { ...DEFAULT_CONFIG }
  const binding = createBinding(ctx, config, PACKAGE_NAME)
  ctx.effect(() => binding.dispose, 'ui-peak-valley: dispose binding')

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-peak-valley: dictionaries')

  // `shell.overlay` is declared by ui-layout's `root` registration; fiber
  // activation order between this plugin and ui-layout is not guaranteed, so
  // register through slots.inject — it waits for the declaration then runs,
  // and the wrapper is owned by this fiber (plugin unload cleans it up).
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'peak-valley',
        order: 50,
        priority: 0,
        locale: NS,
        registrant: 'peak-valley-clock',
        inject: () => ({
          engine: binding.engine,
          prefs: binding.prefs,
          videoFor: binding.videoFor,
          getActiveLocaleId: binding.getActiveLocaleId,
          isHidden: binding.isHidden,
          setHidden: binding.setHidden,
          readState: binding.engine.getState,
        }),
      } as never,
      function BoundPanel(p: any) {
        // The host sets `defaultCorner` from config at the call site.
        return Panel({ ...p, defaultCorner: config.corner } as any)
      },
    ),
  )
}
