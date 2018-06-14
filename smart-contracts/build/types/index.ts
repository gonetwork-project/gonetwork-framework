import { ContractInOrder, ContractOut, ParamsToTx, TxParams } from './generic-types'

import {
  ChannelConstructorParams, ChannelEvents, ChannelEventsToArgs,
  ChannelParamsOutput, ChannelParamsOrder
} from './NettingChannelContract'
import {
  TokenConstructorParams, TokenEvents, TokenEventsToArgs, TokenParamsOutput, TokenParamsOrder
} from './HumanStandardToken'
import { ManagerConstructorParams, ManagerEvents, ManagerEventsToArgs, ManagerParamsOutput, ManagerParamsOrder } from './ChannelManagerContract'

const expandParamsToTx = (order) =>
  Object.keys(order)
    .reduce((acc, k) => {
      acc[k] = tParams => params => Object.assign({
        data: params
      }, tParams as TxParams)
      return acc
    }, {} as { [k: string]: ParamsToTx<any> })

export const paramsToTx = {
  token: expandParamsToTx(TokenParamsOrder) as {
    [K in keyof TokenParamsOutput]: ParamsToTx<TokenParamsOutput[K][0]>
  },
  manager: expandParamsToTx(ManagerParamsOrder) as {
    [K in keyof ManagerParamsOutput]: ParamsToTx<ManagerParamsOutput[K][0]>
  },
  channel: expandParamsToTx(ChannelParamsOrder) as {
    [K in keyof ChannelParamsOutput]: ParamsToTx<ChannelParamsOutput[K][0]>
  }
}

// paramsToTx.channel.settle()(null)
// paramsToTx.channel.close()()
