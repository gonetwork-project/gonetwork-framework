import { as, serializeRpcParam, decodeLogs, nextId, parseTxReceipt } from '../utils'

import * as T from '../types'
import * as E from 'eth-types'

// very light implementation of: https://github.com/ethereum/wiki/wiki/JSON-RPC

export interface LogsParams {
  fromBlock: E.DefaultBlock,
  toBlock: E.DefaultBlock,
  address?: E.Address | E.Address[]
  topics?: E.Topic[]
  // blockhash?: never // future
}

export type EthIOSpec<Params extends ({} | null), Out> = [Params, Out]
export type SupportedCalls = {
  blockNumber: EthIOSpec<null, E.BlockNumber>
  getBalance: EthIOSpec<{ address: E.Address, defaultBlock?: E.DefaultBlock }, E.Wei>

  // please mind only events of our interest and stripped from any add / if needed please make generic
  getLogs: EthIOSpec<LogsParams, T.BlockchainEvent[]>

  // Tx
  getTransactionCount: EthIOSpec<{ address: E.Address, defaultBlock?: E.DefaultBlock }, E.Nonce>
  getTransactionReceipt: EthIOSpec<E.TxHash, E.TxReceipt | null>
  sendRawTransaction: EthIOSpec<E.TxRaw, E.TxHash>
  call: EthIOSpec<{
    params: E.TxConstParams, defaultBlock?: E.DefaultBlock
  }, Buffer>,
  estimateGas: EthIOSpec<E.TxParams, E.Gas>
  gasPrice: EthIOSpec<null, E.GasPrice>
}

// name, order, parse-result, defaults
export type ImplementationSpec<Params extends ({} | null), Out> = [
  string,
  null | (keyof Params)[],
  ((r: any) => Out),
  null | Partial<Params>]
export type ImplementationSpecs = {
  [K in keyof SupportedCalls]: ImplementationSpec<SupportedCalls[K][0], SupportedCalls[K][1]>
}

export type RPCCall<Params extends ({} | null), Out> =
  Params extends {} ? (p: Params) => Promise<Out> : () => Promise<Out>
export type RPC = {
  [K in keyof SupportedCalls]: RPCCall<SupportedCalls[K][0], SupportedCalls[K][1]>
}
export type RPCCreate = (p: string) => RPC

// name, order of params, decode, defaults
// in case of order: pass `null` if no params, `[]` if just one, proper order if 2 or more
export const partialImplementation: ImplementationSpecs = {
  blockNumber: ['eth_blockNumber', null, as.BlockNumber, null],
  getBalance: ['eth_getBalance', ['address', 'defaultBlock'], as.Wei, { defaultBlock: 'latest' }],

  getLogs: ['eth_getLogs', [], decodeLogs, null], // warn decodeLogs is tailored to our needs

  getTransactionCount: ['eth_getTransactionCount', ['address', 'defaultBlock'], as.Nonce, { defaultBlock: 'latest' }],
  getTransactionReceipt: ['eth_getTransactionReceipt', [], parseTxReceipt, null],
  sendRawTransaction: ['eth_sendRawTransaction', [], x => x, null],
  call: ['eth_call', ['params', 'defaultBlock'], x => x, { defaultBlock: 'latest' }],
  estimateGas: ['eth_estimateGas', [], as.Gas, null],
  gasPrice: ['eth_gasPrice', null, as.GasPrice, null]
}

const formRequestFn = (providerUrl: string, requestFn: typeof fetch, spec: ImplementationSpec<any, any>) =>
  (params: object) => {
    let ps = (spec[1] && spec[1]!.length === 0) ?
      [serializeRpcParam(params as any)] :
      (spec[1] || [])
        .map(a => (params[a] && serializeRpcParam(params[a]) || spec[3]![a as string]))

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
        params: ps
      })
    })
      .then(res => res.status === 200 ?
        res.json().then((r: any) => {
          if (r.error) {
            console.error('RPC-REQEUST-ERROR', spec[0], ps)
            // return Promise.resolve(r.error)
            return Promise.reject(r)
          }
          // if (spec[0] === 'eth_getLogs') {
          //   console.log('---> ETH_LOGS', r.result, spec[2](r.result))
          // }
          // console.log(spec[0], r)
          return spec[2](r.result)
        }) : Promise.reject(res))
  }

const implementation: RPCCreate = (providerUrl: string, requestFn: typeof fetch = fetch) =>
  Object.keys(partialImplementation)
    .reduce((acc, k) => {
      acc[k] = formRequestFn(providerUrl, requestFn, partialImplementation[k])
      return acc
    }, {} as RPC)

export default implementation
