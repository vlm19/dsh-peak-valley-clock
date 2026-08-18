import { describe, expect, it } from 'vitest'
import { DEFAULT_SCHEDULE, computeNextBoundary, parseHHMM, partsInZone,
  resolveTier, TIER_COLORS, TIER_GLYPH } from '../src/tariff.ts'

const SCHEDULE = DEFAULT_SCHEDULE

/** Build a Date for a wall-clock instant in `Asia/Shanghai` (UTC+8, no DST). */
function shaTime(y: number, mo: number, d: number, h: number, mi: number): Date {
  // Asia/Shanghai is UTC+8 with no DST. Compute UTC instant.
  return new Date(Date.UTC(y, mo - 1, d, h - 8, mi, 0))
}

describe('parseHHMM', () => {
  it('parses well-formed times', () => {
    expect(parseHHMM('09:00')).toEqual([9, 0])
    expect(parseHHMM('23:59')).toEqual([23, 59])
    expect(parseHHMM('0:00')).toEqual([0, 0])
  })
  it('rejects malformed times', () => {
    expect(() => parseHHMM('24:00')).toThrow()
    expect(() => parseHHMM('12:60')).toThrow()
    expect(() => parseHHMM('nope')).toThrow()
  })
})

describe('partsInZone', () => {
  it('returns Asia/Shanghai clock parts from a UTC instant', () => {
    // 2026-08-18 00:00 UTC == 2026-08-18 08:00 Asia/Shanghai.
    const instant = new Date('2026-08-18T00:00:00Z')
    const p = partsInZone(instant, 'Asia/Shanghai')
    expect(p).toMatchObject({ year: 2026, month: 8, day: 18, hour: 8, minute: 0 })
  })
  it('handles America/Los_Angeles (PST/PDT-aware)', () => {
    // 2026-08-18 00:00 UTC == 2026-08-17 17:00 PDT (UTC-7).
    const instant = new Date('2026-08-18T00:00:00Z')
    const p = partsInZone(instant, 'America/Los_Angeles')
    expect(p).toMatchObject({ year: 2026, month: 8, day: 17, hour: 17, minute: 0 })
  })
})

describe('resolveTier (Asia/Shanghai schedule)', () => {
  it('08:59 is offpeak (one minute before 09:00 peak)', () => {
    expect(resolveTier(shaTime(2026, 8, 18, 8, 59), SCHEDULE).tier).toBe('offpeak')
  })
  it('09:00:00 exactly is peak (boundary is exclusive on the end side)', () => {
    expect(resolveTier(shaTime(2026, 8, 18, 9, 0), SCHEDULE).tier).toBe('peak')
  })
  it('11:59 is peak', () => {
    expect(resolveTier(shaTime(2026, 8, 18, 11, 59), SCHEDULE).tier).toBe('peak')
  })
  it('12:00 is offpeak', () => {
    expect(resolveTier(shaTime(2026, 8, 18, 12, 0), SCHEDULE).tier).toBe('offpeak')
  })
  it('13:59 is offpeak', () => {
    expect(resolveTier(shaTime(2026, 8, 18, 13, 59), SCHEDULE).tier).toBe('offpeak')
  })
  it('14:00 is peak', () => {
    expect(resolveTier(shaTime(2026, 8, 18, 14, 0), SCHEDULE).tier).toBe('peak')
  })
  it('17:59 is peak', () => {
    expect(resolveTier(shaTime(2026, 8, 18, 17, 59), SCHEDULE).tier).toBe('peak')
  })
  it('18:00 is offpeak', () => {
    expect(resolveTier(shaTime(2026, 8, 18, 18, 0), SCHEDULE).tier).toBe('offpeak')
  })
  it('23:59 is offpeak', () => {
    expect(resolveTier(shaTime(2026, 8, 18, 23, 59), SCHEDULE).tier).toBe('offpeak')
  })
  it('00:00 is offpeak', () => {
    expect(resolveTier(shaTime(2026, 8, 19, 0, 0), SCHEDULE).tier).toBe('offpeak')
  })
  it('msRemaining is positive and <= 6 hours', () => {
    const s = resolveTier(shaTime(2026, 8, 18, 10, 30), SCHEDULE)
    expect(s.msRemaining).toBeGreaterThan(0)
    expect(s.msRemaining).toBeLessThanOrEqual(6 * 60 * 60 * 1000)
  })
})

describe('computeNextBoundary', () => {
  it('from 09:30, next boundary is 12:00', () => {
    const now = shaTime(2026, 8, 18, 9, 30)
    const next = computeNextBoundary(now, SCHEDULE)
    const p = partsInZone(next, 'Asia/Shanghai')
    expect(p).toMatchObject({ day: 18, hour: 12, minute: 0 })
  })
  it('from 13:00, next boundary is 14:00', () => {
    const next = computeNextBoundary(shaTime(2026, 8, 18, 13, 0), SCHEDULE)
    const p = partsInZone(next, 'Asia/Shanghai')
    expect(p).toMatchObject({ day: 18, hour: 14, minute: 0 })
  })
  it('from 23:00, next boundary rolls to 09:00 next day', () => {
    const next = computeNextBoundary(shaTime(2026, 8, 18, 23, 0), SCHEDULE)
    const p = partsInZone(next, 'Asia/Shanghai')
    expect(p).toMatchObject({ day: 19, hour: 9, minute: 0 })
  })
  it('from 00:30, next boundary is 09:00 same day', () => {
    const next = computeNextBoundary(shaTime(2026, 8, 18, 0, 30), SCHEDULE)
    const p = partsInZone(next, 'Asia/Shanghai')
    expect(p).toMatchObject({ day: 18, hour: 9, minute: 0 })
  })
})

describe('glyphs and colors', () => {
  it('has a glyph and a color set for each tier', () => {
    expect(TIER_GLYPH.peak).toBe('峰')
    expect(TIER_GLYPH.offpeak).toBe('谷')
    expect(TIER_COLORS.peak.bg).toBeTruthy()
    expect(TIER_COLORS.offpeak.bg).toBeTruthy()
  })
})
