import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { EventEmitter } from 'events'

import * as T from '../types'

const KEY_PREFIX = '___ETH_MONITORING___'
const INTERVAL = 60 * 1000

export interface State {
  blockNumber: T.EthBlock
  address: T.EthAddress[]
  transactions: T.EthTransaction[]
}

export class Monitoring implements T.EthMonitoring {
  private _cfg: T.EthMonitoringConfig
  private _em = new EventEmitter()
  private _state: Promise<State>
  private _sub: any
  private _transactions: Subject<T.EthTransaction> = new Subject()

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

    this._sub =
      this._monitorChannel()
        .merge(this._monitorTransactions())
        .subscribe()
  }

  _monitorChannel = () => Observable.timer(0, INTERVAL)
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
    )

  _monitorTransactions = () =>
    this._transactions
      .mergeMap(t =>
        Observable.of(t)
      )

  _saveState = (s: State) =>
    this._cfg.storage.setItem(KEY_PREFIX + this._cfg.registry, JSON.stringify(s))

  subscribeChannel = (a) =>
    this._state.then(s => {
      console.log('SUB', a, s)
      if (s.address.find(_a => _a === a)) return Promise.resolve(false)
      s.address.push(a)
      return this._saveState(s)
    })

  unsubscribeChannel = (a) => {
    if (a === this._cfg.registry) return Promise.resolve(false)
    return this._state.then(s => {
      s.address = s.address.filter(_a => a !== _a)
      return this._saveState(s)
    })
  }

  transactionReceipt = (t) => {
    return this._state.then(s => {
      if (s.transactions.find(t)) {
        return false
      }
      s.transactions.push(t)
      return this._saveState(s)
        .then(() => this._transactions.next(t))
        .then(() => true)
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
