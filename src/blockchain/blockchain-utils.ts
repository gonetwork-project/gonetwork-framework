import * as Tx from 'ethereumjs-tx'

import * as util from 'ethereumjs-util'
import * as abi from 'ethereumjs-abi'

import { CHAIN_ID, serializeRpcParam, serializeRpcParams } from '../utils'

import * as C from '../types/contracts'
import * as E from 'eth-types'

import GenericLogDecoder from '../utils/generic-log-decoder'

import * as T from '../types'

// todo: remove it and use generated stuff
const ChannelManagerContract = require('../../smart-contracts/build/contracts/ChannelManagerContract.json')
const NettingChannelContract = require('../../smart-contracts/build/contracts/NettingChannelContract.json')
const HumanStandardTokenContract = require('../../smart-contracts/build/contracts/HumanStandardToken.json')

const decoder = new GenericLogDecoder([ChannelManagerContract, NettingChannelContract, HumanStandardTokenContract])
export const decode = (logs: any[]) => logs.map(decoder.decode.bind(decoder)) as T.BlockchainEvent[]

const encodeData = (name: string, types: string[], order: string[], data: E.TxParams[]) => {
  return util.toBuffer([
    '0x',
    abi.methodID(name, types).toString('hex'),
    abi.rawEncode(types, order.map(o => serializeRpcParam(data[o])))
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
        // console.log(pr, data)
        const d = data ? encodeData(k, types[k], order[k], data) : null
        const tx = (defaultFn as any)(d, serializeRpcParams(pr))
        return tx
        // return new Tx(tx)
      }
      return acc
    }, {} as { [k: string]: C.CreateTxParams<any, any> })

// changes state do require gas
export const paramsToTx = {
  token: expandParamsToTx(C.TokenOrdIO, C.TokenTypesIO, txParamsWithDefaults) as C.FunctionCall<C.TokenIO, Tx>,
  manager: expandParamsToTx(C.ManagerOrdIO, C.ManagerTypesIO, txParamsWithDefaults) as C.FunctionCall<C.ManagerIO, Tx>,
  channel: expandParamsToTx(C.ChannelOrdIO, C.ChannelTypesIO, txParamsWithDefaults) as C.FunctionCall<C.ChannelIO, Tx>
}

// read-only do not require gas
export const paramsToTxConst = {
  token: expandParamsToTx(C.TokenConstOrdIO, C.TokenConstTypesIO, txParamsWithDefaults) as C.FunctionConstCall<C.TokenConstIO, Tx>,
  manager: expandParamsToTx(C.ManagerConstOrdIO, C.ManagerConstTypesIO, txParamsWithDefaults) as C.FunctionConstCall<C.ManagerConstIO, Tx>,
  channel: expandParamsToTx(C.ChannelConstOrdIO, C.ChannelConstTypesIO, txParamsWithDefaults) as C.FunctionConstCall<C.ChannelConstIO, Tx>
}

let id = 0
export const nextId = () => {
  if (id === Number.MAX_SAFE_INTEGER) {
    id = 0
  }
  return ++id
}

export const fakeStorage = () => ({ // no persistent storage for now
  getItem: (id) => Promise.resolve(null),
  setItem: (id, item) => Promise.resolve(true),
  getAllKeys: () => Promise.resolve([]),

  multiGet: (keys) => Promise.resolve([]),
  multiSet: (xs) => Promise.resolve(true)
} as T.Storage)
