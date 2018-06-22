
import '../observable-add'

import * as E from 'eth-types'

import { as, CHAIN_ID } from '../utils/eth-utils'

// todo will break in a browser environment
(global as any).fetch = require('node-fetch')

export interface Account {
  addressStr: string, privateKeyStr: string,
  address: E.Address, privateKey: E.PrivateKey
}
const account = (addressStr: string, privateKeyStr: string): Account => ({
  addressStr,
  privateKeyStr,
  address: as.Address(new Buffer(addressStr, 'hex')),
  privateKey: as.PrivateKey(new Buffer(privateKeyStr, 'hex'))
})

export const getAccounts = () => ([
  account('f8e9b7b0f5936c0221b56f15ea2182d796d09e63', 'c712c08b0c42c073f8c67cf5c0fa8c4cf5ffa89c0b33c2d4e53aa4fe969da887'),
  account('ca4e935c9e4d942afd42f2c932a4ab9320eda68c', 'b2267a87f32cb5375341fddad567921db4fd3b8d6e6b752605e6fbd6b6afc0ca')
])

const infura = {
  providerUrl: 'https://ropsten.infura.io',
  chainId: CHAIN_ID.ROPSTEN,

  manager: as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex')),
  token: as.Address(new Buffer('a28a7a43bc389064ab5d16c0338968482b4e02bd', 'hex')),
  hsToken: as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex')),

  txHash: '0x57f8edeca8ca78d7d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12',
  txHashFake: '0x57f8edeca8ca78d8d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12'
}

type Config = typeof infura

const local: Config = {
  providerUrl: 'https://ropsten.infura.io',
  chainId: CHAIN_ID.ROPSTEN,

  manager: as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex')),
  token: as.Address(new Buffer('a28a7a43bc389064ab5d16c0338968482b4e02bd', 'hex')),
  hsToken: as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex')),

  txHash: '0x57f8edeca8ca78d7d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12',
  txHashFake: '0x57f8edeca8ca78d8d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12'
}

export const config = () => local
