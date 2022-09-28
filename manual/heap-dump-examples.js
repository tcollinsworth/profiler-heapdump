import microtime from "microtime";
import delay from "delay";

let largeObject = {
  largeString: '',
  largeArray: [],
  largeMap: new Map(),
}

class largeClass {
  constructor(obj) {
    this.largeObject = obj
  }
}

let largeClassObject = new largeClass(largeObject)

// ramp memory
let maxSize = 100000
export async function init() {
  let tsUs = microtime.now()
  for (let i = 0; i < maxSize; i++) {
    if (i % 10 != 0) {
      largeObject.largeString += i
      largeObject.largeArray.push(i)
      largeObject.largeMap.set('' + i, i)
      continue
    }
    if (i % 10000 == 0) console.log(i)
    tsUs = tsUs + 3000
    let waitTil = tsUs - microtime.now()
    if (waitTil > 0) await delay(waitTil)
  }
  console.log(maxSize)
}
