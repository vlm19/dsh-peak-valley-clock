/**
 * Panel: composes the badge, the (optional) playback video, and the hover
 * card. CSS drives the animations; React only flips data attributes and
 * class names. State is observed via useSyncExternalStore on the engine and
 * on the prefs adapter.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PeakValleyInjected } from './slots.ts'
import type { Corner } from './stores.ts'
import { formatClockInZone, formatDurationEn, formatDurationZh, type PeakValleyKey } from './locales.ts'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './Panel.module.css'

export interface PanelProps extends PeakValleyInjected, PropsLocale<'peakvalley'>, PropsRuntime<'shell.overlay'> {
  /** Initial corner from config (user prefs override). */
  defaultCorner: Corner
}

export function Panel(props: PanelProps): JSX.Element | null {
  const { engine, prefs, t, videoFor, getActiveLocaleId, isMinimized, setMinimized } = props

  const state = useSyncExternalStore(engine.subscribe, engine.getState)
  const prefsRev = useSyncExternalStore(prefs.subscribe, prefs.getSnapshot)

  const tier = state.status.tier
  const glyph = tier === 'peak' ? '峰' : '谷'

  // Minimized: a tiny glyph that keeps tracking the tier, click to restore.
  if (isMinimized()) {
    return (
      <div className={css.panel} data-corner={prefs.read().corner ?? props.defaultCorner} data-tier={tier}>
        <button
          type="button"
          className={css.miniBadge}
          aria-label={t((tier === 'peak' ? 'badge.peak.aria' : 'badge.offpeak.aria') as PeakValleyKey)}
          title={t((tier === 'peak' ? 'badge.peak.aria' : 'badge.offpeak.aria') as PeakValleyKey)}
          onClick={() => prefs.set({ minimized: false })}
        >
          {glyph}
        </button>
      </div>
    )
  }
  const [hovering, setHovering] = useState(false)
  const [playing, setPlaying] = useState<'idle' | 'in' | 'out'>('idle')
  const [corner, setCorner] = useState<Corner>(prefs.read().corner ?? props.defaultCorner)
  const [tierFx, setTierFx] = useState(0)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
  const localeId = getActiveLocaleId()
  const colors = tier === 'peak'
    ? { glow: 'rgba(180, 83, 9, 0.45)' }
    : { glow: 'rgba(15, 118, 110, 0.45)' }

  useEffect(() => { setCorner(prefs.read().corner ?? props.defaultCorner) }, [prefsRev, props.defaultCorner, prefs])
  useEffect(() => {
    if (state.prevTier !== null && state.prevTier !== tier) setTierFx((n: number) => n + 1)
  }, [tier, state.prevTier])

  function handleBadgeClick(): void {
    if (playing !== 'idle') { setPlaying('out'); return }
    if (videoFor(tier) === undefined) {
      setHovering(true)
      window.setTimeout(() => setHovering(false), 2000)
      return
    }
    setPlaying('in')
  }
  function handleVideoEnded(): void { setPlaying('out') }
  function handleAnimationEnd(): void { if (playing === 'out') setPlaying('idle') }
  function handleMuteToggle(ev: React.MouseEvent): void {
    ev.stopPropagation()
    prefs.set({ sound: !prefs.read().sound })
  }
  function handleMinimize(ev: React.MouseEvent): void {
    ev.stopPropagation()
    setMinimized()
  }
  function handleDragStart(ev: React.PointerEvent): void {
    const target = ev.currentTarget as HTMLElement
    target.setPointerCapture(ev.pointerId)
    const rect = (target.closest(`.${css.panel}`) as HTMLElement | null)?.getBoundingClientRect()
    dragRef.current = { startX: ev.clientX, startY: ev.clientY, baseX: rect?.left ?? 0, baseY: rect?.top ?? 0 }
  }
  function handleDragMove(ev: React.PointerEvent): void {
    const d = dragRef.current; if (d === null) return
    setPos({ x: d.baseX + (ev.clientX - d.startX), y: d.baseY + (ev.clientY - d.startY) })
  }
  function handleDragEnd(ev: React.PointerEvent): void {
    const target = ev.currentTarget as HTMLElement
    target.releasePointerCapture(ev.pointerId)
    const d = dragRef.current; dragRef.current = null
    if (d === null) return
    const newCorner = snapCorner(d.baseX + (ev.clientX - d.startX), d.baseY + (ev.clientY - d.startY))
    prefs.set({ corner: newCorner })
    setPos(null); setCorner(newCorner)
  }

  const panelStyle: React.CSSProperties = pos === null
    ? {}
    : { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }

  const durationStr = localeId === 'zh'
    ? formatDurationZh(state.status.msRemaining)
    : formatDurationEn(state.status.msRemaining)
  const videoUrl = videoFor(tier)
  const sound = prefs.read().sound

  return (
    <div
      className={css.panel}
      data-corner={corner}
      data-tier={tier}
      data-tier-fx={tierFx}
      style={panelStyle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { if (playing === 'idle') setHovering(false) }}
    >
      <span
        className={css.handle}
        title="drag"
        aria-label="drag"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >⠿</span>
      <button
        type="button"
        className={`${css.badge} ${tierFx > 0 ? css.badgeTransition : ''}`}
        aria-label={t((tier === 'peak' ? 'badge.peak.aria' : 'badge.offpeak.aria') as PeakValleyKey)}
        onClick={handleBadgeClick}
        style={{ boxShadow: `0 6px 18px ${colors.glow}` }}
      >
        {glyph}
      </button>

      {playing !== 'idle' && videoUrl !== undefined && (
        <div
          className={`${css.video} ${playing === 'out' ? css.videoLeaving : ''}`}
          onAnimationEnd={handleAnimationEnd}
        >
          <video
            className={css.videoEl}
            src={videoUrl}
            autoPlay
            playsInline
            preload="auto"
            muted={!sound}
            onEnded={handleVideoEnded}
            onClick={() => setPlaying('out')}
            key={`${tier}-${playing}-${prefsRev}`}
          />
          <button
            type="button"
            className={css.muteBtn}
            data-muted={!sound}
            aria-label={t((sound ? 'mute.on' : 'mute.off') as PeakValleyKey)}
            title={t((sound ? 'mute.on' : 'mute.off') as PeakValleyKey)}
            onClick={handleMuteToggle}
          >
            {sound ? '🔊' : '🔇'}
          </button>
        </div>
      )}

      {hovering && playing === 'idle' && (
        <div className={css.card} role="dialog" aria-label={t('card.title.' + tier as PeakValleyKey)}>
          <div className={css.cardTitle}>
            <span className={css.cardDot} />
            {t('card.title.' + tier as PeakValleyKey)} · {t('card.remaining', { duration: durationStr })}
          </div>
          <div className={css.cardMeta}>
            {t('card.next', {
              when: formatClockInZone(state.status.nextBoundary, state.schedule.timezone, localeId),
              next: t(('card.next.' + (tier === 'peak' ? 'offpeak' : 'peak')) as PeakValleyKey),
            })}
          </div>
          {state.schedule.prices.slice(0, 2).map((p: typeof state.schedule.prices[number]) => (
            <div key={p.modelId}>
              <div className={css.cardPriceHead}>{p.label}</div>
              <div className={css.cardPriceRow}>
                <span>{t('card.price.cacheHit' as PeakValleyKey)}</span>
                <span>{t('card.price.perMillion' as PeakValleyKey, { value: p.cacheHit })}</span>
                <span>{t('card.price.cacheMiss' as PeakValleyKey)}</span>
                <span>{t('card.price.perMillion' as PeakValleyKey, { value: p.cacheMiss })}</span>
                <span>{t('card.price.output' as PeakValleyKey)}</span>
                <span>{t('card.price.perMillion' as PeakValleyKey, { value: p.output })}</span>
              </div>
            </div>
          ))}
          <div className={css.cardActions}>
            <button type="button" onClick={handleMinimize}>{t('card.minimize' as PeakValleyKey)}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function snapCorner(left: number, top: number): Corner {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  const h = typeof window !== 'undefined' ? window.innerHeight : 768
  const x = left < w / 2 ? 'left' : 'right'
  const y = top < h / 2 ? 'top' : 'bottom'
  return `${y}-${x}` as Corner
}
