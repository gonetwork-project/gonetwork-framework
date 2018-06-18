import * as Tx from 'ethereumjs-tx'
import { BN } from 'bn.js'
import * as util from 'ethereumjs-util'

import { to, CHAIN_ID } from '../utils'

import * as C from '../types/contracts'
import * as E from 'eth-types'

const txConstParamsWithDefaults = <T extends E.TxDataType[] | null> (data: T, provided: E.TxParamsRequired):
  E.TxConstParams => ({
    ...provided,
    chainId: CHAIN_ID.GETH_PRIVATE_CHAINS, // default by spec
    data: data && util.toBuffer(data) as any
  })

const txParamsWithDefaults = <T extends E.TxDataType[] | null> (data: T, provided: E.TxParamsRequired & E.TxParamsWithGas):
  E.TxParams => ({
    ...provided,
    chainId: CHAIN_ID.GETH_PRIVATE_CHAINS, // E.CHAIN_ID.GETH_PRIVATE_CHAINS,
    data: data && util.toBuffer(data) as any
  })

const expandParamsToTx = (order: any, defaultFn: typeof txParamsWithDefaults | typeof txConstParamsWithDefaults) =>
  Object.keys(order)
    .reduce((acc, k) => {
      acc[k] = pr => data => {
        console.log(data)
        const tx = (defaultFn as any)(data, pr)
        console.log(tx)
        return new Tx(tx)
      }
      return acc
    }, {} as { [k: string]: C.FunctionCall<any, any> })

export const paramsToTx = {
  token: expandParamsToTx(C.TokenOrdIO, txParamsWithDefaults) as C.ParamsFn<C.TokenIO, Tx>,
  manager: expandParamsToTx(C.ManagerOrdIO, txParamsWithDefaults) as C.ParamsFn<C.ManagerIO, Tx>,
  channel: expandParamsToTx(C.ChannelOrdIO, txParamsWithDefaults) as C.ParamsFn<C.ChannelIO, Tx>
}

export const paramsToConstTx = {
  token: expandParamsToTx(C.TokenConstOrdIO, txConstParamsWithDefaults) as C.FunctionConstCall<C.TokenConstIO, Tx>,
  manager: expandParamsToTx(C.ManagerConstOrdIO, txConstParamsWithDefaults) as C.FunctionConstCall<C.ManagerConstIO, Tx>,
  channel: expandParamsToTx(C.ChannelConstOrdIO, txConstParamsWithDefaults) as C.FunctionConstCall<C.ChannelConstIO, Tx>
}
