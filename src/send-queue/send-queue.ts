import { Subject } from 'rxjs/Subject'
import { Observable } from 'rxjs/Observable'

import * as T from '../types'

const MAX_CONCURRENCY = 5
const WAIT_AFTER_ERROR = 5000
const STORAGE_KEY = '___SEND_QUEUE___'

export class SendQueue implements T.SendQueue {
  private _sendingQueue: T.SendQueueItem[] = []
  private _process = new Subject()
  private _sub: any
  private _storage: T.Storage

  constructor (i: T.SendQueueConfig) {
    this._storage = i.storage
    this._sub = this._process
      .exhaustMap(() =>
        this._sendingQueue.length === 0 ?
          Observable.empty() :
          Observable.from(this._sendingQueue)
            .mergeMap(i =>
              Observable.defer(() => fetch(i.url, {
                method: i.method,
                headers: i.headers,
                body: i.body
              }))
                .mergeMap((r: any) =>
                  r && r.status === 200 ?
                    Observable.defer(() => {
                      this._sendingQueue = this._sendingQueue.filter(s => s !== i)
                      return this._storage
                        .setItem(STORAGE_KEY,
                          JSON.stringify(this._sendingQueue))
                    })
                      .map(() => false)
                    : Observable.of(true)
                )
                .catch((err) => {
                  console.log('ERR', err)
                  return Observable.of(true)
                })
              , MAX_CONCURRENCY)
            // true indicates that there was an error
            .reduce((a, r) => a || r, false)
            .do(r => console.log('SENDING-BATCH-DONE, any erros?', r))
            .map((anyErr) =>
              anyErr ?
                // wait if there was an error
                Observable.timer(WAIT_AFTER_ERROR)
                  .map(() => true) :
                Observable.of(true)
            )
            .switchMap(a => a
              .do(() => this._process.next())
            )
      ).subscribe()

    this._storage.getItem(STORAGE_KEY)
      .then(i => {
        console.log('QUEUE-PER', i)
        if (i) {
          this._sendingQueue = JSON.parse(i)
          console.log('LOADED-QUEUE, COUNT:', this._sendingQueue.length)
          this._process.next()
        }
      })
  }

  send = (i) => {
    this._sendingQueue.push(i)
    return this._storage.setItem(STORAGE_KEY, JSON.stringify(this._sendingQueue))
      .then(() => {
        this._process.next()
        return true
      })
  }

  dispose = () => {
    this._sub.unsubscribe()
  }
}
