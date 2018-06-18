import * as util from 'ethereumjs-util'

import { EthMonitoringInfo } from '../types'
import { Address, BlockNumber } from 'eth-types'
import { as } from '../utils'

let i = 0

const requestFactory = (network: string, token: string) =>
  (method: 'eth_blockNumber' | 'eth_getLogs' | 'eth_getTransactionReceipt', params?: any) =>
    fetch(`https://${network}.infura.io/${token}`, {
      method: 'POST',
      headers: {
        contentType: 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++i,
        method,
        params: [params]
      })
    })
      .then(r => r.status === 200 ?
        r.json()
          .then((r: any) => r.result)
        : Promise.reject(r))
      // .then(x => {
      //   console.log(method, params, x)
      //   return x
      // })

export const infuraMonitoring = (network: string, token: string, request = requestFactory(network, token)):
  EthMonitoringInfo => ({
    blockNumber: () => request('eth_blockNumber')
      .then(n => as.BlockNumber(n)),
    getLogs: (fromBlock: BlockNumber, toBlock: BlockNumber, address: Address | Address[]) =>
      request('eth_getLogs', {
        // todo
        fromBlock: util.addHexPrefix(fromBlock.toString()),
        toBlock: util.addHexPrefix(toBlock.toString()),
        address: address
      }),
    getTransactionReceipt: (tx) =>
      request('eth_getTransactionReceipt', tx)
  })
