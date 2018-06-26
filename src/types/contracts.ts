import { TxParamsRequired, TxParamsWithGas, GasPrice, Address, TxParams } from 'eth-types'
import { ChannelEvents, ChannelEventsToArgs } from '../__GEN__/NettingChannelContract'
import { ManagerEvents, ManagerEventsToArgs } from '../__GEN__/ChannelManagerContract'
import { TokenEvents, TokenEventsToArgs } from '../__GEN__/HumanStandardToken'

export type TxSendRaw<T extends { [K: string]: [any, any] }> = {
  [K in keyof T]: T[K][0] extends null ?
  (params: TxParamsRequired & Partial<TxParamsWithGas>) => Promise<T[K][1]> :
  (params: TxParamsRequired & Partial<TxParamsWithGas>, data: T[K][0]) => Promise<T[K][1]>
}

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

export type GenOrder = [
  Array<[string, string]>, // [input-name, input-type][]
  Array<[string, string]>  // [output-name, output-type][]
]

export type GenOrders = {
  [k: string]: GenOrder
}

export type ExtractEvents<E, K extends keyof E> = E[K]

export type EventTypeToEvent<Ev extends BlockchainEventType> =
  Ev extends ChannelEvents ? ChannelEventsToArgs[Ev] :
  Ev extends ManagerEvents ? ManagerEventsToArgs[Ev] :
  Ev extends TokenEvents ? TokenEventsToArgs[Ev] : never

export type BlockchainEventType = ChannelEvents | ManagerEvents | TokenEvents

export type BlockchainEvent = ExtractEvents<ChannelEventsToArgs, ChannelEvents>
  | ExtractEvents<ManagerEventsToArgs, ManagerEvents> | ExtractEvents<TokenEventsToArgs, TokenEvents>
