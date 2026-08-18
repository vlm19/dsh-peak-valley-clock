/**
 * Peak/valley reminder, node half. Host-side behavior: serves the plugin's
 * bundled video assets at `/plugins/<pkg>/assets/*` (the client-module carrier
 * only serves `/client.js`, so the videos need their own longest-prefix route
 * that wins over the generic `/plugins` prefix). The badge/video UI itself
 * lives in the browser half (`./client`).
 */
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'

export { DEFAULT_SCHEDULE, TIER_GLYPH, TIER_COLORS,
  computeNextBoundary, partsInZone, parseHHMM, resolveTier,
  type TariffSchedule, type TariffStatus, type TariffTier,
  type TariffWindow, type TariffPrice } from './tariff.ts'

const PACKAGE_NAME = 'dsh-peak-valley-clock'
const ASSETS_PREFIX = `/plugins/${PACKAGE_NAME}/assets`
// Node half ships at lib/index.js; the videos live at package root <assets>.
const ASSETS_DIR = fileURLToPath(new URL('../assets', import.meta.url))

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m4v': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.map': 'application/json',
}

/** Serve one asset file under the plugin's assets directory. */
function serveAsset(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }
  const rawPath = new URL(req.url ?? '/', 'http://x').pathname
  const rel = decodeURIComponent(rawPath.slice(ASSETS_PREFIX.length)).replace(/^\/+/, '')
  if (rel === '' || rel.includes('\0')) {
    res.writeHead(400)
    res.end()
    return
  }
  // Resolve and reject path traversal: the target must stay under ASSETS_DIR.
  const target = resolve(normalize(join(ASSETS_DIR, rel)))
  if (target !== ASSETS_DIR && !target.startsWith(ASSETS_DIR + sep)) {
    res.writeHead(403)
    res.end()
    return
  }
  void readFile(target).then((body) => {
    res.writeHead(200, {
      'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'accept-ranges': 'bytes',
    })
    if (req.method === 'HEAD') res.end()
    else res.end(body)
  }).catch(() => {
    res.writeHead(404)
    res.end()
  })
}

const ASSET_ROUTE: WebRoute = {
  kind: 'prefix',
  path: ASSETS_PREFIX,
  handler: serveAsset,
}

/** Services the node half waits on before it can bind the asset route. */
export const inject = ['webServer']

/** Host plugin body — binds the video asset route; UI lives in the browser half. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.webServer.register(ASSET_ROUTE), 'ui-peak-valley: asset route')
}
