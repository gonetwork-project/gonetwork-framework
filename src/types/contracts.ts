// #region GENERATED

export * from './__GEN__/NettingChannelContract'
export * from './__GEN__/HumanStandardToken'
export * from './__GEN__/ChannelManagerContract'

// #endregion GENERATED

import { TxParamsRequired, TxParamsWithGas } from './eth'

export type Method<In, Out> = [In, Out]

export interface ContractBase {
  [k: string]: Method<any, any>
}

export type ContractInOrder<CB extends ContractBase> = {
  [K in keyof CB]: Array<keyof CB[K][0]>
}

export type ContractOut<CB extends ContractBase> = {
  [K in keyof CB]: CB[K][1]
}

export type FunctionCall<In extends ({} | null), Out> = (provided: TxParamsRequired & TxParamsWithGas) => (params: In) => Out

export type ParamsFn<T extends { [K: string]: [any, any] }, Out> = {
  [K in keyof T]: FunctionCall<T[K][0], Out>
}

export type CreateTxConstParams<In extends ({} | null), Out> = (provided: TxParamsRequired) => (params: In) => Out

export type FunctionConstCall<T extends { [K: string]: [any, any] }, Out> = {
  [K in keyof T]: CreateTxConstParams<T[K][0], Out>
}
