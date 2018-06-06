import * as util from 'ethereumjs-util'

import { EthMonitoringInfo, EthAddress, EthBlockNumber } from '../types'

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
      .then(n => new util.BN(n)),
    getLogs: (fromBlock: EthBlockNumber, toBlock: EthBlockNumber, address: EthAddress | EthAddress[]) =>
      request('eth_getLogs', {
        // todo
        fromBlock: util.addHexPrefix(fromBlock.toString()),
        toBlock: util.addHexPrefix(toBlock.toString()),
        address: address
      }),
    getTransactionReceipt: (tx) =>
      request('eth_getTransactionReceipt', tx)
  })
