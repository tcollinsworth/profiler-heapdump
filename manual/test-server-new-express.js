import { init } from '../api'

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
}
