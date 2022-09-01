import express from 'express'
import compression from 'compression'
import wrap from 'express-async-wrap'

import {
  getProfile,
} from '../app/inspector-api'

const HOST = process.env.PROFILING_HEAPDUMP_HOST || 'localhost'
const PORT = parseInt(process.env.PROFILING_HEAPDUMP_PORT || '6660', 10)

const app = express()
app.use(compression())

// using only GET so it works via browser URL and one less argument via curl
// app.get('/debug/heapdump', wrap(getHeapdump))

// ?durationSec=10&samplingRateMs=1000&
app.get('/debug/profile', wrap(getProfile))

export function start() {
  app.listen(PORT, HOST, () => {
    process.stdout.write(`Server is listening on ${PORT}\n`)
  })
    .on('error', (err) => {
      process.stdout.write(`Error occurred ${err}\n`)
      setTimeout(() => process.exit(1), 5000)
    })
}
