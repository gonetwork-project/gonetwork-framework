"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Subject_1 = require("rxjs/Subject");
const Observable_1 = require("rxjs/Observable");
const MAX_CONCURRENCY = 5;
const WAIT_AFTER_ERROR = 5000;
const STORAGE_KEY = '___SEND_QUEUE___';
class SendQueue {
    constructor(i) {
        this._sendingQueue = [];
        this._process = new Subject_1.Subject();
        this.send = (i) => {
            this._sendingQueue.push(i);
            return this._storage.setItem(STORAGE_KEY, JSON.stringify(this._sendingQueue))
                .then(() => {
                this._process.next();
                return true;
            });
        };
        this.dispose = () => {
            this._sub.unsubscribe();
        };
        this._storage = i.storage;
        this._sub = this._process
            .exhaustMap(() => this._sendingQueue.length === 0 ?
            Observable_1.Observable.empty() :
            Observable_1.Observable.from(this._sendingQueue)
                .mergeMap(i => Observable_1.Observable.defer(() => fetch(i.url, {
                method: i.method,
                headers: i.headers,
                body: i.body
            }))
                .mergeMap(r => r && r.status === 200 ?
                Observable_1.Observable.defer(() => {
                    this._sendingQueue = this._sendingQueue.filter(s => s !== i);
                    return this._storage
                        .setItem(STORAGE_KEY, JSON.stringify(this._sendingQueue));
                })
                    .map(() => false)
                : Observable_1.Observable.of(true))
                .catch((err) => {
                console.log('ERR', err);
                return Observable_1.Observable.of(true);
            }), MAX_CONCURRENCY)
                // true indicates that there was an error
                .reduce((a, r) => a || r, false)
                .do(r => console.log('SENDING-BATCH-DONE, any erros?', r))
                .map((anyErr) => anyErr ?
                // wait if there was an error
                Observable_1.Observable.timer(WAIT_AFTER_ERROR)
                    .map(() => true) :
                Observable_1.Observable.of(true))
                .switchMap(a => a
                .do(() => this._process.next()))).subscribe();
        this._storage.getItem(STORAGE_KEY)
            .then(i => {
            console.log('QUEUE-PER', i);
            if (i) {
                this._sendingQueue = JSON.parse(i);
                console.log('LOADED-QUEUE, COUNT:', this._sendingQueue.length);
                this._process.next();
            }
        });
    }
}
exports.SendQueue = SendQueue;
//# sourceMappingURL=send-queue.js.map