/**
 * Package-owned invariant companion for `dsh-peak-valley-clock`.
 */
/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-peak-valley-clock'

/** Cordis companion plugin name. */
export const name = 'peak-valley-clock-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * The peak/valley reminder has no runtime invariant beyond a single shell.overlay
 * list-slot registration, whose disposal is exercised by the browser spec.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
