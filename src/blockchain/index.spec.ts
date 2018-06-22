import { Observable } from 'rxjs'

import { serviceCreate } from './index'
import { config } from './spec.base'
import { CHAIN_ID } from '../utils'

const cfg = config()

const srv = serviceCreate(Object.assign({
  chainId: CHAIN_ID.ROPSTEN
}, cfg))

test('service - rpc - blockNumber', () =>
  // todo: this right now uses rpc, but would be way better to use subject from monitoring
  srv.blockNumber()
    .then(x => {
      expect(x.gte(1)).toBe(true)
    })
)

test('service - monitoring - blockNumbers', () =>
  srv.blockNumbers()
    .take(1)
    .toPromise()
    .then(x => {
      expect(x.gte(1)).toBe(true)
    })
)

test('service - monitoring - logs', () =>
  Observable.fromEvent(srv, 'ChannelNew') // implicitly it will test .on and .off
    .take(3)
    .toArray()
    .zip(
      srv.asStream('ChannelNew') // preferred than .fromEvent as support ts
        .take(3)
        .toArray())
    .toPromise()
    .then(([xs, ys]) => {
      expect(xs[1]).toBe(ys[1])
      expect(ys.length).toBe(3)
      expect(xs.filter(x => (x as any)._type === 'ChannelNew').length).toBe(3)
    }))

test('service - monitoring - tx-receipt', () =>
  srv.waitForTransactionReceipt(cfg.txHash)
    .then(x => expect(x!.transactionHash).toBe(cfg.txHash))
)
