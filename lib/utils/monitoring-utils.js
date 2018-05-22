"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Observable_1 = require("rxjs/Observable");
exports.monitorSingleLazy = (cfg) => Observable_1.Observable.timer(0, cfg.interval || 5000)
    .switchMap(() => Observable_1.Observable.defer(cfg.action)
    .mergeMap(t => {
    if (cfg.success(t))
        return Observable_1.Observable.of(t);
    else if (cfg.error && cfg.error(t))
        return Observable_1.Observable.throw(t);
    return Observable_1.Observable.empty();
}))
    .timeout(cfg.timeout || Infinity);
exports.monitorSingle = (cfg) => exports.monitorSingleLazy(cfg).toPromise();
exports.monitorChangesLazy = (cfg) => Observable_1.Observable.timer(0, cfg.interval || 5000)
    .switchMap(() => Observable_1.Observable.defer(cfg.action)
    .retryWhen(errs => errs.delay(1000)))
    .merge(Observable_1.Observable.of(cfg.startValue))
    .distinctUntilChanged(cfg.isChanged || ((a, b) => a === b))
    .do(cfg.onChanged)
    .mergeMap(() => Observable_1.Observable.empty());
exports.monitorChanges = (cfg) => exports.monitorChangesLazy(cfg).subscribe();
//# sourceMappingURL=monitoring-utils.js.map