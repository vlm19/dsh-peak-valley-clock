/**
 * SlotMap declaration merge and injected business face. The peak/valley
 * reminder contributes one entry into the existing `shell.overlay` list slot
 * (no new slots declared here). The injected face exposes references the
 * panel subscribes to internally; the locale seat (`t`) is wired by the
 * framework from the registration's `locale:` option.
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { PeakValleyEngine, PeakValleyState } from './tariff-engine.ts'
import type { PeakValleyPrefs } from './stores.ts'
import type { TariffTier } from '../tariff.ts'

/** Injected business face of the badge / animation entry. */
export interface PeakValleyInjected {
  /** Tariff engine (reactive, subscribable). */
  engine: PeakValleyEngine
  /** Mutable user preferences, subscribable. */
  prefs: {
    read(): PeakValleyPrefs
    set(next: Partial<PeakValleyPrefs>): void
    subscribe(listener: () => void): () => void
    getSnapshot(): number
  }
  /** Resolve a video URL for the given tier. */
  videoFor(tier: TariffTier): string | undefined
  /** Active locale id; re-read on each render. */
  getActiveLocaleId(): 'zh' | 'en'
  /** Hidden flag (reactive, lives in engine state). */
  isHidden(): boolean
  /** Set hidden flag (writes to prefs hideUntil). */
  setHidden(): void
  /** Read the full engine state (for components that don't want the snapshot). */
  readState(): PeakValleyState
}
