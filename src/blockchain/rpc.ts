import * as E from 'eth-types'
import { BN } from 'bn.js'
import { as, serializeRpcParam } from '../utils'

export type CallSpec<Params extends {}, Out> = [Params, Out]
export type SupportedCalls = {
  getTransactionCount: CallSpec<{ address: E.Address }, BN>
}

// name, params, order
export type ImplementationSpec<Params extends {}, Out> = [string, (keyof Params)[], (r: string) => Out]
export type ImplementationSpecs = {
  [K in keyof SupportedCalls]: ImplementationSpec<SupportedCalls[K][0], SupportedCalls[K][1]>
}

export type Implementation<Params extends {}, Out> = (p: Params) => Promise<Out>
export type Implementations = {
  [K in keyof SupportedCalls]: Implementation<SupportedCalls[K][0], SupportedCalls[K][1]>
}
export type ImplementationsFn = (p: string) => Implementations

let id = 0
const nextId = () => {
  if (id === Number.MAX_SAFE_INTEGER) {
    id = 0
  }
  return ++id
}

export const partialImplementation: ImplementationSpecs = {
  getTransactionCount: ['eth_getTransactionCount', ['address'], as.Nonce]
}

const formRequestFn = (providerUrl: string, requestFn: typeof fetch, spec: Implementation<any, any>) =>
  (params: object) =>
    requestFn(providerUrl, {
      method: 'POST',
      headers: {
        contentType: 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: nextId(),
        method: spec[0],
        params: spec[1]
          .map(a => serializeRpcParam(params[a]))
      })
    })
      .then(res => res.status === 200 ?
        res.json().then((r: any) => {
          console.log(r)
          return spec[2](r.result)
        })
        : Promise.reject(res))

const implementation: ImplementationsFn = (providerUrl: string, requestFn: typeof fetch = fetch) =>
  Object.keys(partialImplementation)
    .reduce((acc, k) => {
      acc[k] = formRequestFn(providerUrl, requestFn, partialImplementation[k])
      return acc
    }, {} as Implementations)

export default implementation
