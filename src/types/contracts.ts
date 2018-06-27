import { TxParamsRequired, TxParamsWithGas, GasPrice, Address, TxParams, TxHash } from 'eth-types'
import { ChannelEventTypes, ChannelEventsToArgs } from '../__GEN__/NettingChannelContract'
import { ManagerEventTypes, ManagerEventsToArgs } from '../__GEN__/ChannelManagerContract'
import { TokenEventTypes, TokenEventsToArgs } from '../__GEN__/HumanStandardToken'

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
export type TxFull<T extends { [K: string]: [any, any] }, Ev> = {
  [K in keyof T]: T[K][0] extends null ?
  (params: TxParamsRequired & Partial<TxParamsWithGas>) => Promise<Ev[]> :
  (params: TxParamsRequired & Partial<TxParamsWithGas>, data: T[K][0]) => Promise<Ev[]>
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
