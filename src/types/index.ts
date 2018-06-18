
import { EventEmitter } from 'events'

// import { BlockchainEventType, BlockchainEvent } from './contracts'

import * as C from './contracts'

import { BN } from 'bn.js'

export { BN }
export * from './contracts'

export type ChainId = string
export type BlockQuantity = 'latest'

// todo: make it consistent either string or number
export type EthAddress = (string | Buffer)
export type EthTransaction = string
export type EthBlockNumber = BN
export type EthNonce = BN
export type EthPrivateKey = (string | Buffer)

// broken means irrecoverable error
export type Status = 'initializing' // loading persistent state
  | 'connecting' | 'connected' | 'broken' | 'disposed'

export type CommEventType = 'status-changed' | 'message-received'

export type MessageId = number & { __MSG_ID__: true }
export type Payload = string & { __PAYLOAD__: true }
export type Ack = boolean & { __ACK__: true }

export type InternalMessageOut = [MessageId, Payload, Ack]

export type ReceivedMessage = {
  peer: string
  id: MessageId
  payload: Payload
}

export type Channel = {
  outbox: InternalMessageOut[]
  lastIn: MessageId
  isBroken?: boolean
  brokenInfo?: any
}

// subset of react native AsyncStorage
export interface Storage {
  getItem: (id: string) => Promise<string | null>
  setItem: (id: string, item: string) => Promise<boolean>
  getAllKeys: () => Promise<string[]>
  // removeItem: (id: string) => Promise<boolean> todo
  multiGet: (keys: string[]) => Promise<Array<[string, any]>>
  multiSet: (xs: [string, string][]) => Promise<boolean>
}

export interface P2PConfig {
  address: string
  mqttUrl: string
  storage: Storage
}

export interface P2P {
  status: Status

  // restrict to only known events
  on: (e: CommEventType, listener: (...args: any[]) => void) => void
  off: (e: CommEventType, listener: (...args: any[]) => void) => void

  // true indicates that massage has been persisted
  // false indicates that the message will not be sent (e.g. when status: broken)
  send: (to: string, payload: Payload) => Promise<boolean>

  // cancels everything
  dispose: () => Promise<Error | null>
}

export interface SendQueueItem {
  url: string,
  body: string,
  method: 'GET' | 'POST'
  headers: {
    [k: string]: string
  }
}
export interface SendQueueConfig {
  storage: Storage
}

export interface SendQueue {
  // true indicates that message has been persisted
  send: (i: SendQueueItem) => Promise<Boolean>
}

export interface EthMonitoringInfo {
  blockNumber: () => Promise<EthBlockNumber>
  getLogs: (fromBlock: EthBlockNumber,
    toBlock: EthBlockNumber,
    address: EthAddress[])
    => Promise<C.BlockchainEvent[]>
  getTransactionReceipt: (tx: EthTransaction) =>
    Promise<any>
}

export interface EthMonitoringConfig extends EthMonitoringInfo {
  channelManagerAddress: EthAddress
  tokenAddresses: EthAddress[]
  storage: Storage
}
export interface EthMonitoring {

  subscribeAddress: (ch: EthAddress) => Promise<Boolean>
  unsubscribeAddress: (ch: EthAddress) => Promise<Boolean>

  transactionReceipt: (tx: EthTransaction) => Promise<Boolean>

  // split per Event type and enforce callback types
  on: (e: C.BlockchainEventType, listener: (...args: any[]) => void) => void
  off: (e: C.BlockchainEventType, listener: (...args: any[]) => void) => void

  dispose: () => void
}

export interface BlockchainService {

}
