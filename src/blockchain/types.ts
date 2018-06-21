import * as Tx from 'ethereumjs-tx'
import * as E from 'eth-types'

export interface TxInfo {
  nonce: E.Nonce
  gasLimit: E.GasLimit
  gasPrice: E.GasPrice
}

export interface ContractTxConfig {
  signatureCb: (cb: (pk: E.PrivateKey) => void) => void
  request: (rpcBody: any, tx: Tx) => Promise<E.TxResult> // todo: add proper type
  info: (from: E.Address, value?: E.Wei) => Promise<TxInfo> // probably better to just pass this info when calling a method
  chainId: E.ChainId

  channelManager: E.Address
  nettingChannel: E.Address
  token: E.Address
}
