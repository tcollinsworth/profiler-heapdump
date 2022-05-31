// eslint-disable-next-line no-global-assign
require = require('esm-wallaby')(module /* , options */)

const {
  start,
} = require('./test-server-provided-express')

start()
