// this is not ideal for unit tests as it requires running ganache-cli and/or contacts infura
// these tests should be only used when working on eth node and RPC

import rpcCreate from './rpc'

import * as base from './spec.base'

const [acc] = base.getAccounts()

const rpc = rpcCreate('http://localhost:8545')
// const rpc = rpcCreate('https://ropsten.infura.io')

test('block-number', () =>
  rpc.getBlockNumber()
    .then(x => {
      console.log(x)
      expect(x.gte(0)).toBe(true)
    })
)

test('transactions-count', () =>
  rpc.getTransactionCount({ address: acc.address })
    .then(x => {
      expect(x.gte(0)).toBe(true)
    })
)
