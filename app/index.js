import cloneDeep from 'lodash.clonedeep'
import express from 'express'
import wrap from 'express-async-wrap'
import merge from 'lodash.merge'
import { getAuthMiddleware } from './auth'
import { getHeapDump, getProfile } from './inspector-api'

const state = {
  expressServer: undefined,
  profilingInProgress: false,
  heapdumpInProgress: false,
}

const defaultOptions = {
  server: {
    isExistingExpressApp: false,
    newExpresRoutePrefix: undefined,
    bind: {
      host: '127.0.0.1',
      port: 6660,
    },
    authentication: {
      basic: {
        username: undefined,
        password: undefined,
      },
      bearerToken: undefined,
    },
  },
  cpu: {
    profiling: {
      durationMs: 10000,
      sampleRateUs: 1000, // 1 ms
    },
  },
}

export function init(overrideOptions) {
  const options = cloneDeep(defaultOptions)
  merge(options, overrideOptions)

  if (options?.server?.isExistingExpressApp === true) {
    return initWithExistingExpress(options)
  }
  return initWithNewExpress(options)
}

function initWithExistingExpress(options) {
  const router = new express.Router()

  const authMiddleware = getAuthMiddleware(options?.server?.authentication)
  if (authMiddleware != null) router.use(authMiddleware)

  router.use('/profile', wrap(getProfile))
  router.use('/heapdump', wrap(getHeapDump))
  return router
}

function initWithNewExpress(options) {
  const app = express()

  const authMiddleware = getAuthMiddleware(options?.server?.authentication)
  if (authMiddleware != null) app.use(authMiddleware)

  let routePrefix = ''
  if (options?.server?.newExpresRoutePrefix != null) {
    routePrefix = options.server.newExpresRoutePrefix
  }

  app.use(`${routePrefix}/profile`, wrap(getProfile))
  app.use(`${routePrefix}/heapdump`, wrap(getHeapDump))

  state.server = app.listen(options.server.bind.port, options.server.bind.host, () => {
    process.stdout.write(`New Heap/Profiler server listening on ${options.server.bind.host}:${options.server.bind.port}\n`)
  })
    .on('error', (err) => {
      process.stdout.write(`Heap/Profiler server error occurred ${err}\n`)
    })

  process.on('SIGTERM', () => {
    // intentionally no await
    shutdown()
  })
}

export async function shutdown() {
  if (state.server != null) {
    await new Promise((resolve, reject) => {
      state.server.close((err) => {
        state.server = null
        if (err != null) return reject(err)
        return resolve()
      })
    })
  }
}
