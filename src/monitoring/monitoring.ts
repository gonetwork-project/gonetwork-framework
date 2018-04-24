import { Observable } from 'rxjs/Observable'
import { EventEmitter } from 'events'

import * as T from '../types'

const KEY_PREFIX = '___ETH_MONITORING___'
const INTERVAL = 60 * 1000

export interface State {
  blockNumber: T.EthBlock
  address: T.EthAddress[]
}

export class Monitoring implements T.EthMonitoring {
  private _cfg: T.EthMonitoringConfig
  private _em = new EventEmitter()
  private _state: Promise<State>
  private _sub: any

  constructor (cfg: T.EthMonitoringConfig) {
    this._cfg = cfg
    this._state = cfg.storage.getItem(KEY_PREFIX + cfg.registry)
        .then(s => s ? JSON.parse(s) : {
          address: [cfg.registry]
        })
        .then((s: State) => {
          console.log('STATE', s)
          if (!s.blockNumber) {
            return Observable.defer(() =>
              cfg.blockNumber()
            ).retryWhen(errs => errs
              .do(x => console.log('ERR', x))
              .delay(1000))
              .toPromise()
              .then(b => {
                console.log('BLOCK_NUMBER', b)
                s.blockNumber = b
                return s
              })
          }
          return s
        })
    this._sub = Observable.timer(0, INTERVAL)
      .switchMap(() =>
        Observable.defer(() =>
          this._state
            .then(s => {
              // console.log('M-STATE', s)
              return this._cfg.getLogs(s.blockNumber, s.address)
            })
        )
          .do((x) => console.log('MONITORING', x))
          .retryWhen(errs => errs
            .do(e => console.warn('ERR', e))
            .delay(1000))
      ).subscribe()
  }

  subscribeChannel = (a) =>
    this._state.then(s => {
      console.log('SUB', a, s)
      if (s.address.find(_a => _a === a)) return Promise.resolve(false)
      s.address.push(a)
      return this._cfg.storage.setItem(KEY_PREFIX + this._cfg.registry,
        JSON.stringify(s))
    })

  unsubscribeChannel = (a) => {
    if (a === this._cfg.registry) return Promise.resolve(false)
    return this._state.then(s => {
      s.address = s.address.filter(_a => a !== _a)
      return this._cfg.storage.setItem(KEY_PREFIX + this._cfg.registry,
        JSON.stringify(this._state))
    })
  }

  on (event: 'events', listener: (...args: any[]) => void) {
    this._em.on(event, listener)
  }

  off (event: 'events', listener: (...args: any[]) => void) {
    this._em.removeListener(event, listener)
  }

  dispose = () => this._sub && this._sub.unsubscribe()

}
