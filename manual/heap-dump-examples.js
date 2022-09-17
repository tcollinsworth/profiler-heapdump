
let largeString = ''

let largeArray = []

let largeObject = {}

let largeMap = new Map()

let largeClassObject

let largeCompositeObject

class largeClass {
  constructor(s, a, o, m) {
    this.largeString = s
    this.largeArray = a
    this.largeObject = o
    this.largeMap = m
  }
}

export function init() {
  for(let i=0; i<100000; i++) {
    largeString = largeString + i
    largeArray.push(i)
    largeObject['' + i] = i
    largeMap.set('' + i, i)
  }
  largeCompositeObject = { largeString, largeArray, largeObject, largeMap }
  largeClassObject = new largeClass(largeString, largeArray, largeObject, largeMap)
}
