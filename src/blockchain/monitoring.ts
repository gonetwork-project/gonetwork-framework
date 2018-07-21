import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { EventEmitter } from 'events'

import { as, add } from '../utils'

import * as C from '../types/contracts'
import { BlockchainEventType, BlockchainEvent, EventTypeToEvent, Millisecond, Storage } from '../types'
import * as E from 'eth-types'
import { RPC } from './rpc'

export type MonitorAddress = [E.Address, string]

export type AnyEventMark = typeof anyEventMark
export type MonitoringEmitCb<Ev extends BlockchainEventType = BlockchainEventType> = {
  (e: AnyEventMark, listener: (args: BlockchainEvent) => any): void
  (e: Ev, listener: (args: EventTypeToEvent<Ev>) => void): void
}
export type WaitForConfig = {
  interval: Millisecond
  timeout: Millisecond
}

export type StartBlock = Exclude<E.DefaultBlock, 'pending'>

export interface MonitoringConfig {
  logsInterval: Millisecond
  channelManagerAddress: E.Address
  tokenAddresses: E.Address[]
  storage: Storage
  rpc: RPC
  startBlock?: StartBlock
}

export interface State {
  addresses: MonitorAddress[],
  transactions: E.Address[]
}

const KEY_PREFIX = '___ETH_MONITORING___'

let waitForDefault: WaitForConfig = { interval: 2 * 1000, timeout: 120 * 1000 }

const startToBlockNumber = (s: StartBlock, blockNumber: Observable<E.BlockNumber>) => {
  if (s === 'earliest') return Observable.of('-1')
  else if (s === 'latest') return blockNumber.take(1).map(b => b.toString())
  else return Observable.of(s.toString())
}

export const setWaitForDefault = (cfg: WaitForConfig) => waitForDefault = cfg

export const anyEventMark = '*'

export class Monitoring {
  private _em = new EventEmitter()
  private _state: Promise<State>
  private _sub: any

  private _protocolErrors = new Subject<Error[]>()
  private _blockNumberSub = new BehaviorSubject<E.BlockNumber | undefined>(undefined)
  private _forceMonitoring = new Subject<boolean>()

  constructor (readonly cfg: MonitoringConfig) {
    this._state = Observable.zip(
      cfg.storage.getItem(KEY_PREFIX + cfg.channelManagerAddress),
      startToBlockNumber(cfg.startBlock || 'latest', this.blockNumbers())
    )
      .toPromise()
      .then(([s, b]) => s ? JSON.parse(s) : ({
        addresses: [
          [cfg.channelManagerAddress, b],
          ...cfg.tokenAddresses.map(t => [t, b])
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

  protocolErrors = () => this._protocolErrors.asObservable()

  blockNumbers = () => this._blockNumberSub.filter(Boolean) as Observable<E.BlockNumber>
  gasPrice = () => this.cfg.rpc.gasPrice() // todo: improve monitor of gas price it in very long intervals

  subscribeAddress = (a: E.Address, s?: StartBlock) =>
    Observable.zip(
      this._state,
      startToBlockNumber(s || 'latest', this.blockNumbers())
    )
      .toPromise()
      .then(([s, b]) => {
        if (s.addresses.find(_a => _a[0].equals(a))) return Promise.resolve(false)
        s.addresses.push([a, b])
        return this._saveState(s)
          .then(() => this._forceMonitoring.next(true) || true)
      })

  unsubscribeAddress = (a: E.Address) => {
    if (a === this.cfg.channelManagerAddress) return Promise.resolve(false)
    return this._state.then(s => {
      s.addresses = s.addresses.filter(_a => !_a[0].equals(a))
      return this._saveState(s)
        .then(() => this._forceMonitoring.next(true) || true)
    })
  }

  asStream = (ev: BlockchainEventType | BlockchainEventType[] | AnyEventMark) =>
    Observable.from(Array.isArray(ev) ? ev : [ev])
      .mergeMap(e => Observable.fromEvent(this, e)) as Observable<any>

  waitForTransactionRaw = (tx: E.TxHash, cfg?: Partial<WaitForConfig>) =>
    Observable.timer(0, cfg && cfg.interval || waitForDefault.interval)
      .switchMap(() => this.cfg.rpc.getTransactionReceipt(tx) as Promise<E.TxReceipt>)
      .filter(Boolean)
      .take(1)
      .retryWhen(errs => errs.delay(3 * 1000)) // this should not happen
      .timeout(cfg && cfg.timeout || waitForDefault.timeout)

  waitForTransaction = (tx: E.TxHash, cfg?: Partial<WaitForConfig>) =>
    this.waitForTransactionRaw(tx, cfg)
      .toPromise()

  on = (event: C.BlockchainEventType | AnyEventMark, listener: (...args: any[]) => void) => {
    this._em.on(event, listener)
  }

  off = (event: C.BlockchainEventType | AnyEventMark, listener: (...args: any[]) => void) => {
    this._em.removeListener(event, listener)
  }

  dispose = () => {
    this._sub && this._sub.unsubscribe()
    this._em.removeAllListeners()
  }

  private _blockNumber = () => this._blockNumberSub.value

  private _monitorBlockNumber = () =>
    Observable.timer(0, this.cfg.logsInterval)
      .switchMap(() =>
        Observable.defer(() => this.cfg.rpc.blockNumber())
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
      .switchMap(blockNumber =>
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
                    // console.log('BLOCK_NUMBER_IN', xs.key, bn, blockNumber, bn.lt(blockNumber))
                    if (bn.lt(blockNumber)) {
                      // console.log('GETTING', bn, gs)
                      return this.cfg.rpc.getLogs({
                        fromBlock: add(bn, as.BlockNumber(1)),
                        toBlock: blockNumber,
                        address: gs
                      })
                    } else {
                      // console.log('NO_OP')
                      return Observable.of([] as C.BlockchainEvent[])
                    }
                  })
                    .reduce((acc, logs) => ({
                      logs: acc.logs.concat(logs),
                      addresses: acc.addresses.concat(gs)
                    }), { logs: [] as any, addresses: [] as E.Address[] })
                ))
              .do(({ logs, addresses }) => {
                // everything here is done synchronously so top most switchMap will not terminate it
                // console.log('LOGS', blockNumber.toString(), logs.length)
                // TODO - it may throw, which means broken protocol
                // not sure what monitoring should do in such a case
                const errs: Error[] = []
                logs.forEach(l => {
                  try {
                    this._emit(l._type, l)
                  } catch (e) { errs.push(e) }
                })
                errs.length && this._protocolErrors.next(errs)
                addresses.forEach(add => {
                  const a = s.addresses.find(_a => _a[0] === add)
                  if (a) {
                    a[1] = blockNumber.toString()
                  }
                })
                this._saveState(s)
              })
          )
          .retryWhen(errs => errs
            .do(e => console.log('err', e))
            .delay(1000))
      )

  private _emit = (t: BlockchainEventType, e: C.BlockchainEvent) => {
    // console.log('EMITTING', t, e)
    this._em.emit('*', e)
    this._em.emit(t, e)
  }

  private _saveState = (s: State) =>
    this.cfg.storage.setItem(KEY_PREFIX + this.cfg.channelManagerAddress, JSON.stringify(s))
}

export const waitForValueRaw = <P, T> (action: ((params: P) => Promise<T> | void), cfg?: Partial<WaitForConfig>) =>
  (params: P) =>
    Observable.timer(0, cfg && cfg.interval || waitForDefault.interval)
      .switchMap(() => {
        return Observable.defer(() => action(params))
          .defaultIfEmpty('SUCCESS')
          .catch(() => {
            // console.log(err)
            return Observable.of(null)
          })
      })
      .filter(Boolean)
      .take(1)
      .timeout(cfg && cfg.timeout || waitForDefault.timeout) as Observable<T>

export const waitForValue = <P, T> (action: ((params: P) => Promise<T> | void), cfg?: Partial<WaitForConfig>) =>
  (params: P) =>
    waitForValueRaw(action, cfg)(params)
      .toPromise()
