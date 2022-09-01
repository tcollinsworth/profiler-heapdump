import test from 'ava'
import express from 'express'
import axios from 'axios'
import delay from 'delay'
import { init, shutdown } from '../api'

const HOST = process.env.PROFILING_HEAPDUMP_HOST || '127.6.6.6'
const PORT = parseInt(process.env.PROFILING_HEAPDUMP_PORT || '6660', 10)

const state = {
  server: undefined,
}

test.afterEach(async () => {
  if (state.server != null) {
    await new Promise((resolve, reject) => {
      state.server.close((err) => {
        state.server = null
        if (err != null) return reject(err)
        return resolve()
      })
    })
  }
})

test.serial('profile on existing express in options.server.expressApp', async (t) => {
  const app = express()

  const router = init({
    server: {
      expressApp: app,
    },
  })

  app.use(router)

  state.server = app.listen(PORT, HOST, () => {
    process.stdout.write(`Test Heap/Profiler server is listening on ${HOST}:${PORT}\n`)
  })
    .on('error', (err) => {
      process.stdout.write(`Error occurred ${err}\n`)
      setTimeout(() => process.exit(1), 5000)
    })

  await profileAndValidate(t)
})

test.serial('profile on new express, no auth options', async (t) => {
  init()

  await profileAndValidate(t, null, '127.0.0.1')
  await shutdown()
})

const bind = {
  host: '127.6.6.6',
  port: 6660,
}

const basicAuth = {
  basic: {
    username: 'change',
    password: 'me',
  },
}

const badBasicAuth = {
  basic: {
    username: 'not',
    password: 'exists',
  },
}

const bearerAuth = {
  bearerToken: 'changeme',
}

const badBearerAuth = {
  bearerToken: 'notExists',
}

const basicOptions = {
  server: {
    bind,
    authentication: {
      basic: basicAuth.basic,
    },
  },
}

const bearerOptions = {
  server: {
    bind,
    authentication: {
      bearerToken: bearerAuth.bearerToken,
    },
  },
}

test.serial('profile on new express, bearer auth, 401', async (t) => {
  init(bearerOptions)

  try {
    await profileAndValidate(t)
    t.fail('expected 401')
  } catch (e) {
    t.is(401, e.response.status)
  }

  await shutdown()
})

test.serial('profile on new express, bearer auth, 429', async (t) => {
  init(bearerOptions)

  for (;;) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await profileAndValidate(t, badBearerAuth)
      t.fail('expected 401')
    } catch (e) {
      if (e.response.status === 429) break
      t.is(401, e.response.status)
    }
    // eslint-disable-next-line no-await-in-loop
    await delay(2000)
  }

  await shutdown()
})

test.serial('profile on new express, bearer auth, success', async (t) => {
  init(bearerOptions)

  await profileAndValidate(t, bearerAuth)
  await shutdown()
})

test.serial('profile on new express, basic auth, success', async (t) => {
  init(basicOptions)

  await profileAndValidate(t, basicAuth)
  await shutdown()
})

test.serial('profile on new express, basic auth, 401', async (t) => {
  init(basicOptions)

  try {
    await profileAndValidate(t)
    t.fail('expected 401')
  } catch (e) {
    t.is(401, e.response.status)
  }

  await shutdown()
})

test.serial('profile on new express, basic auth, 429', async (t) => {
  init(basicOptions)

  for (;;) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await profileAndValidate(t, badBasicAuth)
      t.fail('expected 401')
    } catch (e) {
      if (e.response.status === 429) break
      t.is(401, e.response.status)
    }
    // eslint-disable-next-line no-await-in-loop
    await delay(2000)
  }

  await shutdown()
})

async function profileAndValidate(t, auth = null, host = HOST) {
  let resultPromise
  if (auth == null) {
    // start profiler
    resultPromise = axios.get(`http://${host}:${PORT}/debug/profile?durationSec=2&sampleRateUs=1`)
  } else if (auth?.basic != null) {
    const config = {
      headers: {
        Authorization: `Basic ${Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString('base64')}`,
      },
    }
    resultPromise = axios.get(`http://${host}:${PORT}/debug/profile?durationSec=2&sampleRateUs=1`, config)
  } else if (auth?.bearerToken != null) {
    const config = {
      headers: {
        Authorization: `Bearer ${auth.bearerToken}`,
      },
    }
    resultPromise = axios.get(`http://${host}:${PORT}/debug/profile?durationSec=2&sampleRateUs=1`, config)
  } else {
    throw new Error('invalid request')
  }

  // intentionally no await to run async with test
  testLoad(1000)

  // wait for profile to complete and download
  const { data } = await resultPromise

  const expectedKeys = ['nodes', 'startTime', 'endTime', 'samples', 'timeDeltas']
  // test that the profile response includes every expected key
  t.truthy(expectedKeys.every((k) => Object.keys(data).includes(k)))

  // the profile response includes the testLoad function call
  t.truthy(JSON.stringify(data.nodes).includes('testLoad'))
}

async function testLoad(testLoadDurMs) {
  const end = Date.now() + testLoadDurMs
  let i = 0
  for (;;) {
    if (Date.now() > end) break
    ++i
    // eslint-disable-next-line no-await-in-loop
    await delay(10)
  }
  process.stdout.write(i.toString(10))
}
