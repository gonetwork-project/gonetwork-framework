// #region GENERATED

export * from './__GEN__/NettingChannelContract'
export * from './__GEN__/HumanStandardToken'
export * from './__GEN__/ChannelManagerContract'

// #endregion GENERATED

import { TxParams } from './eth'

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

export type CreateTxParams<In extends ({} | null)> = (tParams?: Partial<TxParams>) => (params: In) => TxParams

export type ParamsFn<T extends { [K: string]: [any, any]}> = {
  [K in keyof T]: CreateTxParams<T[K][0]>
}

export type CreateTxConstParams<In extends ({} | null)> = (tParams?: Partial<TxParams>) => (params: In) => TxParams

export type ConstParamsFn<T extends { [K: string]: [any, any]}> = {
  [K in keyof T]: CreateTxConstParams<T[K][0]>
}
