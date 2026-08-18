/** `peakvalley` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'peakvalley'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'badge.peak.aria': '当前为高峰计费时段，点击查看视频',
  'badge.offpeak.aria': '当前为空闲计费时段，点击查看视频',
  'card.title.peak': '高峰时段',
  'card.title.offpeak': '空闲时段',
  'card.countdown': '{duration} 后进入{next}',
  'card.next.peak': '高峰',
  'card.next.offpeak': '空闲',
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
  'card.countdown': '{next} in {duration}',
  'card.next.peak': 'peak',
  'card.next.offpeak': 'off-peak',
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
