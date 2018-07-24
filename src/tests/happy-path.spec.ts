import { as } from '../utils'

import { setupClient, Client, wait, minutes } from './setup'
import { nextRun } from './addresses'
import { Subscription } from 'rxjs/Subscription'
import { Observable } from 'rxjs/Observable'
import { deserializeAndDecode } from '../state-channel/message'

import * as flowsOn from './flows-onchain'
import * as flowsOff from './flows-offchain'

let c1: NonNullable<Client>
let c2: NonNullable<Client>

let sub: Subscription

// minimize number of deployments to every other 9-th run
beforeEach(() => {
  const { run } = nextRun()
  // console.log(`CLIENT-INDEX: ${run}\n`)
  c1 = setupClient(0)
  c2 = setupClient(run)

  sub = Observable.from([c1, c2])
    .mergeMap((c, idx) => c.blockchain.monitoring.protocolErrors()
      .do(errs => console.warn(`Client-${idx} PROTOCOL-ERRORS ${errs.length}`))
      .do(errs => console.warn(...errs.map(e => e.stack!.split('\n')).map(e => e[0] + '\n' + e[1])))
    ).subscribe()

  c1.blockchain.monitoring.on('*', c1.engine.onBlockchainEvent)
  c2.blockchain.monitoring.on('*', c2.engine.onBlockchainEvent)
  // c1.blockchain.monitoring.on('*', msg => console.log('C1 <--   ', msg))
  // c2.blockchain.monitoring.on('*', msg => console.log('   --> C2', msg))

  c1.p2p.on('message-received', msg => c1.engine.onMessage(deserializeAndDecode(msg) as any))
  c2.p2p.on('message-received', msg => c2.engine.onMessage(deserializeAndDecode(msg) as any))
  // c1.p2p.on('message-received', msg => console.log('C1 <--   ', (deserializeAndDecode(msg) as any).classType))
  // c2.p2p.on('message-received', msg => console.log('   -->  C2', (deserializeAndDecode(msg) as any).classType))
})

afterEach(() => {
  if (sub) {
    sub.unsubscribe()
    c1.blockchain.monitoring.dispose()
    c1.p2p.dispose()

    c2.blockchain.monitoring.dispose()
    c2.p2p.dispose()

  }
})

describe('integration::happy-path -- base', () => {
  // todo: investigate it throws
  test.skip('create and close', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(() => flowsOn.closeChannel(c1, c2, 0))
    , minutes(1))
})

describe('integration::happy-path -- direct transfer', () => {
  test('only owner', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendDirect(c1, c2, as.Wei(20)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(20), c2, as.Wei(0))).toBe(true))
      .then(() => expect(() => flowsOff.sendDirect(c1, c2, as.Wei(51))()).toThrow())
      .then(flowsOff.sendDirect(c1, c2, as.Wei(40)))
      .then(() =>
        expect(flowsOff.transferredEqual(c1, as.Wei(40), c2, as.Wei(0))).toBe(true)
      )
      .then(() => flowsOn.closeChannel(c1, c2, 2))
      .then(flowsOn.checkBalances(as.Wei(40), as.Wei(50)))
    , minutes(1))

  test('back and forth', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendDirect(c1, c2, as.Wei(20)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(20), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendDirect(c1, c2, as.Wei(30)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(30), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendDirect(c2, c1, as.Wei(30)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(30), c2, as.Wei(30))).toBe(true))
      .then(() => expect(() => flowsOff.sendDirect(c2, c1, as.Wei(31))()).toThrow())
      .then(() => expect(() => flowsOff.sendDirect(c1, c2, as.Wei(81))()).toThrow())
      .then(flowsOff.sendDirect(c1, c2, as.Wei(80)))
      .then(() =>
        expect(flowsOff.transferredEqual(c1, as.Wei(80), c2, as.Wei(30))).toBe(true)
      )
      .then(() => flowsOn.closeChannel(c1, c2, 1))
      .then(flowsOn.checkBalances(as.Wei(50), as.Wei(50)))
    , minutes(1))
})

describe('integration::happy-path -- mediated transfer', () => {
  test('only owner', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(20)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(20), c2, as.Wei(0))).toBe(true))
      // .then(() => expect(flowsOff.sendMediated(c1, c2, as.Wei(51))).toThrow()) error but via callback
      .then(flowsOff.sendMediated(c1, c2, as.Wei(30)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(50), c2, as.Wei(0))).toBe(true))
      .then(() => flowsOn.closeChannel(c1, c2, 1))
      .then(flowsOn.checkBalances(as.Wei(50), as.Wei(50)))
    , minutes(1))

  test('back and forth', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => wait(111))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(20)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(20), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(30)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(50), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediated(c2, c1, as.Wei(50)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(50), c2, as.Wei(50))).toBe(true))
      // .then(() => expect(() => flowsOff.sendMediated(c2, c1, as.Wei(40))()).toThrow())
      // .then(() => expect(() => flowsOff.sendMediated(c1, c2, as.Wei(81))()).toThrow())
      .then(flowsOff.sendMediated(c1, c2, as.Wei(50)))
      .then(() =>
        expect(flowsOff.transferredEqual(c1, as.Wei(100), c2, as.Wei(50))).toBe(true)
      )
      .then(() => flowsOn.closeChannel(c1, c2, 1))
      .then(flowsOn.checkBalances(as.Wei(50), as.Wei(50)))
    , minutes(1))
})

describe('integration::happy-path -- mediated and direct transfer', () => {
  test('only owner', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(500))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(200)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendDirect(c1, c2, as.Wei(400)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(400), c2, as.Wei(0))).toBe(true))
      .then(() => flowsOn.closeChannel(c1, c2, 1))
      .then(flowsOn.checkBalances(as.Wei(400), as.Wei(500)))
    , minutes(1))

  test('back and forth', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(500))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendDirect(c1, c2, as.Wei(200)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediated(c2, c1, as.Wei(50)))
      .then(flowsOff.sendMediated(c2, c1, as.Wei(50)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(100))).toBe(true))
      .then(() => expect(() => flowsOff.sendDirect(c2, c1, as.Wei(201))()).toThrow())
      .then(flowsOff.sendDirect(c2, c1, as.Wei(150)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(150))).toBe(true))
      .then(flowsOff.sendMediated(c2, c1, as.Wei(50)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(200))).toBe(true))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(50)))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(50)))
      .then(flowsOff.sendMediated(c1, c2, as.Wei(50)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(350), c2, as.Wei(200))).toBe(true))
      .then(() => Promise.all([
        flowsOff.sendMediated(c1, c2, as.Wei(100))(),
        flowsOff.sendDirect(c2, c1, as.Wei(250))()
      ]))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(450), c2, as.Wei(250))).toBe(true))
      .then(() => Promise.all([
        flowsOff.sendDirect(c1, c2, as.Wei(500))(),
        flowsOff.sendMediated(c2, c1, as.Wei(50))()
      ]))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(500), c2, as.Wei(300))).toBe(true))
      .then(() => flowsOn.closeChannel(c1, c2, 2))
      .then(flowsOn.checkBalances(as.Wei(200), as.Wei(500)))
    , minutes(1))
})
