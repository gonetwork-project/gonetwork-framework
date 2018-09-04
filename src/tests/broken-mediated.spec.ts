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
  console.log('ACCOUNT: ', run)
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
    c1 = setupClient(0)
    c2 = setupClient(run, createSendFn('*'))
    return flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(20)))
      // todo: discuss why c1 does not expire
      .then(() => waitForState('expiredTransfer')(c2))
  }, minutes(0.2))

  test('when no direct transfer (SecretToProof) - channel should be closed automatically by target', () => {
    c1 = setupClient(0, createSendFn(['SecretToProof']))
    c2 = setupClient(run)
    return flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(20)))
      .then(() =>
        c1.blockchain.monitoring.asStream('ChannelClosed')
          .take(1)
          .toPromise()
      )
      .then((e) => expect(e.closing_address.compare(c2.owner.address)).toBe(0))
  }, minutes(0.2))

  test.only('when no direct transfer (SecretToProof) target should be able to withdrawLocks', () => {
    c1 = setupClient(0, createSendFn(['SecretToProof']))
    c2 = setupClient(run)
    return flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then((ch) => {
        flowsOff.sendMediated(c1, c2, as.Wei(20))()
        return c1.blockchain.monitoring.asStream('ChannelClosed')
          .take(1)
          .delay(50)
          .map(e => ({ ch: ch, ev: e }))
          .toPromise()
      })
      .then(({ ch, ev }) => {
        // console.log('Withdrawing...')
        expect(ev.closing_address.compare(c2.owner.address)).toBe(0)
        // console.log(c2.engine.messageState)
        return Promise.all([
          // imporant to keep this order
          c2.blockchain.monitoring.asStream('ChannelSecretRevealed').take(1).toPromise(),
          c2.engine.withdrawPeerOpenLocks(ch.channel)
        ])
      })
  }, minutes(0.2))

  test.only('when no direct transfer (SecretToProof) target should be able to withdrawLocks - starts with successful transfer', () => {
    c1 = setupClient(0)
    c2 = setupClient(run, createSendFn(['SecretToProof']))
    return flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then((ch) => {
        return flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(20))()
          .then(() => {
            flowsOff.sendMediated(c2, c1, as.Wei(20))()
            return c1.blockchain.monitoring.asStream('ChannelClosed')
              .take(1)
              .delay(50)
              .map(e => ({ ch: ch, ev: e }))
              .toPromise()
          })
      })
      .then(({ ch, ev }) => {
        // console.log('Withdrawing...')
        expect(ev.closing_address.compare(c1.owner.address)).toBe(0)
        // console.log(c2.engine.messageState)
        return Promise.all([
          // imporant to keep this order
          c1.blockchain.monitoring.asStream('ChannelSecretRevealed').take(1).toPromise(),
          c1.engine.withdrawPeerOpenLocks(ch.channel)
        ])
      })
  }, minutes(0.2))
})
