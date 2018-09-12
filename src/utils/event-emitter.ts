import { Observable } from 'rxjs'

import { EventEmitter } from 'events'

export type EventEmitterSpec = {
  [K in (string | symbol)]: any
}

export type AsEventEmitterSpec<T extends EventEmitterSpec> = T

// this types are a modified version of https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/index.d.ts
// last-commit: 8877c9d0ac1e9b5d87bbc82898e0b519e14003b5
// additional to adds proper typing information, it restricts multi parameters callback
declare class EventEmitterTyped<T extends EventEmitterSpec> {
  static defaultMaxListeners: number
  // static listenerCount (emitter: _EventEmitter, event: string | symbol): number // deprecated

  addListener<K extends keyof T> (event: K, listener: (args: T[K]) => void): this
  on<K extends keyof T> (event: K, listener: (args: T[K]) => void): this
  once<K extends keyof T> (event: K, listener: (args: T[K]) => void): this
  prependListener<K extends keyof T> (event: K, listener: (args: T[K]) => void): this
  prependOnceListener<K extends keyof T> (event: K, listener: (args: T[K]) => void): this
  removeListener<K extends keyof T> (event: K, listener: (args: T[K]) => void): this
  removeAllListeners (event?: keyof T): this
  setMaxListeners (n: number): this
  getMaxListeners (): number
  emit<K extends keyof T> (event: K, args: T[K]): boolean
  eventNames (): Array<keyof T>
  listenerCount (type: string | symbol): number
}

// ideally it is not a default export but no idea how to hack typescript
export default EventEmitter as any as typeof EventEmitterTyped

export const asStream = <U extends EventEmitterSpec, T extends EventEmitterTyped<U>, K extends keyof U>(emitter: T, event: K) =>
  Observable.fromEvent(emitter, event as string) as Observable<U[K]>
