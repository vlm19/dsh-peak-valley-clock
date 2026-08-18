/**
 * Lightweight prefs store with subscription. Returns a stable adapter that
 * the panel and the host both consume; the rev counter is the snapshot the
 * panel reads to know when prefs changed.
 */
import { loadPrefs, savePrefs, type PeakValleyPrefs } from './stores.ts'

export interface PrefsAdapter {
  read(): PeakValleyPrefs
  set(next: Partial<PeakValleyPrefs>): void
  subscribe(listener: () => void): () => void
  /** A primitive value that changes on every write; pass to useSyncExternalStore. */
  getSnapshot(): number
}

export function createPrefsAdapter(): PrefsAdapter {
  let state = loadPrefs()
  let rev = 0
  const listeners = new Set<() => void>()
  return {
    read: () => state,
    set(next) {
      state = { ...state, ...next }
      savePrefs(state)
      rev++
      for (const fn of listeners) fn()
    },
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },
    getSnapshot: () => rev,
  }
}
