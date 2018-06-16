import Tx from 'ethereumjs-tx'
import { BN } from 'bn.js'

import { to } from '../utils'

import * as C from '../types/contracts'
import * as E from '../types/eth'

const txConstParamsWithDefaults = <T extends E.TxDataType[] | null> (data: T, provided: E.TxParamsRequired):
  E.TxConstParams => ({
    ...provided,
    chainId: E.CHAIN_ID.GETH_PRIVATE_CHAINS, // default by spec
    data
  })

const txParamsWithDefaults = <T extends E.TxDataType[] | null> (data: T, provided: E.TxParamsRequired & E.TxParamsWithGas):
  E.TxParams => ({
    ...provided,
    chainId: E.CHAIN_ID.GETH_PRIVATE_CHAINS,
    data
  })

const expandParamsToTx = (order: any, defaultFn: typeof txParamsWithDefaults | typeof txConstParamsWithDefaults) =>
  Object.keys(order)
    .reduce((acc, k) => {
      acc[k] = pr => data => {
        const tx = (defaultFn as any)(data, pr)
        return new Tx(tx)
      }
      return acc
    }, {} as { [k: string]: C.FunctionCall<any, any> })

export const paramsToTx = {
  token: expandParamsToTx(C.TokenOrdIO, txParamsWithDefaults) as C.ParamsFn<C.TokenIO, E.TxParams>,
  manager: expandParamsToTx(C.ManagerOrdIO, txParamsWithDefaults) as C.ParamsFn<C.ManagerIO, E.TxParams>,
  channel: expandParamsToTx(C.ChannelOrdIO, txParamsWithDefaults) as C.ParamsFn<C.ChannelIO, E.TxParams>
}

export const paramsToConstTx = {
  token: expandParamsToTx(C.TokenConstOrdIO, txConstParamsWithDefaults) as C.FunctionConstCall<C.TokenConstIO, E.TxConstParams>,
  manager: expandParamsToTx(C.ManagerConstOrdIO, txConstParamsWithDefaults) as C.FunctionConstCall<C.ManagerConstIO, E.TxConstParams>,
  channel: expandParamsToTx(C.ChannelConstOrdIO, txConstParamsWithDefaults) as C.FunctionConstCall<C.ChannelConstIO, E.TxConstParams>
}

paramsToTx.token.transfer({
  gasLimit: to.GasLimit(0),
  gasPrice: to.GasPrice(0),
  nonce: to.Nonce(0),
  to: to.Address(new Buffer(0)),
  value: to.Wei(0)
})({
  _to: to.Address(new Buffer(0)),
  _value: new BN(0)
})
