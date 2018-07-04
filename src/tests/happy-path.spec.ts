import { as, BN } from '../utils'

import { setupClient, Client } from './setup'
import { init } from './init-contracts'
import * as flows from './flows-onchain'
import { Subscription } from 'rxjs/Subscription'
import { Observable } from 'rxjs/Observable'
import { deserializeAndDecode } from '../state-channel/message'

const minutes = n => n * 60 * 1000
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

let c1: NonNullable<Client>
let c2: NonNullable<Client>

let sub: Subscription

// minimize number of deployments to every other 9-th run
beforeAll(() => {
  const { run } = init()
  console.log(`\n\nRUN: ${run}\n\n `)
  c1 = setupClient(0)
  c2 = setupClient(run)

  sub = Observable.from([c1, c2])
    .mergeMap((c, idx) => c.blockchain.monitoring.protocolErrors()
      .do(errs => console.warn(`Client-${idx} PROTOCOL-ERRORS ${errs.length}`))
      .do(errs => console.warn(...errs.map(e => e.stack!.split('\n')).map(e => e[0] + '\n' + e[1])))
    )
    .subscribe()

  c1.blockchain.monitoring.on('*', c1.engine.onBlockchainEvent)
  c2.blockchain.monitoring.on('*', c2.engine.onBlockchainEvent)

  c1.p2p.on('message-received', msg => c1.engine.onMessage(deserializeAndDecode(msg) as any))
  c2.p2p.on('message-received', msg => c2.engine.onMessage(deserializeAndDecode(msg) as any))
})

afterAll(() => {
  if (sub) {
    sub.unsubscribe()
    c1.blockchain.monitoring.dispose()
    c1.p2p.dispose()

    c2.blockchain.monitoring.dispose()
    c2.p2p.dispose()

  }
})

test('e2e::happy-path', () =>
  flows.createChannelAndDeposit(c1, c2, as.Wei(50))
    .then(() => wait(500))
    .then(() => c1.engine.sendDirectTransfer(c2.owner.address, new BN(50)))
    .then(() => wait(500))
    .then(() => console.log(c1.engine.channelByPeer[c2.owner.addressStr], 'SENDER'))
    .then(() => console.log(c2.engine.channelByPeer[c1.owner.addressStr], 'RECEIVER'))
    .then(() => wait(200))
  , minutes(2))
