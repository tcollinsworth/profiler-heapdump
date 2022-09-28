import { init } from '../api'

// import { foo } from './profiler-test-examples'

import { init as heapDumpExamplesInit } from './heap-dump-examples'

export function start() {
  init({
    server: {
      authentication: {
        basic: {
          username: 'change',
          password: 'me',
        },
        // bearerToken: 'changeme',
      },
    },
  })
  heapDumpExamplesInit()
}
