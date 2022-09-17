import delay from "delay";

export const foo = 1

setTimeout(manyAsyncExecutions, 500 + 3000)
setTimeout(otherInterleavedAsyncFunctions, 500 + 3000)
setTimeout(longSyncExecution, 1500 + 5000)

function longSyncExecution() {
  process.stdout.write('' + timedLoop(500) + '\n')
}

async function manyAsyncExecutions() {
  let i = 1
  for(; i<10; i++) {
    await asyncFunc(i)
  }
  process.stdout.write('' + i + '\n')
}

async function otherInterleavedAsyncFunctions() {
  let i = 1
  for(; i<10; i++) {
    await asyncFunc(i)
  }
  process.stdout.write('' + i + '\n')
}

async function interleavedAsyncFunc() {
  return timedLoop(50)
}

async function asyncFunc(durMs) {
  await delay(10)
  // anonymous function
  let y
  // traditional anonymous function
  (function () {
    // arrow function
    (() => {
      y = timedLoop(durMs)
    })()
  })()

  return y
}

function timedLoop(durMs) {
  const endTs = Date.now() + durMs
  let x = 0
  while(Date.now() < endTs) {
    ++x
  }
  return x
}
