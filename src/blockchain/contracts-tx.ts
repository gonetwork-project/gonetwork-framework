import * as blUtils from './blockchain-utils'
import * as Tx from 'ethereumjs-tx'
import * as E from 'eth-types'

import * as util from 'ethereumjs-util'

import { as, serializeRpcParams, CHAIN_ID } from '../utils'

import * as C from '../types/contracts'
import { ContractTxConfig } from './types'

export default (cfg: ContractTxConfig) => {

  const paramsToRequest = (order: any, paramsToTx: C.FunctionCall<any, Tx>) => {
    return Object.keys(order)
      .reduce((acc, k) => {
        (acc[k] as any) = (params: E.TxParamsRequired & E.TxParamsWithGas, data: E.TxDataType | null) => {
          const txRaw = { value: as.Wei(0), data, chainId: new util.BN(3), ...params }
          const tx = paramsToTx[k](txRaw)(data)
          // cfg.signatureCb(pk => tx.sign(pk))
          return cfg.rpc.estimateGas(serializeRpcParams(tx) as any)
        }
        return acc
      }, {} as { [k: string]: C.TxRequest<any> }) as any // todo: ideally no any cast
  }

  return {
    token: paramsToRequest(C.TokenOrdIO, blUtils.paramsToTx.token) as C.TxRequest<C.TokenIO>,
    manager: paramsToRequest(C.ManagerOrdIO, blUtils.paramsToTx.manager) as C.TxRequest<C.ManagerIO>,
    channel: paramsToRequest(C.ChannelOrdIO, blUtils.paramsToTx.channel) as C.TxRequest<C.ChannelIO>
  }
}
