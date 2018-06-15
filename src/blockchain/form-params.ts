import * as C from '../types/contracts'
import * as E from '../types/eth'

const expandParamsToTx = (order) =>
  Object.keys(order)
    .reduce((acc, k) => {
      acc[k] = tParams => params => Object.assign({
        data: params
      }, tParams as E.TxParams)
      return acc
    }, {} as { [k: string]: C.CreateTxParams<any> })

export const paramsToTx = {
  token: expandParamsToTx(C.TokenOrdIO) as C.ParamsFn<C.TokenIO>,
  manager: expandParamsToTx(C.ManagerOrdIO) as C.ParamsFn<C.ManagerIO>,
  channel: expandParamsToTx(C.ChannelOrdIO) as C.ParamsFn<C.ChannelIO>
}

export const paramsToConstTx = {
  token: expandParamsToTx(C.TokenConstOrdIO) as C.ConstParamsFn<C.TokenConstIO>,
  manager: expandParamsToTx(C.ManagerConstOrdIO) as C.ConstParamsFn<C.ManagerConstIO>,
  channel: expandParamsToTx(C.ChannelConstOrdIO) as C.ConstParamsFn<C.ChannelConstIO>
}
