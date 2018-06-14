import BN from 'bn.js'

export type TxDataType = Buffer | BN | Buffer[] | string | boolean

export type TxData = TxDataType[]

// todo: discuss defaults
export interface TxParams {
  nonce: BN
  to: Buffer
  value: BN
  gasLimit: BN
  gasPrice: BN
  // gas: BN
  data: TxData | null

  v: Buffer
  r: Buffer
  s: Buffer

  chainId?: number
}

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

export type ParamsToTx<In extends {} = any> = (tParams?: Partial<TxParams>) => (params: In) => TxParams
