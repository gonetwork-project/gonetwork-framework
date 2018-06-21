import { Observable } from 'rxjs'

import { serviceCreate } from './index'
import { infura } from './spec.base'
import { CHAIN_ID } from '../utils'
import * as T from '../types'

// todo will break in a browser environment
(global as any).fetch = require('node-fetch')

const srv = serviceCreate(Object.assign({
  chainId: CHAIN_ID.ROPSTEN
}, infura))

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
  Observable.fromEvent(srv, 'ChannelNew')
    .take(3)
    // .map((e: any) => e.netting_channel.toString('hex'))
    .toArray()
    .toPromise()
    .then(xs => {
      expect(xs.filter(x => (x as any)._type === 'ChannelNew').length).toBe(3)
    }))
