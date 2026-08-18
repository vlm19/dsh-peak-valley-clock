/**
 * Client tariff engine. Subscribes to wall-clock changes and emits tariff
 * status transitions. The engine is the only place that re-runs the resolver
 * on a tick; React components subscribe to its store.
 *
 * The engine is *interval-driven* rather than long-timer-driven because:
 *   - visibility changes can hide the page for hours; we must recompute
 *     on visibilitychange/focus regardless of timer state
 *   - system clock adjustments (NTP, manual) shift the next boundary; the
 *     resolver is cheap, so a 1s heartbeat is fine
 *   - 1s is small enough that the badge's `msRemaining` can update live
 */

import { createStore } from 'zustand/vanilla'
import { resolveTier, type TariffSchedule, type TariffStatus, type TariffTier } from '../tariff.ts'

const TICK_MS = 1000

export interface PeakValleyState {
  schedule: TariffSchedule
  status: TariffStatus
  /** Previous tier; lets React components animate a one-shot cross-fade on change. */
  prevTier: TariffTier | null
  /** Monotonic counter; bumped on every recompute. */
  tick: number
  /** True when the user has manually hidden the panel for today. */
  hidden: boolean
  /** True when the engine's ticker is live (false after dispose). */
  live: boolean
}

export interface PeakValleyEngine {
  /** Read the current state. Subscribe with `.subscribe()`. */
  getState(): PeakValleyState
  subscribe(listener: (state: PeakValleyState) => void): () => void
  /** Recompute now (call after user navigates back to the tab). */
  refresh(): void
  /** Stop the ticker. Safe to call multiple times. */
  dispose(): void
}

export function createTariffEngine(schedule: TariffSchedule): PeakValleyEngine {
  const initial = resolveTier(new Date(), schedule)
  const store = createStore<PeakValleyState>(() => ({
    schedule,
    status: initial,
    prevTier: null,
    tick: 0,
    hidden: false,
    live: true,
  }))

  let interval: ReturnType<typeof setInterval> | undefined
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') recompute()
  }
  const onFocus = (): void => recompute()

  function recompute(): void {
    const prev = store.getState().status.tier
    const next = resolveTier(new Date(), schedule)
    store.setState((s: PeakValleyState) => ({
      ...s,
      status: next,
      prevTier: prev === next.tier ? s.prevTier : prev,
      tick: s.tick + 1,
    }))
  }

  function start(): void {
    interval = setInterval(recompute, TICK_MS)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
  }

  function dispose(): void {
    if (interval !== undefined) clearInterval(interval)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onFocus)
    interval = undefined
    if (store.getState().live) store.setState({ live: false })
  }

  start()

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    refresh: recompute,
    dispose,
  }
}
