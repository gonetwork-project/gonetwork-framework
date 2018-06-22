import { as, serializeRpcParam, serializeRpcParams } from '../utils'
import { decode, nextId } from './blockchain-utils'

import * as B from './types'
import * as T from '../types'

// very light implementation of: https://github.com/ethereum/wiki/wiki/JSON-RPC

// name, order of params, decode, defaults
// in case of order: pass `null` if no params, `[]` if just one, proper order if 2 or more
export const partialImplementation: B.ImplementationSpecs = {
  blockNumber: ['eth_blockNumber', null, as.BlockNumber, null],
  getLogs: ['eth_getLogs', [], decode, null],

  getTransactionCount: ['eth_getTransactionCount', ['address', 'defaultBlock'], as.Nonce, { defaultBlock: 'pending' }],
  getTransactionReceipt: ['eth_getTransactionReceipt', [], x => x, null]
}

const formRequestFn = (providerUrl: string, requestFn: typeof fetch, spec: B.RPCCall<any, any>) =>
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
        // this is bit of hack - in case of single parameter we do not want to wrap it in an object
        params: (spec[1] && spec[1].length === 0) ?
          [serializeRpcParam(params as any)] :
          (spec[1] || [])
            .map(a => (params[a] && serializeRpcParam(params[a]) || spec[3][a]))
      })
    })
      .then(res => res.status === 200 ?
        res.json().then((r: any) => {
          return spec[2](r.result)
        }) : Promise.reject(res))
  }

const implementation: B.RPCCreate = (providerUrl: string, requestFn: typeof fetch = fetch) =>
  Object.keys(partialImplementation)
    .reduce((acc, k) => {
      acc[k] = formRequestFn(providerUrl, requestFn, partialImplementation[k])
      return acc
    }, {} as B.RPC)

export default implementation
