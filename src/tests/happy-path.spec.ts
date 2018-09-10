import { as } from '../utils'

import { setupClient, Client, wait, minutes } from './setup'
import { nextRun } from './addresses'

import * as flowsOn from './flows-onchain'
import * as flowsOff from './flows-offchain'

let c1: NonNullable<Client>
let c2: NonNullable<Client>

// minimize number of deployments to every other 9-th run
// todo: better would be to use snapshots
beforeEach(() => {
  const { run } = nextRun()
  console.log(`CLIENT-INDEX: ${run}\n`)
  c1 = setupClient(0)
  c2 = setupClient(run)
})

afterEach(() => {
  c1.dispose()
  c2.dispose()
})

describe('integration::happy-path -- base', () => {
  const createAndClose = (forceSettle: boolean) => flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
    .then((x) => {
      expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true)
      return x
    })
    .then(ch => flowsOn.closeChannel(c1, c2, ch.channel, forceSettle))
    .then(flowsOn.checkBalances(as.Wei(0), as.Wei(50)))

  test('create and close - force settle', () => createAndClose(true), minutes(0.2))
  // TODO: discuss seems auto settle should not be supported
  // test.only('create and close - auto settle', () => createAndClose(false), minutes(0.2))
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
      .then(() => flowsOn.closeChannelWithTransferUpdate(c1, c2, 2))
      .then(flowsOn.checkBalances(as.Wei(40), as.Wei(50)))
    , minutes(0.2))

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
      .then(() => flowsOn.closeChannelWithTransferUpdate(c1, c2, 1))
      .then(flowsOn.checkBalances(as.Wei(50), as.Wei(50)))
    , minutes(0.2))
})

describe('integration::happy-path -- mediated transfer', () => {
  test('only owner', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(20)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(20), c2, as.Wei(0))).toBe(true))
      // .then(() => expect(flowsOff.sendMediated(c1, c2, as.Wei(51))).toThrow()) error but via callback
      .then(flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(30)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(50), c2, as.Wei(0))).toBe(true))
      .then(() => flowsOn.closeChannelWithTransferUpdate(c1, c2, 1))
      .then(flowsOn.checkBalances(as.Wei(50), as.Wei(50)))
    , minutes(0.2))

  test('back and forth', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(50))
      .then(() => wait(111))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(20)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(20), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(30)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(50), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediatedHappyPath(c2, c1, as.Wei(50)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(50), c2, as.Wei(50))).toBe(true))
      // .then(() => expect(() => flowsOff.sendMediated(c2, c1, as.Wei(40))()).toThrow())
      // .then(() => expect(() => flowsOff.sendMediated(c1, c2, as.Wei(81))()).toThrow())
      .then(flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(50)))
      .then(() =>
        expect(flowsOff.transferredEqual(c1, as.Wei(100), c2, as.Wei(50))).toBe(true)
      )
      .then(() => flowsOn.closeChannelWithTransferUpdate(c1, c2, 1))
      .then(flowsOn.checkBalances(as.Wei(50), as.Wei(50)))
    , minutes(0.2))
})

describe('integration::happy-path -- mediated and direct transfer', () => {
  test('only owner', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(500))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(200)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendDirect(c1, c2, as.Wei(400)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(400), c2, as.Wei(0))).toBe(true))
      .then(() => flowsOn.closeChannelWithTransferUpdate(c1, c2, 1))
      .then(flowsOn.checkBalances(as.Wei(400), as.Wei(500)))
    , minutes(0.2))

  test('back and forth', () =>
    flowsOn.createChannelAndDeposit(c1, c2, as.Wei(500))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(0), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendDirect(c1, c2, as.Wei(200)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(0))).toBe(true))
      .then(flowsOff.sendMediatedHappyPath(c2, c1, as.Wei(50)))
      .then(flowsOff.sendMediatedHappyPath(c2, c1, as.Wei(50)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(100))).toBe(true))
      .then(() => expect(() => flowsOff.sendDirect(c2, c1, as.Wei(201))()).toThrow())
      .then(flowsOff.sendDirect(c2, c1, as.Wei(150)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(150))).toBe(true))
      .then(flowsOff.sendMediatedHappyPath(c2, c1, as.Wei(50)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(200), c2, as.Wei(200))).toBe(true))
      .then(flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(50)))
      .then(flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(50)))
      .then(flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(50)))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(350), c2, as.Wei(200))).toBe(true))
      .then(() => Promise.all([
        flowsOff.sendMediatedHappyPath(c1, c2, as.Wei(100))(),
        flowsOff.sendDirect(c2, c1, as.Wei(250))()
      ]))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(450), c2, as.Wei(250))).toBe(true))
      .then(() => Promise.all([
        flowsOff.sendDirect(c1, c2, as.Wei(500))(),
        flowsOff.sendMediatedHappyPath(c2, c1, as.Wei(50))()
      ]))
      .then(() => expect(flowsOff.transferredEqual(c1, as.Wei(500), c2, as.Wei(300))).toBe(true))
      .then(() => flowsOn.closeChannelWithTransferUpdate(c1, c2, 2))
      .then(flowsOn.checkBalances(as.Wei(200), as.Wei(500)))
    , minutes(0.4))
})
