import * as T from '../types'

import GenericLogDecoder from '../utils/generic-log-decoder'

const ChannelManagerContract = require('../../smart-contracts/build/contracts/ChannelManagerContract.json')
const NettingChannelContract = require('../../smart-contracts/build/contracts/NettingChannelContract.json')
const HumanStandardTokenContract = require('../../smart-contracts/build/contracts/HumanStandardToken.json')

const decoder = new GenericLogDecoder([ChannelManagerContract, NettingChannelContract, HumanStandardTokenContract])

export type Decode<E> = (log: any) => E
export const decode = (log: any) => decoder.decode(log)

export const decodeChannelManager: Decode<T.ManagerEvents> = decode
export const decodeNettingChannel: Decode<T.ChannelEvents> = decode
export const decodeToken: Decode<T.TokenEvents> = decode
