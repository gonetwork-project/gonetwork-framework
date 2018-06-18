import * as Tx from 'ethereumjs-tx'
import { BN } from 'bn.js'
import * as util from 'ethereumjs-util'

import { as, CHAIN_ID } from '../utils'

import * as C from '../types/contracts'
import * as E from 'eth-types'

const txParamsWithDefaults = <T extends E.TxDataType[] | null> (data: T, provided: E.TxParamsRequired & E.TxParamsWithGas):
  E.TxParams => ({
    ...provided,
    chainId: CHAIN_ID.GETH_PRIVATE_CHAINS, // default by spec
    data: data && util.toBuffer(data) as any
  })

const expandParamsToTx = (order: any, defaultFn: typeof txParamsWithDefaults) =>
  Object.keys(order)
    .reduce((acc, k) => {
      acc[k] = pr => data => {
        // console.log(data)
        const tx = (defaultFn as any)(data, pr)
        // console.log(tx)
        return new Tx(tx)
      }
      return acc
    }, {} as { [k: string]: C.FunctionCall<any, any> })

// changes state do require gas
export const paramsToTx = {
  token: expandParamsToTx(C.TokenOrdIO, txParamsWithDefaults) as C.ParamsFn<C.TokenIO, Tx>,
  manager: expandParamsToTx(C.ManagerOrdIO, txParamsWithDefaults) as C.ParamsFn<C.ManagerIO, Tx>,
  channel: expandParamsToTx(C.ChannelOrdIO, txParamsWithDefaults) as C.ParamsFn<C.ChannelIO, Tx>
}

// read-only do not require gas
export const paramsToTxConst = {
  token: expandParamsToTx(C.TokenConstOrdIO, txParamsWithDefaults) as C.FunctionConstCall<C.TokenConstIO, Tx>,
  manager: expandParamsToTx(C.ManagerConstOrdIO, txParamsWithDefaults) as C.FunctionConstCall<C.ManagerConstIO, Tx>,
  channel: expandParamsToTx(C.ChannelConstOrdIO, txParamsWithDefaults) as C.FunctionConstCall<C.ChannelConstIO, Tx>
}
