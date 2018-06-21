// this is not ideal as it requires running ganache-cli and/or contacts infura

import rpcCreate from './rpc'

import * as base from './spec.base'

const [acc] = base.getAccounts()

const rpc = rpcCreate('http://localhost:8545')
// const rpc = rpcCreate('https://ropsten.infura.io/QxoWjkfgF4aVMUV4rbTG')

test.only('rpc-local', () =>
  rpc.getTransactionCount({ address: acc.address })
    .then(x => {
      console.log('WTF???', x.toString())
    })
)
