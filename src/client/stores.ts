/**
 * Client-side persistent preferences for the peak/valley reminder. Persists
 * to localStorage so the user's corner/sound/minimize choices survive reloads.
 * Stays inside a single localStorage key to keep the surface small.
 */

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface PeakValleyPrefs {
  /** Last user-picked corner; falls back to the config default. */
  corner: Corner
  /** Last user-picked sound state. */
  sound: boolean
}

const KEY = 'dsh:peak-valley:prefs:v1'

const DEFAULTS: PeakValleyPrefs = { corner: 'bottom-right', sound: true }

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined
  } catch {
    return undefined
  }
}

export function loadPrefs(): PeakValleyPrefs {
  const ls = safeLocalStorage()
  if (ls === undefined) return DEFAULTS
  const raw = ls.getItem(KEY)
  if (raw === null) return DEFAULTS
  try {
    const parsed = JSON.parse(raw) as Partial<PeakValleyPrefs>
    return {
      corner: parsed.corner ?? DEFAULTS.corner,
      sound: parsed.sound ?? DEFAULTS.sound,
    }
  } catch {
    return DEFAULTS
  }
}

export function savePrefs(prefs: PeakValleyPrefs): void {
  const ls = safeLocalStorage()
  if (ls === undefined) return
  try {
    ls.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* quota / private mode — silently ignore */
  }
}
