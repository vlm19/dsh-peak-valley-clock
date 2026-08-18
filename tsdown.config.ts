import { clientBundle } from '../../client/tsdown.client.ts'

// Builds both halves via the shared harness preset used by every client
// package. The browser client bundle is emitted as lib/client.js and loaded by
// the harness web from /plugins/dsh-peak-valley-clock/client.js. Node-half
// entries are the compiled lib/types outputs; the client entry
// (lib/types/client/index.js) is added automatically by clientBundle.
export default clientBundle('dsh-peak-valley-clock', [
  'lib/types/index.js',
  'lib/types/invariant.js',
])
