import * as Tx from 'ethereumjs-tx'
import * as E from 'eth-types'

import * as T from '../types'
import { Observable } from 'rxjs/Observable'

export type SignatureCb = (cb: (pk: E.PrivateKey) => void) => void

export interface MonitoringConfig {
  channelManagerAddress: E.Address
  tokenAddresses: E.Address[]
  storage: T.Storage
  rpc: RPC
}
export interface Monitoring {
  blockNumbers: () => Observable<E.BlockNumber>

  subscribeAddress: (ch: E.Address) => Promise<Boolean>
  unsubscribeAddress: (ch: E.Address) => Promise<Boolean>

  waitForTransactionReceipt: (tx: E.TxHash, timeout?: number) => Promise<E.TxReceipt>

  on: <Ev extends T.BlockchainEventType>(e: Ev, listener: (args: T.EventTypeToEvent<Ev>) => void) => void
  off: <Ev extends T.BlockchainEventType>(e: Ev, listener: (args: T.EventTypeToEvent<Ev>) => void) => void

  asStream: <Ev extends T.BlockchainEventType>(e: Ev | Ev[]) =>
    Observable<T.EventTypeToEvent<Ev>>

  dispose: () => void
}

// #region RPC
export interface LogsParams {
  fromBlock: E.DefaultBlock,
  toBlock: E.DefaultBlock,
  address?: E.Address | E.Address[]
  topics?: E.Topic[]
  // blockhash?: never // future
}

export type CallSpec<Params extends ({} | null), Out> = [Params, Out]
export type SupportedCalls = {
  blockNumber: CallSpec<null, E.BlockNumber>
  // please mind only events of our interest and stripped from any add / if needed please make generic
  getLogs: CallSpec<LogsParams, T.BlockchainEvent[]>
  // Tx
  getTransactionCount: CallSpec<{ address: E.Address, defaultBlock?: E.DefaultBlock }, T.BN>
  getTransactionReceipt: CallSpec<E.TxHash, E.TxReceipt | null>
}

// name, order, parse-result, defaults
export type ImplementationSpec<Params extends ({} | null), Out> = [string, null | (keyof Params)[], ((r: any) => Out), null | Partial<Params>]
export type ImplementationSpecs = {
  [K in keyof SupportedCalls]: ImplementationSpec<SupportedCalls[K][0], SupportedCalls[K][1]>
}

export type RPCCall<Params extends ({} | null), Out> =
  Params extends {} ? (p: Params) => Promise<Out> : () => Promise<Out>
export type RPC = {
  [K in keyof SupportedCalls]: RPCCall<SupportedCalls[K][0], SupportedCalls[K][1]>
}
export type RPCCreate = (p: string) => RPC
// #endregion

export interface TxInfo {
  nonce: E.Nonce
  gasLimit: E.Gas
  gasPrice: E.GasPrice
}

export interface ContractTxConfig {
  request: (rpcBody: any, tx: Tx) => Promise<E.TxResult> // todo: add proper type
  info: (from: E.Address, value?: E.Wei) => Promise<TxInfo> // probably better to just pass this info when calling a method
  chainId: E.ChainId
  signatureCb: SignatureCb
  channelManager: E.Address // fixme
  nettingChannel: E.Address
  token: E.Address
}

export interface ServiceConfig {
  providerUrl: string
  manager: E.Address
  token: E.Address
  hsToken: E.Address

  chainId: E.ChainId
}

export interface Service extends Monitoring, RPC {

}

export type ServiceCreate = (cfg: ServiceConfig) => Service
