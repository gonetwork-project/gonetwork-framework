import { BN } from './index'

// NETTING CHANNEL
export type NettingEvent = ChannelNewBalance | Refund | ChannelClosed |
  TransferUpdated | ChannelSecretRevealed | ChannelSettled

export interface ChannelNewBalance {
  _type: 'ChannelNewBalance'
  token_address: Buffer
  participant: Buffer
  balance: BN
}

export interface Refund {
  _type: 'Refund'
  receiver: Buffer
  amount: BN
}

export interface ChannelClosed {
  _type: 'ChannelClosed'
  closing_address: Buffer
}

export interface TransferUpdated {
  _type: 'TransferUpdated'
  node_address: Buffer
}

export interface ChannelSecretRevealed {
  _type: 'ChannelSecretRevealed'
  secret: Buffer
  receiver_address: Buffer
}

export interface ChannelSettled {
  _type: 'ChannelSettled'
}

// CHANNEL MANAGER
export type ManagerEvent = ChannelNew | ChannelDeleted | FeesCollected

export interface ChannelNew {
  _type: 'ChannelNew'
  netting_channel: Buffer
  participant1: Buffer
  participant2: Buffer
  settle_timeout: BN
}

export interface ChannelDeleted {
  _type: 'ChannelDeleted'
  caller_address: Buffer
  partner: Buffer
}

export interface FeesCollected {
  _type: 'FeesCollected'
  block: BN
  balance: BN
}

// HUMAN STANDARD TOKEN
export type TokenEvent = Approval | Transfer

export interface Approval {
  _type: 'Approval'
  owner: Buffer
  spender: Buffer
  value: BN
}

export interface Transfer {
  _type: 'Transfer'
  from: Buffer
  to: Buffer
  value: BN
}
