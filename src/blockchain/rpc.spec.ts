import rpcCreate from './rpc'
import { as } from '../utils'
import { infura, isInEnv } from './spec.base'

if (isInEnv('infura')) {
  const cfg = infura()

  const rpc = rpcCreate(cfg.providerUrl)

  test('block-number', () =>
    rpc.blockNumber()
      .then(x => {
        expect(x.gte(1)).toBe(true)
      })
  )

  test('transactions-count', () =>
    rpc.getTransactionCount({ address: cfg.manager })
      .then(x => {
        expect(x.gte(28)).toBe(true)
      })
  )

  // This generates a lot of traffic - the next test should be good enough though
  // test.skip('logs -- all', () =>
  //   rpc.getLogs({
  //     address: cfg.manager,
  //     fromBlock: as.BlockNumber(0),
  //     toBlock: as.BlockNumber('latest')
  //   })
  //     .then(x => {
  //       expect(x.length).toBeGreaterThanOrEqual(75)
  //     })
  // )

  test('logs -- few', () =>
    rpc.getLogs({
      address: cfg.manager,
      fromBlock: as.BlockNumber('0x2f06c0'),
      toBlock: as.BlockNumber('0x2f074b')
    })
      .then(x => {
        expect(x.length).toBe(4) // logs are immutable
        expect(x[0]._type).toBe('ChannelDeleted')
        expect(x[1]._type).toBe('ChannelNew')
      })
  )

  test('tx-receipt -- real tx', () =>
    rpc.getTransactionReceipt(cfg.txHash)
      .then(x => expect(x!.transactionHash).toBe(cfg.txHash))
  )

  // there is close to zero probability it will fail one day :)
  test('tx-receipt -- not real tx', () =>
    rpc.getTransactionReceipt(cfg.txHashFake)
      .then(x => expect(x).toBe(null))
  )

  test('gas-price', () =>
    rpc.gasPrice()
      .then(x => expect(x.gt(0)).toBe(true))
  )
} else {
  test.skip('skipped - infura only', () => undefined)
}
