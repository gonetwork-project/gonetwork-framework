import { Observable } from 'rxjs'
import { as } from '../utils'

import { setupClient, Client, wait, minutes, createSendFn } from './setup'
import { nextRun } from './addresses'

import * as flowsOn from './flows-onchain'
import * as flowsOff from './flows-offchain'
import { MediatedTransferStatus, MessageState } from '../state-channel/state-machine'

let c1: NonNullable<Client>
let c2: NonNullable<Client>

let run: number
beforeEach(() => {
  run = nextRun().run
  console.log('CLIENT-INDEX', run)
  c1 = setupClient(0)
})

afterEach(() => {
  c1.dispose()
  c2.dispose()
})

const waitForState = (s: MediatedTransferStatus) => (c: Client, messageState?: () => MessageState) => {
  const ms = messageState || (() => Object.values(c.engine.messageState)[0])
  return c.blockchain.monitoring
    .blockNumbers()
    .filter(() => ms() && ms().state === s)
    .take(1)
    .toPromise()
}

describe('broken-mediated', () => {
  test('when peer not responding transfer should expire', () => {
    c2 = setupClient(run, createSendFn('*'))
    return flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(20)))
      // todo: discuss why c1 does not expire
      .then(() => waitForState('expiredTransfer')(c2))
  }, minutes(0.2))
})
