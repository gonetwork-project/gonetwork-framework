
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

const infura = {
  providerUrl: 'https://ropsten.infura.io',
  chainId: CHAIN_ID.ROPSTEN,

  // ropsten-manual - used in contracts before
  // acc1: account('f0c3043550e5259dc1c838d0ea600364d999ea15', 'b507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42'),
  acc1: account('b0ae572146ab8b5990e069bff487ac25635dabe8', '4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78'),

  // fresh
  // acc1: account('ca4e935c9e4d942afd42f2c932a4ab9320eda68c', 'b2267a87f32cb5375341fddad567921db4fd3b8d6e6b752605e6fbd6b6afc0ca'),
  acc2: account('f8e9b7b0f5936c0221b56f15ea2182d796d09e63', 'c712c08b0c42c073f8c67cf5c0fa8c4cf5ffa89c0b33c2d4e53aa4fe969da887'),

  manager: as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex')),
  token: as.Address(new Buffer('a28a7a43bc389064ab5d16c0338968482b4e02bd', 'hex')),
  hsToken: as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex')),

  nettingChannel: as.Address(new Buffer('335648c615c692c25d8d9de5e6068d876b88e5ee', 'hex')),

  txHash: '0x57f8edeca8ca78d7d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12',
  txHashFake: '0x57f8edeca8ca78d8d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12'
}

type Config = typeof infura

const local: Config = {
  providerUrl: 'https://ropsten.infura.io',
  chainId: CHAIN_ID.ROPSTEN,

  acc1: account('ca4e935c9e4d942afd42f2c932a4ab9320eda68c', 'b2267a87f32cb5375341fddad567921db4fd3b8d6e6b752605e6fbd6b6afc0ca'),
  acc2: account('f8e9b7b0f5936c0221b56f15ea2182d796d09e63', 'c712c08b0c42c073f8c67cf5c0fa8c4cf5ffa89c0b33c2d4e53aa4fe969da887'),

  manager: as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex')),
  token: as.Address(new Buffer('a28a7a43bc389064ab5d16c0338968482b4e02bd', 'hex')),
  hsToken: as.Address(new Buffer('bed8d09854a7013af00bdae0f0969f7285c2f4d2', 'hex')),

  nettingChannel: as.Address(new Buffer('335648c615c692c25d8d9de5e6068d876b88e5ee', 'hex')),

  txHash: '0x57f8edeca8ca78d7d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12',
  txHashFake: '0x57f8edeca8ca78d8d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12'
}

export const config = () => local
