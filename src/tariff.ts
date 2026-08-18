/**
 * Tariff schedule resolution: pure functions shared by the host and browser
 * halves. The browser half calls these from the tariff engine to keep the
 * badge in lockstep with the wall clock (Intl-based, no manual UTC offset).
 *
 * The schedule default mirrors the DeepSeek 2026-08-17 peak/valley policy
 * (Asia/Shanghai):
 *   peak:    09:00-12:00, 14:00-18:00
 *   offpeak: everything else
 * Multipliers are expressed as fractions of the peak price.
 */

/** A pricing tier. */
export type TariffTier = 'peak' | 'offpeak'

/** One tariff window. `end` is exclusive; `start === end` is rejected. Cross-midnight (`start > end`) is allowed. */
export interface TariffWindow {
  /** Local clock time, "HH:MM". */
  start: string
  /** Local clock time, "HH:MM". */
  end: string
  tier: TariffTier
}

/** One model price row used in the hover card. */
export interface TariffPrice {
  /** Model id (matches ctx.llm's catalog id; e.g. `deepseek-v4-pro`). */
  modelId: string
  /** Display label, e.g. `DeepSeek-V4-Pro`. */
  label: string
  /** Cache-hit input, per million tokens, in CNY. */
  cacheHit: number
  /** Cache-miss input, per million tokens, in CNY. */
  cacheMiss: number
  /** Output, per million tokens, in CNY. */
  output: number
}

/** A full tariff schedule. */
export interface TariffSchedule {
  /** IANA timezone id used for the schedule clock (default: `Asia/Shanghai`). */
  timezone: string
  /** Ordered list of peak windows; everything not covered is offpeak. */
  windows: TariffWindow[]
  /** Price rows shown in the hover card. */
  prices: TariffPrice[]
}

/** Result of a single time evaluation. */
export interface TariffStatus {
  /** Current tier. */
  tier: TariffTier
  /** Next boundary instant in the schedule timezone. */
  nextBoundary: Date
  /** Milliseconds until the next boundary (always positive). */
  msRemaining: number
}

/** Parse "HH:MM" into [hour, minute] integers. Throws on malformed input. */
export function parseHHMM(value: string): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (match === null) throw new Error(`tariff: expected HH:MM, received ${JSON.stringify(value)}`)
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`tariff: time out of range: ${value}`)
  }
  return [h, m]
}

/**
 * Return the local-clock fields of `instant` interpreted in `timezone`.
 * Uses the runtime Intl API so DST and arbitrary zones are correct.
 * @param instant - The wall-clock instant to project.
 * @param timezone - IANA timezone id (e.g. `Asia/Shanghai`).
 * @returns `{ year, month, day, hour, minute, dayOfWeek }` in that zone.
 */
export function partsInZone(instant: Date, timezone: string): {
  year: number; month: number; day: number; hour: number; minute: number; dayOfWeek: number
} {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  })
  const parts = fmt.formatToParts(instant)
  const lookup = (t: string): string => parts.find(p => p.type === t)?.value ?? ''
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  let hour = Number(lookup('hour'))
  if (hour === 24) hour = 0 // Intl quirk: "24" in some zones
  return {
    year: Number(lookup('year')),
    month: Number(lookup('month')),
    day: Number(lookup('day')),
    hour,
    minute: Number(lookup('minute')),
    dayOfWeek: weekdayMap[lookup('weekday')] ?? 0,
  }
}

/**
 * Convert a `(year, month, day, hour, minute)` in `timezone` to a `Date` instant.
 * Works by binary search on the UTC offset of `timezone` at that local clock
 * time (correctly handling DST).
 */
export function instantFromZone(year: number, month: number, day: number, hour: number, minute: number, timezone: string): Date {
  // First guess: pretend the local clock is UTC.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
  // Compute the actual offset at `guess` for `timezone` and correct.
  const offsetMin = tzOffsetMinutes(guess, timezone)
  return new Date(guess.getTime() - offsetMin * 60_000)
}

/** Return the offset in minutes from UTC of `instant` in `timezone` (positive east). */
function tzOffsetMinutes(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant)
  const lookup = (t: string): number => Number(parts.find(p => p.type === t)?.value ?? 0)
  const asUtc = Date.UTC(lookup('year'), lookup('month') - 1, lookup('day'), lookup('hour'), lookup('minute'), lookup('second'))
  return Math.round((asUtc - instant.getTime()) / 60_000)
}

/**
 * Compute the next boundary instant strictly after `now` in the schedule's
 * timezone. Walks the day forward until it finds a window boundary ahead of
 * `now` (1..4 days, since windows are small).
 */
export function computeNextBoundary(now: Date, schedule: TariffSchedule): Date {
  const tz = schedule.timezone
  const nowParts = partsInZone(now, tz)
  const nowMin = nowParts.hour * 60 + nowParts.minute

  // A window spans at most one midnight, so boundaries from windows starting
  // yesterday, today, and tomorrow cover every boundary strictly after `now`.
  type Bound = { dayOffset: number; min: number; tier: TariffTier }
  const cands: Bound[] = []
  for (let day = -1; day <= 1; day++) {
    for (const w of schedule.windows) {
      const [sh, sm] = parseHHMM(w.start)
      const [eh, em] = parseHHMM(w.end)
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em
      cands.push({ dayOffset: day, min: startMin, tier: w.tier })
      // Cross-midnight windows end on the following day.
      cands.push({ dayOffset: endMin > startMin ? day : day + 1, min: endMin, tier: invertTier(w.tier) })
    }
  }

  // Pick the earliest boundary strictly after `now`.
  let best: Bound | undefined
  for (const b of cands) {
    if (b.dayOffset > 0 || (b.dayOffset === 0 && b.min > nowMin)) {
      if (best === undefined || b.dayOffset < best.dayOffset || (b.dayOffset === best.dayOffset && b.min < best.min)) {
        best = b
      }
    }
  }

  // `best` is undefined only when `schedule.windows` is empty (no boundary ever).
  if (best === undefined) return new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const rolled = rollDay(nowParts.year, nowParts.month, nowParts.day + best.dayOffset)
  return instantFromZone(rolled.year, rolled.month, rolled.day, Math.floor(best.min / 60), best.min % 60, tz)
}

function invertTier(t: TariffTier): TariffTier {
  return t === 'peak' ? 'offpeak' : 'peak'
}

function rollDay(year: number, month: number, day: number): { year: number; month: number; day: number } {
  // Use Date UTC math to roll overflow days.
  const d = new Date(Date.UTC(year, month - 1, day))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/** Resolve the tier at `now` for the given schedule. */
export function resolveTier(now: Date, schedule: TariffSchedule): TariffStatus {
  const tz = schedule.timezone
  const nowParts = partsInZone(now, tz)
  const nowMin = nowParts.hour * 60 + nowParts.minute
  let tier: TariffTier = 'offpeak'
  for (const w of schedule.windows) {
    const [sh, sm] = parseHHMM(w.start)
    const [eh, em] = parseHHMM(w.end)
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em
    const inWindow = endMin > startMin
      ? nowMin >= startMin && nowMin < endMin
      : nowMin >= startMin || nowMin < endMin
    if (inWindow) {
      tier = w.tier
      break
    }
  }
  const nextBoundary = computeNextBoundary(now, schedule)
  return { tier, nextBoundary, msRemaining: Math.max(0, nextBoundary.getTime() - now.getTime()) }
}

/** Default schedule reflecting DeepSeek's 2026-08-17 peak/valley policy. */
export const DEFAULT_SCHEDULE: TariffSchedule = {
  timezone: 'Asia/Shanghai',
  windows: [
    { start: '09:00', end: '12:00', tier: 'peak' },
    { start: '14:00', end: '18:00', tier: 'peak' },
  ],
  prices: [
    { modelId: 'deepseek-v4-pro', label: 'DeepSeek-V4-Pro',
      cacheHit: 0.3, cacheMiss: 9, output: 27 },
    { modelId: 'deepseek-v4-flash', label: 'DeepSeek-V4-Flash',
      cacheHit: 0.1, cacheMiss: 3, output: 9 },
  ],
}

/** Chinese characters for the badge. */
export const TIER_GLYPH: Record<TariffTier, string> = { peak: '峰', offpeak: '谷' }

/** CSS color tokens for the badge. Tweak here for theme overrides. */
export const TIER_COLORS: Record<TariffTier, { bg: string; fg: string; glow: string }> = {
  peak: { bg: '#B45309', fg: '#FFF7ED', glow: 'rgba(180, 83, 9, 0.45)' },
  offpeak: { bg: '#0F766E', fg: '#ECFDF5', glow: 'rgba(15, 118, 110, 0.45)' },
}
