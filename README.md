# profile-heapdump

Provides ability to capture a profile and heapdump via a curl or wget commands which downloads the results to the local filesystem.

## Profile

Profile via a curl or wget command which downloads the results to the local filesystem.
Configurable sampling and profile duration.

For compatibility, utilizes the node.js integrated [inspector](https://nodejs.org/api/inspector.html) API.

Use when a profile is needed in a remote environment and the server is accessible, 
but not the filesystem. In kubernetes, if profiling writes to a local ephemeral filesystem
and the pod or minion crashes, the file is lost.

This library efficiently streams the results back to prevent dominating the
event thread which would unnecessarily increase latency of other requests.

Uses either a provided express app or creates a new express app.
The new express app provides auth and exponential rate limiting on auth failures.
If using a provided express app, BYO auth and rate limiting.
The auth middleware which includes rate limiting is exposed for use
with provided express apps via the getAuthMiddleware function.

Parameters:

- **durationSec** default 10 seconds
- **sampleRateUs** default 1000 us or 1 ms

The longer duration or the higher the sample rate, the more memory required and larger the file.

```shell
# default test config is basic auth, this will fail with 401

curl --compressed \
-G http://localhost:6660/debug/profile \
-d durationSec=10 \
-d sampleRateUs=1000 \
-o testProfile1.cpuprofile \
-H "Authorization: Bearer changeme"
```
OR
```shell
curl --compressed \
'http://localhost:6660/debug/profile?durationSec=10&sampleRateUs=1000' \
-o testProfile1.cpuprofile \
-u "change:me"
```
OR
```shell
wget --http-user=change --http-password=me --auth-no-challenge \
'http://localhost:6660/debug/profile?durationSec=10&sampleRateUs=1000' \
-O testProfile1.cpuprofile
```

### Curl basic auth
```shell
-u "username:password"
```

### Curl bearer auth
```shell
-H "Authorization: Bearer <TOKEN>"
```

### wget basic auth
Using '--auth-no-challenge' reduces an extra round-trip to challenge wget.
```shell
--user <user> --password <pass> --auth-no-challenge
```

### wget bearer auth
```shell
--header="Authorization: Bearer <TOKEN>"
```

### Opening Profile

- Open chrome inspector [chrome://inspect/#devices](chrome://inspect/#devices)
- Click on **_Open dedicated DevTools for Node_**
- Click on Profiler tab
- Click Load button at bottom or right click on left nav bar and click on Load
- Select a file with the extension **_.cpuprofile_** which contains JSON
- Click on the file in the left nav bar under CPU PROFILES

### Interpreting Profile
- **Self time:** How long it took to complete the current invocation of the function, including only the statements in the function itself, not including any functions that it called.
- **Total time:** The time it took to complete the current invocation of this function and any functions that it called.
- **Aggregated self time:** Aggregate time for all invocations of the function across the recording, not including functions called by this function.
- **Aggregated total time:** Aggregate total time for all invocations of the function, including functions called by this function.

## Configuration

### Init with existing express

```
import { init, shutdown } from 'profiler-heapdump'

const app = express()
// BYO auth or use built-in auth with rate-limiting

app.use('/debug', init({
  server: {
    isExistingExpressApp: true,
  },
}))

// start the server
// const server = app.listen ...
```

### Init create new express

```
import { init, shutdown } from 'profiler-heapdump'

init({
  authentication: {
    bearer: 'changeme',
  },
})

// on sigterm gracefully shutsdown the server by calling shutdown
```

### Options

Below are the defaults.
Be sure to set the authentication.

```
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
```

## Heap Dump

Get heap dump via a curl or wget command which downloads the results to the local filesystem.

```shell
# default test config is basic auth, this will fail with 401

curl --compressed \
-G http://localhost:6660/debug/heapdump \
-o testHeap.heapsnapshot \
-H "Authorization: Bearer changeme"
```
OR
```shell
curl --compressed \
'http://localhost:6660/debug/heapdump' \
-o testHeap.heapsnapshot \
-u "change:me"
```
OR
```shell
wget --http-user=change --http-password=me --auth-no-challenge \
'http://localhost:6660/debug/heapdump' \
-O testHeap.heapsnapshot
```
