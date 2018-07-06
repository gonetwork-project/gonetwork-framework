// #region GENERATED

import { ChannelIO, ChannelConstIO, ChannelOrdIO, ChannelConstOrdIO } from '../__GEN__/NettingChannelContract'
import { TokenIO, TokenConstIO, TokenOrdIO, TokenConstOrdIO } from '../__GEN__/HumanStandardToken'
import { ManagerIO, ManagerConstIO, ManagerOrdIO, ManagerConstOrdIO } from '../__GEN__/ChannelManagerContract'

// #endregion GENERATED

import * as Tx from 'ethereumjs-tx'
import * as E from 'eth-types'

import * as util from 'ethereumjs-util'

import { as, serializeRpcParams, abi, serializeRpcParam, decodeLogs } from '../utils'
import { waitForValue, WaitForConfig } from './monitoring'

import { GenOrder, GenOrders, TxEstimation, TxCall, TxSendRaw, TxFull,
  ChannelEventsMap, ManagerEventsMap, TokenEventsMap } from '../types/contracts'
import { RPC } from './rpc'

export interface ContractTxConfig {
  rpc: RPC
  chainId: E.ChainId

  owner: E.Address
  signatureCb: E.SignatureCb
}
type EncodeData = ReturnType<typeof encodeTxData>

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
                gasLimit: r.add(r.div(new util.BN(2))) // adds ~50%
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

const paramsToTxFull = <IO extends { [K: string]: [any, any] }>
  (est: TxEstimation<IO>, raw: TxSendRaw<IO>, order: GenOrder, cfg: ContractTxConfig): TxFull<IO, any> => {
  return Object.keys(order)
    .reduce((acc, k) => {
      (acc[k] as any) = (params: E.TxParamsRequired & E.TxParamsWithGas, data: E.TxData, waitCfg?: WaitForConfig) =>
        Promise.all([est[k](params, data), params.nonce ? Promise.resolve(params.nonce) : cfg.rpc.getTransactionCount({ address: cfg.owner })])
          .then(([x, nonce]) => (raw[k] as any)(Object.assign({ nonce }, x.txParams), data) as Promise<E.TxHash>)
          .then(txHash => waitForValue((t: E.TxHash) => cfg.rpc.getTransactionReceipt(t) as Promise<E.TxReceipt>, waitCfg)(txHash))
          .then(txReceipt => decodeLogs(txReceipt.logs))
      return acc
    }, {} as {} as TxFull<IO, any>)
}

export const createContractsProxy = (cfg: ContractTxConfig) => {
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

  // todo - handle logs properly
  const txFull = {
    token: paramsToTxFull(estimateRawTx.token, sendRawTx.token, TokenOrdIO as any, cfg) as TxFull<TokenIO, TokenEventsMap>,
    manager: paramsToTxFull(estimateRawTx.manager, sendRawTx.manager, ManagerOrdIO as any, cfg) as TxFull<ManagerIO, ManagerEventsMap>,
    channel: paramsToTxFull(estimateRawTx.channel, sendRawTx.channel, ChannelOrdIO as any, cfg) as TxFull<ChannelIO, ChannelEventsMap>
  }

  const call = {
    token: paramsToCall(TokenConstOrdIO as any, cfg) as TxCall<TokenConstIO>,
    manager: paramsToCall(ManagerConstOrdIO as any, cfg) as TxCall<ManagerConstIO>,
    channel: paramsToCall(ChannelConstOrdIO as any, cfg) as TxCall<ChannelConstIO>
  }

  return {
    estimateRawTx,
    sendRawTx,
    call,
    txFull
  }
}

export default createContractsProxy

export type ContractsProxy = ReturnType<typeof createContractsProxy>
export type Txs = TxFull<TokenIO, TokenEventsMap> & TxFull<ManagerIO, ManagerEventsMap> & TxFull<ChannelIO, ChannelEventsMap>
