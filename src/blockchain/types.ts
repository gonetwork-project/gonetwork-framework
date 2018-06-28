import * as E from 'eth-types'

import * as T from '../types'
import { Observable } from 'rxjs/Observable'

import { ContractsProxy } from './contracts-proxy'
import { P2P } from '../p2p/p2p-types'

export type SignatureCb = (cb: (pk: E.PrivateKey) => void) => void

export type WaitForConfig = {
  interval: T.Milliseconds
  timeout: T.Milliseconds
}

export interface MonitoringConfig {
  channelManagerAddress: E.Address
  tokenAddresses: E.Address[]
  storage: T.Storage
  rpc: RPC
}
export interface Monitoring {
  blockNumbers: () => Observable<E.BlockNumber>
  gasPrice: () => Promise<E.GasPrice>

  subscribeAddress: (ch: E.Address) => Promise<Boolean>
  unsubscribeAddress: (ch: E.Address) => Promise<Boolean>

  waitForTransactionRaw: (ch: E.TxHash, cfg?: Partial<WaitForConfig>) => Observable<E.TxReceipt>

  waitForTransaction: (tx: E.TxHash, cfg?: Partial<WaitForConfig>) => Promise<E.TxReceipt>

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

export type EthIOSpec<Params extends ({} | null), Out> = [Params, Out]
export type SupportedCalls = {
  blockNumber: EthIOSpec<null, E.BlockNumber>
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
  rpc: RPC
  chainId: E.ChainId
  signatureCb: SignatureCb
}

export interface ServiceConfig {
  providerUrl: string
  mqttUrl: string

  manager: E.Address
  gotToken: E.Address
  hsToken: E.Address

  chainId: E.ChainId

  // todo: Important discuss
  owner: E.Address
  signatureCb: SignatureCb
}

export interface Service {
  config: Readonly<ServiceConfig>
  monitoring: Readonly<Monitoring>
  rpc: Readonly<RPC>
  p2p: Readonly<P2P>
  contractsProxy: Readonly<ContractsProxy>
}

export type ServiceCreate = (cfg: ServiceConfig) => Readonly<Service>
