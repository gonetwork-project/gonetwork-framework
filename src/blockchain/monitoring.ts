import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { EventEmitter } from 'events'

import { as, add } from '../utils'

import * as C from '../types/contracts'
import { BlockchainEventType } from '../types'
import * as T from './types'
import * as E from 'eth-types'

// todo: make it configurable
const KEY_PREFIX = '___ETH_MONITORING___'
const LOGS_INTERVAL = 5 * 1000
const TRANSACTION_INTERVAL = 5 * 1000

export type MonitorAddress = [E.Address, string]

export interface State {
  addresses: MonitorAddress[],
  transactions: E.Address[]
}

export class Monitoring implements T.Monitoring {
  private _cfg: T.MonitoringConfig
  private _em = new EventEmitter()
  private _state: Promise<State>
  private _sub: any
  private _transactions: Subject<E.TxHash> = new Subject()
  private _blockNumberSub = new BehaviorSubject<E.BlockNumber | undefined>(undefined)
  private _forceMonitoring = new Subject<boolean>()
  private _toSubscribe: E.Address[] = []

  constructor (cfg: T.MonitoringConfig) {
    this._cfg = cfg
    this._state = cfg.storage.getItem(KEY_PREFIX + cfg.channelManagerAddress)
      .then(s => s ? JSON.parse(s) : ({
        addresses: [
          [cfg.channelManagerAddress, '-1'],
          ...cfg.tokenAddresses.map(t => [t, '-1'])
        ],
        transactions: []
      }))

    this._sub =
      this._monitorAddresses()
        .merge(
          this._monitorBlockNumber()
        )
        .subscribe()

  }

  blockNumbers = () => this._blockNumberSub.filter(Boolean) as Observable<E.BlockNumber>

  subscribeAddress = (a: E.Address) =>
    this._state.then(s => {
      if (s.addresses.find(_a => _a[0] === a)) return Promise.resolve(false)
      s.addresses.push([a, '-1'])
      this._forceMonitoring.next(true)
      return this._saveState(s)
    })

  unsubscribeAddress = (a: E.Address) => {
    if (a === this._cfg.channelManagerAddress) return Promise.resolve(false)
    return this._state.then(s => {
      s.addresses = s.addresses.filter(_a => _a[0] === a)
      return this._saveState(s)
    })
  }

  asStream = (ev: BlockchainEventType | BlockchainEventType[]) =>
    Observable.from(Array.isArray(ev) ? ev : [ev])
      .mergeMap(e => Observable.fromEvent(this, e)) as Observable<any>

  waitForTransactionReceipt = (tx: E.TxHash, timeout: number = 90 * 100) =>
    Observable.timer(0, TRANSACTION_INTERVAL)
      .switchMap(() => this._cfg.rpc.getTransactionReceipt(tx))
      .filter(Boolean)
      .take(1)
      .timeout(timeout)
      .toPromise() as Promise<E.TxReceipt>

  on = (event: C.BlockchainEventType, listener: (...args: any[]) => void) => {
    this._em.on(event, listener)
  }

  off = (event: C.BlockchainEventType, listener: (...args: any[]) => void) => {
    this._em.removeListener(event, listener)
  }

  dispose = () => this._sub && this._sub.unsubscribe()

  private _blockNumber = () => this._blockNumberSub.value

  private _monitorBlockNumber = () =>
    Observable.timer(0, LOGS_INTERVAL)
      .switchMap(() =>
        Observable.defer(() => this._cfg.rpc.blockNumber())
          .retryWhen(errs => errs.delay(1000))
      )
      .do(x => !x.eq(this._blockNumber() || 0) && this._blockNumberSub.next(x))

  private _monitorAddresses = () =>
    (Observable.combineLatest(
      this._blockNumberSub,
      this._forceMonitoring.merge(Observable.of(true)),
      n => n
    )
      .filter(x => x !== undefined) as Observable<E.BlockNumber>)
      .exhaustMap(blockNumber =>
        Observable.defer(() => this._state)
          .mergeMap((s: State) =>
            Observable.from(s.addresses)
              .groupBy(a => a[1])
              .mergeMap(xs => xs
                .map(x => x[0])
                .reduce((acc, x) => acc.concat([x]), [])
                .mergeMap(gs =>
                  Observable.defer(() => {
                    const bn = as.BlockNumber(xs.key)
                    if (bn.lt(blockNumber)) {
                      return this._cfg.rpc.getLogs({
                        fromBlock: add(bn, as.BlockNumber(1)),
                        toBlock: blockNumber,
                        address: gs
                      })
                    } else {
                      return Observable.of([] as C.BlockchainEvent[])
                    }
                  })
                    .reduce((acc, logs) => ({
                      logs: acc.logs.concat(logs),
                      addresses: acc.addresses.concat(gs)
                    }), { logs: [] as any, addresses: [] as E.Address[] })
                ))
              .do(({ logs }) => logs.forEach(l => this._em.emit(l._type, l)))
              .mergeMap(({ addresses }) => {
                addresses.forEach(add => {
                  const a = s.addresses.find(_a => _a[0] === add)
                  if (a) {
                    a[1] = blockNumber.toString()
                  }
                })
                return this._saveState(s)
              })
          )
          .retryWhen(errs => errs.delay(1000))
      )

  private _saveState = (s: State) =>
    this._cfg.storage.setItem(KEY_PREFIX + this._cfg.channelManagerAddress, JSON.stringify(s))
}
