import inspector from 'inspector'
import bfj from 'bfj'
import delay from 'delay'

let session
let isProfiling = false
// inspector may have been opened with 'node --inspect' or 'node --inspect-brk', don't close or debugging stops
let isInspectorOpened = false

export async function getProfile(req, resp) {
  const durationMs = parseInt(req.query.durationSec || 10, 10) * 1000
  const sampleRateUs = parseInt(req.query.sampleRateUs || 1000, 10)

  try {
    startInspector()
    await startProfiler(sampleRateUs)

    // stop after durationMs
    await delay(durationMs)

    await stopProfiler(req, resp)
  } finally {
    stopInspector()
  }
}

/**
 * Pass query param ?obfuscateStrings=false to not obfuscate string data which may contain PII or OII.
 * Any other value or no obfuscateStrings param value will attempt to obfuscate strings.
 *
 * @param req
 * @param resp
 * @returns {Promise<void>}
 */
export async function getHeapDump(req, resp) {
  try {
    startInspector()
    const mesg = await streamHeapDumpToResp(resp)
    process.stdout.write(mesg)
    resp.end()
  } catch (e) {
    process.stdout.write(`HeapProfiler.takeHeapSnapshot error: ${e.message}`)
    throw e
  } finally {
    stopInspector()
  }
}

export function startInspector(host = '127.0.0.1', port = 9229, wait = false) {
  if (session != null) return
  try {
    inspector.open(port, host, wait)
    isInspectorOpened = true
  } catch (e) {
    if (e.code !== 'ERR_INSPECTOR_ALREADY_ACTIVATED') throw e
  }
  session = new inspector.Session()
  session.connect()
}

export function stopInspector() {
  if (session == null) return
  session.disconnect()
  session = null
  if (isInspectorOpened) inspector.close()
}

export async function startProfiler(sampleRateUs) {
  if (isProfiling) return
  isProfiling = true
  // https://nodejs.org/api/inspector.html
  await inspectorPost('Profiler.enable')
  // https://chromedevtools.github.io/devtools-protocol/v8/Profiler/
  await inspectorPost('Profiler.setSamplingInterval', { interval: sampleRateUs })
  await inspectorPost('Profiler.start')
}

export async function stopProfiler(req, resp) {
  if (!isProfiling) return Promise.reject(new Error('not profiling'))
  let profile
  try {
    const result = await inspectorPost('Profiler.stop')
    profile = result.profile

    // The stream could be a curl, wget, or http request which saves to a remote file
  } catch (error) {
    isProfiling = false
    throw error
  }
  return new Promise((resolve, reject) => {
    // BFJ yields frequently to avoid monopolising the event loop
    const bjfStream = bfj.streamify(profile)
      .on('end', () => {
        isProfiling = false
        resolve()
      })
      .on('error', (err) => {
        isProfiling = false
        reject(err)
      })
    // outputStream = fs.createWriteStream('./profile.cpuprofile')
    bjfStream.pipe(resp)
  })
}

async function streamHeapDumpToResp(resp) {
  return new Promise((resolve, reject) => {
    session.on('HeapProfiler.addHeapSnapshotChunk', (m) => {
      resp.write(m.params.chunk)
    })

    session.post('HeapProfiler.takeHeapSnapshot', null, (err, r) => {
      // sanitizer.end()

      if (err != null) {
        reject(err)
      } else {
        resolve(`HeapProfiler.takeHeapSnapshot completed, returnValue: ${r}`)
      }
    })
  })
}

async function inspectorPost(functionName, params = undefined) {
  return new Promise((resolve, reject) => {
    session.post(functionName, params, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
