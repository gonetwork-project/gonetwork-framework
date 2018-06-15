import * as C from '../types/contracts'
import * as E from '../types/eth'

const txConstParamsWithDefault = <T extends E.TxDataType[] | null> (data: T, provided: E.TxParamsRequired):
  E.TxConstParams => ({
    ...provided,
    chainId: E.CHAIN_ID.GETH_PRIVATE_CHAINS, // default by spec
    data
  })

const txParamsWithDefault = <T extends E.TxDataType[] | null> (data: T, provided: E.TxParamsRequired & E.TxParamsWithGas):
  E.TxParams => ({
    ...provided,
    chainId: E.CHAIN_ID.GETH_PRIVATE_CHAINS,
    data
  })

const expandParamsToTx = (order: any, defaultFn: any) =>
  Object.keys(order)
    .reduce((acc, k) => {
      acc[k] = tParams => params => Object.assign({
        data: params
      }, tParams as E.TxParams)
      return acc
    }, {} as { [k: string]: C.MethodCall<any, any> })

export const paramsToTx = {
  token: expandParamsToTx(C.TokenOrdIO, txParamsWithDefault) as C.ParamsFn<C.TokenIO>,
  manager: expandParamsToTx(C.ManagerOrdIO, txParamsWithDefault) as C.ParamsFn<C.ManagerIO>,
  channel: expandParamsToTx(C.ChannelOrdIO, txParamsWithDefault) as C.ParamsFn<C.ChannelIO>
}

export const paramsToConstTx = {
  token: expandParamsToTx(C.TokenConstOrdIO, txConstParamsWithDefault) as C.ConstParamsFn<C.TokenConstIO>,
  manager: expandParamsToTx(C.ManagerConstOrdIO, txConstParamsWithDefault) as C.ConstParamsFn<C.ManagerConstIO>,
  channel: expandParamsToTx(C.ChannelConstOrdIO, txConstParamsWithDefault) as C.ConstParamsFn<C.ChannelConstIO>
}
