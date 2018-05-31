"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Observable_1 = require("rxjs/Observable");
const Subject_1 = require("rxjs/Subject");
const BehaviorSubject_1 = require("rxjs/BehaviorSubject");
const events_1 = require("events");
const log_decoder_1 = require("./log-decoder");
// todo: make it configurable
const KEY_PREFIX = '___ETH_MONITORING___';
const LOGS_INTERVAL = 5 * 1000;
const TRANSACTION_INTERVAL = 5 * 1000;
class Monitoring {
    constructor(cfg) {
        this._em = new events_1.EventEmitter();
        this._transactions = new Subject_1.Subject();
        this._blockNumberSub = new BehaviorSubject_1.BehaviorSubject(undefined);
        this._forceMonitoring = new Subject_1.Subject();
        this._toSubscribe = [];
        this.subscribeAddress = (a) => this._state.then(s => {
            if (s.addresses.find(_a => _a[0] === a))
                return Promise.resolve(false);
            s.addresses.push([a, -1]);
            this._forceMonitoring.next(true);
            return this._saveState(s);
        });
        this.unsubscribeAddress = (a) => {
            if (a === this._cfg.channelManagerAddress)
                return Promise.resolve(false);
            return this._state.then(s => {
                s.addresses = s.addresses.filter(_a => _a[0] === a);
                return this._saveState(s);
            });
        };
        this.transactionReceiptWithPersistance = (tx) => {
            return this._state.then(s => {
                if (s.transactions.find(tx)) {
                    return false;
                }
                s.transactions.push(tx);
                return this._saveState(s)
                    .then(() => this._transactions.next(tx))
                    .then(() => true);
            });
        };
        this.transactionReceipt = (tx) => Observable_1.Observable.timer(0, TRANSACTION_INTERVAL)
            .switchMap(() => Observable_1.Observable.defer(() => this._cfg.getTransactionReceipt(tx))
            .catch((err) => {
            console.log('TRANSACTION_MONITORING_ERROR', err);
            return Observable_1.Observable.empty();
        }))
            .take(1)
            .toPromise();
        this.dispose = () => this._sub && this._sub.unsubscribe();
        this._blockNumber = () => this._blockNumberSub.value;
        this._monitorBlockNumber = () => Observable_1.Observable.timer(0, LOGS_INTERVAL)
            .switchMap(() => Observable_1.Observable.defer(() => this._cfg.blockNumber())
            .retryWhen(errs => errs.delay(1000)))
            .map(x => parseInt(x, 16))
            // .do(x => console.log('CURRENT_BLOCK', x))
            .do(x => x !== this._blockNumber() && this._blockNumberSub.next(x));
        this._monitorAddresses = () => Observable_1.Observable.combineLatest(this._blockNumberSub, this._forceMonitoring.merge(Observable_1.Observable.of(true)), n => n)
            // .do(x => console.log('BN-SUBJECT', x))
            .filter(x => x !== undefined)
            .do(bn => console.log('MONITORING -- BLOCK: ', bn))
            .exhaustMap((blockNumber) => Observable_1.Observable.defer(() => this._state)
            .mergeMap((s) => Observable_1.Observable.from(s.addresses)
            .groupBy(a => a[1])
            // .do(xs => console.log('BY-LAST-BLOCK', xs.key))
            .mergeMap(xs => xs
            .map(x => x[0])
            .reduce((acc, x) => acc.concat([x]), [])
            .mergeMap(gs => Observable_1.Observable.defer(() => {
            if (xs.key < blockNumber) {
                // console.log(xs.key, blockNumber, gs)
                return this._cfg.getLogs(xs.key + 1, blockNumber, gs);
            }
            else {
                return Observable_1.Observable.of([]);
            }
        })
            .map(logs => logs.map(log_decoder_1.decode))
            .reduce((acc, logs) => ({
            logs: acc.logs.concat(logs),
            addresses: acc.addresses.concat(gs)
        }), { logs: [], addresses: [] })))
            .do(x => x.logs.length && console.log('BLOCK:', blockNumber, ' -- NEW_EVENTS_COUNT:', x.logs.length, ' ADDRESSES COUNT: ', s.addresses.length))
            // .do(x => console.log('NEW_EVENTS', x.logs))
            .do(({ logs }) => logs.forEach(l => this._em.emit(l._type, l)))
            .mergeMap(({ addresses }) => {
            addresses.forEach(add => {
                const a = s.addresses.find(_a => _a[0] === add);
                if (a) {
                    a[1] = blockNumber;
                }
            });
            return this._saveState(s);
        }))
            .retryWhen(errs => errs
            .do(e => console.warn('ERR', e))
            .delay(1000)));
        this._monitorTransactions = () => this._transactions
            .mergeMap(t => Observable_1.Observable.timer(0, TRANSACTION_INTERVAL)
            .switchMap(() => Observable_1.Observable.defer(() => this._cfg.getTransactionReceipt(t))
            .catch((err) => {
            console.log('TRANSACTION_MONITORING_ERROR', err);
            return Observable_1.Observable.empty();
        }))
            .take(1));
        this._saveState = (s) => this._cfg.storage.setItem(KEY_PREFIX + this._cfg.channelManagerAddress, JSON.stringify(s));
        this._cfg = cfg;
        this._state = cfg.storage.getItem(KEY_PREFIX + cfg.channelManagerAddress)
            .then(s => s ? JSON.parse(s) : {
            addresses: [
                [cfg.channelManagerAddress, -1],
                ...cfg.tokenAddresses.map(t => [t, -1])
            ]
        });
        this._sub =
            this._monitorAddresses()
                .merge(this._monitorBlockNumber(), this._monitorTransactions())
                .subscribe();
    }
    on(event, listener) {
        this._em.on(event, listener);
    }
    off(event, listener) {
        this._em.removeListener(event, listener);
    }
}
exports.Monitoring = Monitoring;
//# sourceMappingURL=monitoring.js.map