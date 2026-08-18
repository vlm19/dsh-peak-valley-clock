/**
 * Client-side persistent preferences for the peak/valley reminder. Persists
 * to localStorage so the user's corner/sound/dismissal choices survive reloads.
 * Stays inside a single localStorage key to keep the surface small and the
 * HMR-aware: we re-read on every effect.
 */

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface PeakValleyPrefs {
  /** Last user-picked corner; falls back to the config default. */
  corner: Corner
  /** Last user-picked sound state. */
  sound: boolean
  /** Local-date string (YYYY-MM-DD in local zone) until which the badge is hidden. */
  hideUntil: string | null
}

const KEY = 'dsh:peak-valley:prefs:v1'

const DEFAULTS: PeakValleyPrefs = { corner: 'bottom-right', sound: true, hideUntil: null }

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
      hideUntil: parsed.hideUntil ?? null,
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

export function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function shouldHide(prefs: PeakValleyPrefs): boolean {
  if (prefs.hideUntil === null) return false
  return prefs.hideUntil >= todayLocal()
}
