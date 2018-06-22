import * as abi from 'ethereumjs-abi'

import * as Tx from 'ethereumjs-tx'
import * as E from 'eth-types'

import * as util from 'ethereumjs-util'

import { as, serializeRpcParam, serializeRpcParams, CHAIN_ID } from '../utils'

import * as C from '../types/contracts'
import { ContractTxConfig, RPC } from './types'

const encodeData = (name: string, types: string[], order: string[], data: E.TxParams[]) => {
  return util.toBuffer([
    '0x',
    abi.methodID(name, types).toString('hex'),
    abi.rawEncode(types, order.map(o => serializeRpcParam(data[o])))
  ].join(''))
}

const txParamsWithDefaults = <T extends E.TxDataType[] | null> (provided: E.TxParamsRequired & E.TxParamsWithGas, data: T):
  E.TxParams => Object.assign(data ? { data } : { data: '0x' as any }, {
    ...provided,
    chainId: CHAIN_ID.GETH_PRIVATE_CHAINS // default by spec
  })

const serializeParams = (order: any, types: any, defaultFn: typeof txParamsWithDefaults) =>
  Object.keys(order)
    .reduce((acc, k) => {
      acc[k] = pr => data => {
        const d = data ? encodeData(k, types[k], order[k], data) : null
        const tx = (defaultFn as any)(serializeRpcParams(pr), d)
        return tx
        // return new Tx(tx)
      }
      return acc
    }, {} as { [k: string]: C.CreateTxParams<any, any> })

// changes state do require gas
export const txParams = {
  token: serializeParams(C.TokenOrdIO, C.TokenTypesIO, txParamsWithDefaults) as C.FunctionCall<C.TokenIO, E.TxParams>,
  manager: serializeParams(C.ManagerOrdIO, C.ManagerTypesIO, txParamsWithDefaults) as C.FunctionCall<C.ManagerIO, E.TxParams>,
  channel: serializeParams(C.ChannelOrdIO, C.ChannelTypesIO, txParamsWithDefaults) as C.FunctionCall<C.ChannelIO, E.TxParams>
}

// read-only do not require gas
export const txConstParams = {
  token: serializeParams(C.TokenConstOrdIO, C.TokenConstTypesIO, txParamsWithDefaults) as C.FunctionConstCall<C.TokenConstIO, E.TxParams>,
  manager: serializeParams(C.ManagerConstOrdIO, C.ManagerConstTypesIO, txParamsWithDefaults) as C.FunctionConstCall<C.ManagerConstIO, E.TxParams>,
  channel: serializeParams(C.ChannelConstOrdIO, C.ChannelConstTypesIO, txParamsWithDefaults) as C.FunctionConstCall<C.ChannelConstIO, E.TxParams>
}

const paramsToEstimation = (order: any, paramsToTx: C.FunctionCall<any, E.TxParams>, cfg: ContractTxConfig) => {
  return Object.keys(order)
    .reduce((acc, k) => {
      (acc[k] as any) = (params: E.TxParamsRequired & E.TxParamsWithGas, data: E.TxDataType | null) => {
        const txRaw = { value: as.Wei(0), chainId: new util.BN(cfg.chainId), ...params }
        const tx = paramsToTx[k](txRaw)(data)
        return cfg.rpc.estimateGas(tx)
          .then(r => ({
            estimatedGas: r,
            txParams: Object.assign({
              data,
              gasLimit: r.add(r.div(new util.BN(5))) // adds ~20%
            } as Partial<E.TxParams>, txRaw)
          }))
      }
      return acc
    }, {} as {} as C.TxEstimation<any>)
}

const paramsToRawTx = (order: any, paramsToTx: C.FunctionCall<any, E.TxParams>, cfg: ContractTxConfig) => {
  return Object.keys(order)
    .reduce((acc, k) => {
      (acc[k] as any) = (params: E.TxParamsRequired & E.TxParamsWithGas, data?: E.TxDataType) => {
        const txRaw = { value: as.Wei(0), chainId: new util.BN(cfg.chainId), ...params }
        const tx = new Tx(paramsToTx[k](txRaw)(data))
        cfg.signatureCb(pk => tx.sign(pk))
        console.log('TX', tx.from, txRaw)
        // todo: make sure gasLimit and gasPrice are properly set
        return cfg.rpc.sendRawTransaction(`0x${tx.serialize().toString('hex')}`)
      }
      return acc
    }, {} as {} as C.TxRequest<any>)
}

const paramsToCall = (order: any, paramsToTx: C.FunctionCall<any, E.TxParams>, cfg: ContractTxConfig) => {
  return Object.keys(order)
    .reduce((acc, k) => {
      (acc[k] as any) = (params: E.TxParamsRequired & E.TxParamsWithGas, data: E.TxDataType | null) => {
        const txRaw = { value: as.Wei(0), chainId: new util.BN(cfg.chainId), ...params }
        const txParams = paramsToTx[k](txRaw)(data)
        // todo: figure out gas
        return cfg.rpc.call({
          params: txParams
        })
      }
      return acc
    }, {} as {} as C.TxRequest<any>)
}

export default (cfg: ContractTxConfig) => {
  const estimateRawTx = {
    token: paramsToEstimation(C.TokenOrdIO, txParams.token, cfg) as C.TxEstimation<C.TokenIO>,
    manager: paramsToEstimation(C.ManagerOrdIO, txParams.manager, cfg) as C.TxEstimation<C.ManagerIO>,
    channel: paramsToEstimation(C.ChannelOrdIO, txParams.channel, cfg) as C.TxEstimation<C.ChannelIO>
  }

  const sendRawTx = {
    token: paramsToRawTx(C.TokenOrdIO, txParams.token, cfg) as C.TxRequest<C.TokenIO>,
    manager: paramsToRawTx(C.ManagerOrdIO, txParams.manager, cfg) as C.TxRequest<C.ManagerIO>,
    channel: paramsToRawTx(C.ChannelOrdIO, txParams.channel, cfg) as C.TxRequest<C.ChannelIO>
  }

  const call = {
    token: paramsToCall(C.TokenConstOrdIO, txConstParams.token, cfg) as C.TxRequest<C.TokenConstIO>,
    manager: paramsToCall(C.ManagerConstOrdIO, txConstParams.manager, cfg) as C.TxRequest<C.ManagerConstIO>,
    channel: paramsToCall(C.ChannelConstOrdIO, txConstParams.channel, cfg) as C.TxRequest<C.ChannelConstIO>
  }

  return {
    estimateRawTx,
    sendRawTx,
    call
  }
}
