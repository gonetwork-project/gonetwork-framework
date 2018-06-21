
import * as E from 'eth-types'

import { as } from '../utils/eth-utils'

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
