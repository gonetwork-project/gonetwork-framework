import * as Tx from 'ethereumjs-tx'
import { BN } from 'bn.js'
import * as util from 'ethereumjs-util'
import * as abi from 'ethereumjs-abi'

import { as, CHAIN_ID } from '../utils'

import * as C from '../types/contracts'
import * as E from 'eth-types'

const encodeData = (name: string, types: string[], order: string[], data: E.TxParams[]) => {
  // const mSig = abi.methodID(name, types)
  // const d = (data && abi.rawEncode(types, data))
  // return util.toBuffer('0x' + mSig.toString('hex') + (d ? d.toString('hex') : ''))
  return util.toBuffer([
    '0x',
    abi.methodID(name, types).toString('hex'),
    abi.rawEncode(types, order.map(o => data[o]))
  ].join(''))
}

const txParamsWithDefaults = <T extends E.TxDataType[] | null> (data: T, provided: E.TxParamsRequired & E.TxParamsWithGas):
  E.TxParams => ({
    ...provided,
    chainId: CHAIN_ID.GETH_PRIVATE_CHAINS, // default by spec
    data
  })

const expandParamsToTx = (order: any, types: any, defaultFn: typeof txParamsWithDefaults) =>
  Object.keys(order)
    .reduce((acc, k) => {
      acc[k] = pr => data => {
        const d = data ? encodeData(k, types[k], order[k], data) : null
        console.log(data, d, k, types[k], order[k])
        const tx = (defaultFn as any)(d, pr)
        return new Tx(tx)
      }
      return acc
    }, {} as { [k: string]: C.FunctionCall<any, any> })

// changes state do require gas
export const paramsToTx = {
  token: expandParamsToTx(C.TokenOrdIO, C.TokenTypesIO, txParamsWithDefaults) as C.ParamsFn<C.TokenIO, Tx>,
  manager: expandParamsToTx(C.ManagerOrdIO, C.ManagerTypesIO, txParamsWithDefaults) as C.ParamsFn<C.ManagerIO, Tx>,
  channel: expandParamsToTx(C.ChannelOrdIO, C.ChannelTypesIO, txParamsWithDefaults) as C.ParamsFn<C.ChannelIO, Tx>
}

// read-only do not require gas
export const paramsToTxConst = {
  token: expandParamsToTx(C.TokenConstOrdIO, C.TokenConstTypesIO, txParamsWithDefaults) as C.FunctionConstCall<C.TokenConstIO, Tx>,
  manager: expandParamsToTx(C.ManagerConstOrdIO, C.ManagerConstTypesIO, txParamsWithDefaults) as C.FunctionConstCall<C.ManagerConstIO, Tx>,
  channel: expandParamsToTx(C.ChannelConstOrdIO, C.ChannelConstTypesIO, txParamsWithDefaults) as C.FunctionConstCall<C.ChannelConstIO, Tx>
}
