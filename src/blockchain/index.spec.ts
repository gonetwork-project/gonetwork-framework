import { Observable } from 'rxjs'

import { serviceCreate } from '.'
import { config } from './spec.base'
import { IBlockchainService } from './types'

const cfg = config('infura')

if (!cfg) {
  test.skip('skipped - infura only', () => undefined)
} else {
  let srv: IBlockchainService
  beforeEach(() => {
    srv = serviceCreate(cfg)
  })

  test('service - rpc - blockNumber', () =>
    // todo: this right now uses rpc, but would be way better to use subject from monitoring
    srv.rpc.blockNumber()
      .then(x => {
        expect(x.gte(1)).toBe(true)
      })
  )

  test('service - monitoring - blockNumbers', () =>
    srv.monitoring.blockNumbers()
      .take(1)
      .toPromise()
      .then(x => {
        expect(x.gte(1)).toBe(true)
      })
  )

  test('service - monitoring - logs', () =>
    Observable.fromEvent(srv.monitoring, 'ChannelNew') // implicitly it will test .on and .off
      .take(3)
      .toArray()
      .zip(
        srv.monitoring.asStream('ChannelNew') // preferred than .fromEvent as support ts
          .take(3)
          .toArray())
      .toPromise()
      .then(([xs, ys]) => {
        expect(xs[1]).toBe(ys[1])
        expect(ys.length).toBe(3)
        expect(xs.filter(x => (x as any)._type === 'ChannelNew').length).toBe(3)
      }))

  test('service - monitoring - tx-receipt', () =>
    srv.monitoring.waitForTransaction(cfg.txHash)
      .then(x => expect(x!.transactionHash).toBe(cfg.txHash))
  )

  test('service - monitoring - subscribe', () => {
    srv.monitoring.subscribeAddress(cfg.nettingChannel)
    return srv.monitoring.asStream(['ChannelClosed', 'ChannelSettled'])
      .take(2)
      .toArray()
      .toPromise()
      .then(x => {
        expect(x.length).toBe(2)
      })
  })

  test('service - monitoring - subscribe and then unsubscribe', () => {
    // TODO fix it - the problems are
    // 1. requesting logs may take a while
    // 2. addresses are grouped

    // for not just test if we are able to subscribe and unsubscribe
    // srv.subscribeAddress(cfg.nettingChannel)
    // srv.unsubscribeAddress(cfg.nettingChannel)
    // expect('TO-DO').toBe('TO-DO')

    return srv.monitoring.subscribeAddress(cfg.nettingChannel)
      .then(() => {
        srv.monitoring.unsubscribeAddress(cfg.nettingChannel)
        return srv.monitoring.asStream(['ChannelClosed', 'ChannelSettled'])
          .mergeMapTo(Observable.throw('NO_EVENTS_EXPECTED_AFTER_UNSUBSCRIBE'))
          .merge(Observable.timer(3333).mapTo('NO_EVENTS'))
          .take(1)
          .toPromise()
          .then(x => {
            expect(x).toBe('NO_EVENTS')
          })
      })
  })
}
