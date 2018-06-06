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
      .then(r => r.status === 200 ?
        r.json()
          .then((r: any) => {
            return r.result
          })
        : r.text())

const toHex = (n: number) => `0x${Number(n).toString(16)}`

export const infuraMonitoring = (network: string, token: string, request = requestFactory(network, token)):
  EthMonitoringInfo => ({
    blockNumber: () => request('eth_blockNumber'),
    getLogs: (fromBlock, toBlock, address) =>
      request('eth_getLogs', { fromBlock: toHex(fromBlock), toBlock: toHex(toBlock), address: address[0] }),
    getTransactionReceipt: (tx) =>
      request('eth_getTransactionReceipt', tx)
  })
