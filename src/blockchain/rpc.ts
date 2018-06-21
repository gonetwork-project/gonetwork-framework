import * as E from 'eth-types'
import { BN } from 'bn.js'
import { as, serializeRpcParam, serializeRpcParams } from '../utils'

export type CallSpec<Params extends ({} | null), Out> = [Params, Out]
export type SupportedCalls = {
  getTransactionCount: CallSpec<{ address: E.Address, defaultBlock?: E.DefaultBlock }, BN>
  getBlockNumber: CallSpec<null, E.BlockNumber>
}

// name, order, parse-result, defaults
export type ImplementationSpec<Params extends ({} | null), Out> = [string, null | (keyof Params)[], ((r: string) => Out), null | Partial<Params>]
export type ImplementationSpecs = {
  [K in keyof SupportedCalls]: ImplementationSpec<SupportedCalls[K][0], SupportedCalls[K][1]>
}

export type Implementation<Params extends ({} | null), Out> =
  Params extends {} ? (p: Params) => Promise<Out> : () => Promise<Out>
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
  getTransactionCount: ['eth_getTransactionCount', ['address', 'defaultBlock'], as.Nonce, { defaultBlock: 'pending' }],
  getBlockNumber: ['eth_blockNumber', null, as.BlockNumber, null]
}

const formRequestFn = (providerUrl: string, requestFn: typeof fetch, spec: Implementation<any, any>) =>
  (params: object) => {
    return requestFn(providerUrl, {
      method: 'POST',
      headers: {
        contentType: 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: nextId(),
        method: spec[0],
        params: (spec[1] || [])
          .map(a => (params[a] && serializeRpcParam(params[a]) || spec[3][a]))
      })
    })
      .then(res => res.status === 200 ?
        res.json().then((r: any) => {
          console.log(r)
          return spec[2](r.result)
        })
        : Promise.reject(res))
  }

const implementation: ImplementationsFn = (providerUrl: string, requestFn: typeof fetch = fetch) =>
  Object.keys(partialImplementation)
    .reduce((acc, k) => {
      acc[k] = formRequestFn(providerUrl, requestFn, partialImplementation[k])
      return acc
    }, {} as Implementations)

export default implementation
