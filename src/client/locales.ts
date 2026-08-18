/** `peakvalley` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'peakvalley'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'badge.peak.aria': '当前为高峰计费时段，点击查看视频',
  'badge.offpeak.aria': '当前为空闲计费时段，点击查看视频',
  'card.title.peak': '高峰时段',
  'card.title.offpeak': '空闲时段',
  'card.remaining': '剩余 {duration}',
  'card.next': '{when} 后进入{next}',
  'card.next.peak': '高峰',
  'card.next.offpeak': '空闲',
  'card.price.cacheHit': '缓存命中输入',
  'card.price.cacheMiss': '输入（未命中）',
  'card.price.output': '输出',
  'card.price.perMillion': '{value} 元/百万tokens',
  'card.hide.today': '今日不再显示',
  'card.disable': '关闭',
  'mute.on': '点击静音',
  'mute.off': '点击开启声音',
  'mute.aria': '声音开关',
  'err.noVideo.peak': '峰时视频不可用',
  'err.noVideo.offpeak': '谷时视频不可用',
  'err.fallback.peak': '当前是高峰时段，全价计费',
  'err.fallback.offpeak': '当前是空闲时段，半价计费',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<PeakValleyKey, string> = {
  'badge.peak.aria': 'Peak pricing now. Click to view video.',
  'badge.offpeak.aria': 'Off-peak pricing now. Click to view video.',
  'card.title.peak': 'Peak hours',
  'card.title.offpeak': 'Off-peak hours',
  'card.remaining': '{duration} remaining',
  'card.next': '{next} pricing at {when}',
  'card.next.peak': 'peak',
  'card.next.offpeak': 'off-peak',
  'card.price.cacheHit': 'Cache-hit input',
  'card.price.cacheMiss': 'Input (miss)',
  'card.price.output': 'Output',
  'card.price.perMillion': '{value} / 1M tokens',
  'card.hide.today': 'Hide for today',
  'card.disable': 'Turn off',
  'mute.on': 'Mute',
  'mute.off': 'Unmute',
  'mute.aria': 'Sound toggle',
  'err.noVideo.peak': 'Peak video unavailable',
  'err.noVideo.offpeak': 'Off-peak video unavailable',
  'err.fallback.peak': 'Peak hours now, full price applies.',
  'err.fallback.offpeak': 'Off-peak hours now, half price applies.',
}

/** Key domain of the `peakvalley` namespace (zh is the source of truth). */
export type PeakValleyKey = keyof typeof zh

/** Compact human-friendly duration formatter (Chinese). */
export function formatDurationZh(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} 分钟`
  if (m === 0) return `${h} 小时`
  return `${h} 小时 ${m} 分钟`
}

/** Compact human-friendly duration formatter (English). */
export function formatDurationEn(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Clock formatter (HH:MM, 24h) in the schedule timezone, for the card subtitle. */
export function formatClockInZone(date: Date, timezone: string, lang: 'zh' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', {
      timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit',
    }).format(date)
  } catch {
    return ''
  }
}
