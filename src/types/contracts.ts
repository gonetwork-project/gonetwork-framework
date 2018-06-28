import { TxParamsRequired, TxParamsWithGas, GasPrice, Address, TxParams, TxHash } from 'eth-types'
import { ChannelEventTypes, ChannelEventsToArgs, ChannelIO } from '../__GEN__/NettingChannelContract'
import { ManagerEventTypes, ManagerEventsToArgs, ManagerIO } from '../__GEN__/ChannelManagerContract'
import { TokenEventTypes, TokenEventsToArgs, TokenIO, TokenOrdIO } from '../__GEN__/HumanStandardToken'

export type TxCall<T extends { [K: string]: [any, any] }> = {
  [K in keyof T]: T[K][0] extends null ?
  (params: { to: Address, from?: Address } & Partial<TxParamsWithGas>) => Promise<T[K][1]> :
  (params: { to: Address, from?: Address } & Partial<TxParamsWithGas>, data: T[K][0]) => Promise<T[K][1]>
}

export type TxEstimation<T extends { [K: string]: [any, any] }> = {
  [K in keyof T]: (params: TxParamsRequired & Partial<TxParamsWithGas>, data: T[K][0]) =>
    Promise<{
      estimatedGas: GasPrice
      txParams: TxParams
    }>
}

export type TxSendRaw<T extends { [K: string]: [any, any] }> = {
  [K in keyof T]: T[K][0] extends null ?
  (params: TxParamsRequired & Partial<TxParamsWithGas>) => Promise<TxHash> :
  (params: TxParamsRequired & Partial<TxParamsWithGas>, data: T[K][0]) => Promise<TxHash>
}

// TODO: ideally we match events with particular methods, but seems this info not present in abi
export type TxFull<T extends { [K: string]: [any, any] }, EvMap extends { [P in keyof T]: any }> = {
  [K in keyof T]: T[K][0] extends null ?
  (params: TxParamsRequired & Partial<TxParamsWithGas>) => Promise<EvMap[K][]> :
  (params: TxParamsRequired & Partial<TxParamsWithGas>, data: T[K][0]) => Promise<EvMap[K][]>
}

export type GenOrder = [
  Array<[string, string]>, // [input-name, input-type][]
  Array<[string, string]>  // [output-name, output-type][]
]

export type GenOrders = {
  [k: string]: GenOrder
}

export type ExtractEvents<E, K extends keyof E> = E[K]

export type TokenEvents = ExtractEvents<TokenEventsToArgs, TokenEventTypes>
export type ManagerEvents = ExtractEvents<ManagerEventsToArgs, ManagerEventTypes>
export type ChannelEvents = ExtractEvents<ChannelEventsToArgs, ChannelEventTypes>

export type EventTypeToEvent<Ev extends BlockchainEventType> =
  Ev extends ChannelEventTypes ? ChannelEventsToArgs[Ev] :
  Ev extends ManagerEventTypes ? ManagerEventsToArgs[Ev] :
  Ev extends TokenEventTypes ? TokenEventsToArgs[Ev] : never

export type BlockchainEventType = ChannelEventTypes | ManagerEventTypes | TokenEventTypes

export type BlockchainEvent = ChannelEvents | ManagerEvents | TokenEvents

export type AsMethodEventMap<IO, Map extends { [P in keyof IO]: BlockchainEventType }> = {
    // [P in keyof Map]: ExtractEvents<Args, Map[P]>
    [P in keyof Map]: EventTypeToEvent<Map[P]>
  }

// TODO: make sure the maps are exhausted
type TokenEventsMapRaw = {
  approve: 'Approval'
  approveAndCall: 'Approval'
  transfer: 'Transfer'
  transferFrom: 'Transfer'
}
export type TokenEventsMap = AsMethodEventMap<TokenIO, TokenEventsMapRaw>

type ManagerEventsMapRaw = {
  collectFees: 'FeesCollected'
  transferOwnership: 'OwnershipTransferred'
  newChannel: 'ChannelNew' | 'Transfer'
}
export type ManagerEventsMap = AsMethodEventMap<ManagerIO, ManagerEventsMapRaw>

type ChannelEventsMapRaw = {
  deposit: 'ChannelNewBalance'
  close: 'ChannelClosed' | 'Refund'
  updateTransfer: 'TransferUpdated'
  withdraw: 'ChannelSecretRevealed'
  settle: 'ChannelSettled'
}
export type ChannelEventsMap = AsMethodEventMap<ChannelIO, ChannelEventsMapRaw>
