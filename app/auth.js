import cloneDeep from 'lodash.clonedeep'
import merge from 'lodash.merge'

const defaultState = {
  authentication: {
    basic: {
      username: undefined,
      password: undefined,
    },
    bearerToken: undefined,
    authorizationToken: undefined, // either a provided token or the base64 of the username:password
  },
  rateLimiting: {
    initialDelayMs: 1000,
    decayRate: 10, // 1 sec, 10, sec, 100 sec (1:40), 1000 sec (16:40)
    consecutiveFailures: 0, // reset to 0 on successful login
    curTimeoutMs: Date.now() - 1, // set to next timeout time
  },
}

let state = {}

// for testing
// eslint-disable-next-line no-underscore-dangle
export function _getState() {
  return state
}

export function getAuthMiddleware(authOptions) {
  state = cloneDeep(defaultState)

  if (authOptions != null) {
    merge(state.authentication, cloneDeep(authOptions))
  }

  if (state?.authentication?.basic?.username != null && state?.authentication?.basic?.password != null) {
    state.authentication.authorizationToken = Buffer.from(`${state?.authentication?.basic?.username}:${state?.authentication?.basic?.password}`).toString('base64')
    process.stdout.write('Heap/Profiler server basic auth enabled, ')
  }

  if (state?.authentication?.bearerToken != null) {
    state.authentication.authorizationToken = state?.authentication?.bearerToken
    process.stdout.write('Heap/Profiler server bearer auth enabled, ')
  }

  if (state?.authentication?.authorizationToken == null) {
    process.stdout.write('WARNING: Heap/Profiler server auth disabled, ')
    return null
  }

  return authenticate
}

function authenticate(req, resp, next) {
  // no auth required, all next middleware
  if (state?.authentication?.authorizationToken == null) {
    return next()
  }

  // rate limiting too early, return 429
  if (Date.now() < state.rateLimiting.curTimeoutMs) {
    return resp.status(429).send('Too many unauthorized requests, rate limiting')
  }

  // no authorization header provided and auth is required, bump rate limiting, return 401
  if (req.headers.authorization == null && state?.authentication?.authorizationToken != null) {
    return resp.set('WWW-Authenticate', 'Basic').status(401).send('Unauthorized')
  }

  let reqAuthToken = null
  if (state.authentication.bearerToken != null) {
    // basic
    reqAuthToken = getReqAuthToken(req, 'Bearer')
  } else {
    // bearer
    reqAuthToken = getReqAuthToken(req, 'Basic')
  }

  if (reqAuthToken == null) {
    return resp.status(401).send('Unauthorized')
  }

  if (reqAuthToken !== state.authentication.authorizationToken) {
    bumpRateLimiting()
    return resp.status(401).send('Unauthorized')
  }

  state.rateLimiting.consecutiveFailures = 0
  return next()
}

function bumpRateLimiting() {
  ++state.rateLimiting.consecutiveFailures
  state.rateLimiting.curTimeoutMs = Date.now() + state.rateLimiting.initialDelayMs * state.rateLimiting.decayRate ** state.rateLimiting.consecutiveFailures
}

function getReqAuthToken(req, type) {
  const typeIdx = req.headers.authorization.indexOf(type)
  if (typeIdx === -1) return null
  if (req.headers.authorization.length < type.length + 1) return null
  const token = req.headers.authorization.substring(typeIdx + type.length + 1)
  return token
}
