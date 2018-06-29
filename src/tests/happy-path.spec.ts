import { as } from '../utils'

import { setupClient, Client } from './setup'
import { init } from './init-contracts'
import * as flows from './flows'

const secondes = n => n * 1000
const minutes = n => n * 60 * 1000

let c1 // = setupClient(0)
let c2 // = setupClient(1)

beforeAll(() => {
  init(true)
  c1 = setupClient(0)
  c2 = setupClient(1)
})

test('e2e::happy-path', () =>
  flows.createChannelAndDeposit(c1, c2, as.Wei(2000))
    .then(x => console.log(x))
, minutes(2))
