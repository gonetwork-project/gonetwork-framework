import { as, BN } from '../utils'

import { setupClient, Client, monitoring } from './setup'
import { init } from './init-contracts'
import * as flows from './flows-onchain'
import { Subscription } from 'rxjs/Subscription'
import { Observable } from 'rxjs/Observable'

const minutes = n => n * 60 * 1000

let c1: NonNullable<Client>
let c2: NonNullable<Client>

let sub: Subscription

// minimize number of deployments to every other 9-th run
beforeAll(() => {
  const { run } = init()
  console.log(`\n\nRUN: ${run}\n\n `)
  c1 = setupClient(0, { monitoringInterval: 0.5 * 1000 })
  c2 = setupClient(run, { monitoringInterval: 200 * 1000 })

  sub = Observable.from([c1, c2])
    .mergeMap((c, idx) => c.blockchain.monitoring.protocolErrors()
      .do(errs => console.warn(`Client-${idx} PROTOCOL-ERRORS ${errs.length}`))
    )
    .subscribe()

  c1.blockchain.monitoring.on('*', c1.engine.onBlockchainEvent)
  c2.blockchain.monitoring.on('*', c2.engine.onBlockchainEvent)
})

afterAll(() => {
  if (sub) {
    sub.unsubscribe()
    c1.blockchain.monitoring.dispose()
    c1.blockchain.monitoring.off('*', c1.engine.onBlockchainEvent)

    c2.blockchain.monitoring.dispose()
    c2.blockchain.monitoring.off('*', c2.engine.onBlockchainEvent)
  }
})

test('e2e::happy-path', () =>
  flows.createChannelAndDeposit(c1, c2, as.Wei(50))
    .then(() => monitoring.wait(2000))
    .then(() => console.log('WAITED 2 secs'))
    .then(() => c1.engine.sendDirectTransfer(c2.owner.address, new BN(50)))
  , minutes(2))
