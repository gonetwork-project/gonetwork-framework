// #region GENERATED

import { ChannelIO, ChannelConstIO, ChannelOrdIO, ChannelConstOrdIO } from '../__GEN__/NettingChannelContract'
import { TokenIO, TokenConstIO, TokenOrdIO, TokenConstOrdIO } from '../__GEN__/HumanStandardToken'
import { ManagerIO, ManagerConstIO, ManagerOrdIO, ManagerConstOrdIO } from '../__GEN__/ChannelManagerContract'

// #endregion GENERATED

import * as Tx from 'ethereumjs-tx'
import * as E from 'eth-types'

import * as util from 'ethereumjs-util'

import { as, serializeRpcParams, abi, serializeRpcParam } from '../utils'

import { GenOrder, GenOrders, TxEstimation, TxCall, TxSendRaw } from '../types/contracts'
import { ContractTxConfig } from './types'

export const encodeTxData = (name: string, abiInSpec: GenOrder[0]) => {
  const names = abiInSpec.map(o => o[0])
  const types = abiInSpec.map(o => o[1])
  return (data: E.TxData) => {
    return util.toBuffer([
      '0x',
      abi.methodID(name, types).toString('hex'),
      types.length === 0 ? '' : abi.rawEncode(types, names.map(o => serializeRpcParam(data[o]))).toString('hex')
    ].join(''))
  }
}
type EncodeData = ReturnType<typeof encodeTxData>

export const decodeTxData = (order: GenOrder[1], data: Buffer): any => {
  if (order.length === 0) return null as any
  else if (order.length === 1) return abi.rawDecode(order.map(o => o[1]), data)[0]

  return abi.rawDecode(order.map(o => o[1]), data)
    .reduce((acc, d, i) => {
      acc[order[1][i]] = d
      return acc
    }, {})
}

const toTxRaw = (chainId: E.ChainId, params: Partial<E.TxParams>, data: Buffer) => Object.assign({
  data,
  value: as.Wei(0),
  chainId: new util.BN(chainId)
}, params)

const paramsToEstimation = (order: GenOrders, cfg: ContractTxConfig) => {
  return Object.keys(order)
    .reduce((acc, k) => {
      (acc[k] as any) = ((encodeData: EncodeData) =>
        (params: E.TxParamsRequired & E.TxParamsWithGas, data: E.TxData) => {
          const txRaw = toTxRaw(cfg.chainId, params, encodeData(data))
          const txParams = serializeRpcParams(txRaw)
          return cfg.rpc.estimateGas(txParams as any)
            .then(r => ({
              estimatedGas: r,
              txParams: Object.assign({
                gasLimit: r.add(r.div(new util.BN(5))) // adds ~20%
              } as Partial<E.TxParams>, txRaw)
            }))
        })(encodeTxData(k, order[k][0]))
      return acc
    }, {} as {} as TxEstimation<any>)
}

const paramsToRawTx = (order: GenOrders, cfg: ContractTxConfig) => {
  return Object.keys(order)
    .reduce((acc, k) => {
      (acc[k] as any) = ((encodeData: EncodeData) =>
        (params: E.TxParamsRequired & E.TxParamsWithGas, data: E.TxData) => {
          const txRaw = toTxRaw(cfg.chainId, params, encodeData(data))
          const enc = serializeRpcParams(txRaw)
          const tx = new Tx(enc as any)
          cfg.signatureCb(pk => tx.sign(pk))
          // todo: make sure gasLimit and gasPrice are properly set
          return cfg.rpc.sendRawTransaction(`0x${tx.serialize().toString('hex')}`)
        })(encodeTxData(k, order[k][0]))
      return acc
    }, {} as {} as TxSendRaw<any>)
}

const paramsToCall = (order: GenOrders, cfg: ContractTxConfig) => {
  return Object.keys(order)
    .reduce((acc, k) => {
      (acc[k] as any) = ((encodeData: EncodeData) => (params: E.TxParamsRequired & E.TxParamsWithGas, data: E.TxData) => {
        const txRaw = toTxRaw(cfg.chainId, params, encodeData(data))
        const txParams = serializeRpcParams(txRaw)
        return cfg.rpc.call({
          params: txParams as any
        })
          .then(r => decodeTxData(order[k][1], util.toBuffer(r)))
      })(encodeTxData(k, order[k][0]))
      return acc
    }, {} as {} as TxCall<any>)
}

export default (cfg: ContractTxConfig) => {
  const estimateRawTx = {
    token: paramsToEstimation(TokenOrdIO as any, cfg) as TxEstimation<TokenIO>,
    manager: paramsToEstimation(ManagerOrdIO as any, cfg) as TxEstimation<ManagerIO>,
    channel: paramsToEstimation(ChannelOrdIO as any, cfg) as TxEstimation<ChannelIO>
  }

  const sendRawTx = {
    token: paramsToRawTx(TokenOrdIO as any, cfg) as TxSendRaw<TokenIO>,
    manager: paramsToRawTx(ManagerOrdIO as any, cfg) as TxSendRaw<ManagerIO>,
    channel: paramsToRawTx(ChannelOrdIO as any, cfg) as TxSendRaw<ChannelIO>
  }

  const call = {
    token: paramsToCall(TokenConstOrdIO as any, cfg) as TxCall<TokenConstIO>,
    manager: paramsToCall(ManagerConstOrdIO as any, cfg) as TxCall<ManagerConstIO>,
    channel: paramsToCall(ChannelConstOrdIO as any, cfg) as TxCall<ChannelConstIO>
  }

  return {
    estimateRawTx,
    sendRawTx,
    call
  }
}
