
import { EventEmitter } from 'events'

import { BlockchainEventType } from './blockchain-events'
export * from './blockchain-events'

export type ChainId = string & { __CHAIN_ID__: true }
export type BlockQuantity = 'latest'

// todo: make it consistent either stirng or number
export type EthAddress = (string | Buffer | any) & { __ETH_ADDRESS__: true }
export type EthTransaction = string & { __ETH_TRANSACTION__: true }
export type EthBlock = string & { __ETH_BLOCK__: true }
export type BN = any & { __BIG_NUMBER__: true }

// broken means irrecoverable error
export type Status = 'initializing' // loading persistent state
  | 'connecting' | 'connected' | 'broken' | 'disposed'

export type CommEventType = 'status-changed' | 'message-received'

export type MessageId = number & { __MSG_ID__: true }
export type Payload = string & { __PAYLOAD__: true }
export type Ack = boolean & { __ACK__: true }

export type InternalMessageOut = [MessageId, Payload, Ack]

export type ReceivedMessage = {
  peer: EthAddress
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
  address: EthAddress
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
  send: (to: EthAddress, payload: Payload) => Promise<boolean>

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

export interface MonitoringEvent {
  // ???
}
export interface EthMonitoringInfo {
  blockNumber: () => Promise<EthBlock>
  getLogs: (fromBlock: EthBlock, address: EthAddress[],
    toBlock?: EthBlock | 'latest')
    => Promise<MonitoringEvent>
  getTransactionReceipt: (tx: EthTransaction) =>
    Promise<any>
}

export interface EthMonitoringConfig extends EthMonitoringInfo {
  channelManagerAddress: EthAddress
  tokenAddresses: EthAddress[]
  storage: Storage
}
export interface EthMonitoring {

  subscribeChannel: (ch: EthAddress) => Promise<Boolean>
  unsubscribeChannel: (ch: EthAddress) => Promise<Boolean>

  transactionReceipt: (tx: EthTransaction) => Promise<Boolean>

  // split per Event type and enforce callback types
  on: (e: BlockchainEventType, listener: (...args: any[]) => void) => void
  off: (e: BlockchainEventType, listener: (...args: any[]) => void) => void

  dispose: () => void
}

export interface BlockchainService {

}

export interface LogDecoder {

}
