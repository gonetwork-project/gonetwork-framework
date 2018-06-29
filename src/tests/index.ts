export * from './init-contracts'
export * from './config'

import { init } from './init-contracts'

const tokens = init()

console.log('INITED', tokens)
