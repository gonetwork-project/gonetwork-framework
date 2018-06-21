// this is not ideal for unit tests as it requires running ganache-cli and/or contacts infura
// these tests should be only used when working on eth node and RPC

import rpcCreate from './rpc'
import * as base from './spec.base'
import { as } from '../utils'

const [acc] = base.getAccounts()

// const rpc = rpcCreate('http://localhost:8545')
const rpc = rpcCreate('https://ropsten.infura.io')
const inuraRegistry = as.Address(new Buffer('9b50007fa72caf06012daf4029b5f518087555d6', 'hex'))

test('block-number', () =>
  rpc.getBlockNumber()
    .then(x => {
      expect(x.gte(1)).toBe(true)
    })
)

test('transactions-count', () =>
  rpc.getTransactionCount({ address: inuraRegistry })
    .then(x => {
      console.log(x.toString())
      expect(x.gt(0)).toBe(true)
    })
)
