// eslint-disable-next-line no-global-assign
require = require('esm')(module /* , options */)

const {
  start,
} = require('./test-server-new-express')

start()
