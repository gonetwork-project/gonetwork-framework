import { EthMonitoringInfo, EthAddress } from '../types'

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
      // .then(x => {
      //   console.log(x.status, x.statusText)
      //   return x
      // })
      .then(r => r.status === 200 ?
        r.json()
          .then(r => {
            console.log('RESPONSE', r, params)
            return r.result
          })
        : r.text())

export const infuraMonitoring = (network: string, token: string, request = requestFactory(network, token)):
  EthMonitoringInfo => ({
    blockNumber: () => request('eth_blockNumber'),
    getLogs: (fromBlock, address, toBlock) =>
      request('eth_getLogs', { fromBlock: '0x' + Number(3044467 - 99000).toString(16), toBlock: '0x' + Number(3044467 + 2).toString(16), address: address[0] }),
    getTransactionReceipt: (tx) =>
      request('eth_getTransactionReceipt', tx)
  })
