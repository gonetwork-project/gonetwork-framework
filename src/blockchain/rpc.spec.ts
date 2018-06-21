import rpcCreate from './rpc'
import { as } from '../utils'

// todo will break in a browser environment
(global as any).fetch = require('node-fetch')

// const [acc] = base.getAccounts()
// const rpc = rpcCreate('http://localhost:8545')

const rpc = rpcCreate('https://ropsten.infura.io')
const managerAdd = as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex'))

test('block-number', () =>
  rpc.blockNumber()
    .then(x => {
      expect(x.gte(1)).toBe(true)
    })
)

test('transactions-count', () =>
  rpc.getTransactionCount({ address: managerAdd })
    .then(x => {
      expect(x.gte(28)).toBe(true)
    })
)

test.skip('logs -- all', () =>
  rpc.getLogs({
    address: managerAdd,
    fromBlock: as.BlockNumber(0),
    toBlock: as.BlockNumber('latest')
  })
    .then(x => {
      expect(x.length).toBeGreaterThanOrEqual(75)
    })
)

test('logs -- few', () =>
  rpc.getLogs({
    address: managerAdd,
    fromBlock: as.BlockNumber('0x2f06c0'),
    toBlock: as.BlockNumber('0x2f074b')
  })
    .then(x => {
      expect(x.length).toBe(4) // logs are immutable
      expect(x[0]._type).toBe('ChannelDeleted')
      expect(x[1]._type).toBe('ChannelNew')
    })
)
