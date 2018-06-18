import * as txUtils from './tx-utils'
import * as Tx from 'ethereumjs-tx'
import * as E from 'eth-types'

import * as util from 'ethereumjs-util'

import { as } from '../utils'

import * as C from '../types/contracts'

let id = 0
const txToRPC = (tx: Tx) => ({
  'jsonrpc': '2.0',
  'method': 'eth_sendRawTransaction',
  'params': [util.addHexPrefix(tx.serialize().toString('hex'))],
  id: ++id // todo: improve (maybe uuid? or some tx hash)
})

export interface TxInfo {
  nonce: E.Nonce
  gasLimit: E.GasLimit
  gasPrice: E.GasPrice
}

export interface BlockchainConfig {
  signatureCb: (cb: (pk: E.PrivateKey) => void) => void
  request: (rpcBody: any, tx: Tx) => Promise<E.TxResult> // todo: add proper type
  info: (from: E.Address, value?: E.Wei) => Promise<TxInfo>
  chainId: E.ChainId

  channelManager: E.Address
  nettingChannel: E.Address
  token: E.Address
}

export default (cfg: BlockchainConfig) => {

  const paramsToRequest = (order: any, paramsToTx: C.FunctionCall<any, Tx>, contract: E.Address) => {
    return Object.keys(order)
      .reduce((acc, k) => {
        (acc[k] as any) = <T extends E.TxDataType[] | null>
          (data: T, from: E.Address, value: E.Wei = as.Wei(0)) =>
          cfg.info(from)
            .then(i =>
              paramsToTx[k]({
                ...i,
                value: value,
                to: contract
              })(data))
            .then(tx => {
              cfg.signatureCb(pk => tx.sign(pk))
              return cfg.request(txToRPC(tx), tx)
            })
            .then()
        return acc
      }, {} as { [k: string]: C.TxRequest<any> }) as any // todo: ideally no any cast
  }

  return {
    token: paramsToRequest(C.TokenOrdIO, txUtils.paramsToTx.token, cfg.token) as C.TxRequest<C.TokenIO>,
    manager: paramsToRequest(C.ManagerOrdIO, txUtils.paramsToTx.manager, cfg.channelManager) as C.TxRequest<C.ManagerIO>,
    channel: paramsToRequest(C.ChannelOrdIO, txUtils.paramsToTx.channel, cfg.nettingChannel) as C.TxRequest<C.ChannelIO>
  }
}
