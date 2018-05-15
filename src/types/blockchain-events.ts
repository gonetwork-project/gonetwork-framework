import { BN } from './index'

export type BlockchainEvent = NewBlock | NettingEvent | ManagerEvent | TokenEvent
export type BlockchainEventType = NewBlockType | NettingEventType | ManagerEventType | TokenEventType

export type NewBlockType = 'NewBlock'
export interface NewBlock {
  _type: NewBlockType
}

// NETTING CHANNEL
export type NettingEvent = ChannelNewBalance | Refund | ChannelClosed |
  TransferUpdated | ChannelSecretRevealed | ChannelSettled

export type NettingEventType = 'ChannelNewBalance' | 'Refund' | 'ChannelClosed' |
  'TransferUpdated' | 'ChannelSecretRevealed' | 'ChannelSettled'

export interface NettingEventBase {
  _type: NettingEventType
}

export interface ChannelNewBalance extends NettingEventBase {
  _type: 'ChannelNewBalance'
  token_address: Buffer
  participant: Buffer
  balance: BN
}

export interface Refund extends NettingEventBase {
  _type: 'Refund'
  receiver: Buffer
  amount: BN
}

export interface ChannelClosed extends NettingEventBase {
  _type: 'ChannelClosed'
  closing_address: Buffer
}

export interface TransferUpdated extends NettingEventBase {
  _type: 'TransferUpdated'
  node_address: Buffer
}

export interface ChannelSecretRevealed extends NettingEventBase {
  _type: 'ChannelSecretRevealed'
  secret: Buffer
  receiver_address: Buffer
}

export interface ChannelSettled extends NettingEventBase {
  _type: 'ChannelSettled'
}

// CHANNEL MANAGER
export type ManagerEvent = ChannelNew | ChannelDeleted | FeesCollected

export type ManagerEventType = 'ChannelNew' | 'ChannelDeleted' | 'FeesCollected'

export interface ManagerEventBase {
  _type: ManagerEventType
}

export interface ChannelNew extends ManagerEventBase {
  _type: 'ChannelNew'
  netting_channel: Buffer
  participant1: Buffer
  participant2: Buffer
  settle_timeout: BN
}

export interface ChannelDeleted extends ManagerEventBase {
  _type: 'ChannelDeleted'
  caller_address: Buffer
  partner: Buffer
}

export interface FeesCollected extends ManagerEventBase {
  _type: 'FeesCollected'
  block: BN
  balance: BN
}

// HUMAN STANDARD TOKEN
export type TokenEvent = Approval | Transfer

export type TokenEventType = 'Approval' | 'Transfer'

export type TokenEventBase = {
  _type: TokenEventType
}

export interface Approval extends TokenEventBase {
  _type: 'Approval'
  owner: Buffer
  spender: Buffer
  value: BN
}

export interface Transfer extends TokenEventBase {
  _type: 'Transfer'
  from: Buffer
  to: Buffer
  value: BN
}
