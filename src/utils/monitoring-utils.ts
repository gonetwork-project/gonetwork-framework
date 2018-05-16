import { Observable } from 'rxjs/Observable'

export interface SingleConfig<T = any> {
  action: () => Promise<T>
  success: (t: T) => boolean

  error?: (e: T) => boolean
  interval?: number
  timeout?: number
  // cancel?: () => void
}

export interface ChangesConfig<T = any> {
  action: () => Promise<T>
  onChanged: (t: T) => void

  startValue?: T
  isChanged?: (t1?: T, t2?: T) => boolean // === as default
  interval?: number
}

export const monitorSingleLazy = <T = any>(cfg: SingleConfig<T>): Observable<T> =>
  Observable.timer(0, cfg.interval || 5000)
    .switchMap(() =>
      Observable.defer(cfg.action)
        .mergeMap(t => {
          if (cfg.success(t)) return Observable.of(t)
          else if (cfg.error && cfg.error(t)) return Observable.throw(t)
          return Observable.empty()
        })
    )
    .timeout<T>(cfg.timeout || Infinity)

export const monitorSingle = <T = any>(cfg: SingleConfig<T>): Promise<T> =>
  monitorSingleLazy(cfg).toPromise()

export const monitorChangesLazy = <T = any>(cfg: ChangesConfig<T>):
  Observable<never> =>
  Observable.timer(0, cfg.interval || 5000)
    .switchMap(() =>
      Observable.defer(cfg.action)
        .retryWhen(errs => errs.delay(1000))
    )
    .merge(Observable.of(cfg.startValue))
    .distinctUntilChanged(cfg.isChanged || ((a, b) => a === b))
    .do(cfg.onChanged as any)
    .mergeMap(() => Observable.empty())

export const monitorChanges = <T = any>(cfg: ChangesConfig<T>): { unsubscribe: () => void } =>
  monitorChangesLazy(cfg).subscribe()
