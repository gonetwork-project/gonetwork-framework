import GenericLogDecoder from '../utils/generic-log-decoder'

import * as T from '../types'

// todo: remove it and use generated stuff
const ChannelManagerContract = require('../../smart-contracts/build/contracts/ChannelManagerContract.json')
const NettingChannelContract = require('../../smart-contracts/build/contracts/NettingChannelContract.json')
const HumanStandardTokenContract = require('../../smart-contracts/build/contracts/HumanStandardToken.json')

const decoder = new GenericLogDecoder([ChannelManagerContract, NettingChannelContract, HumanStandardTokenContract])
export const decode = (logs: any[]) => logs.map(decoder.decode.bind(decoder)) as T.BlockchainEvent[]

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
