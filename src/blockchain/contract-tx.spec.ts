import createContracts from './contracts-tx'

import * as base from './spec.base'
import { as, util } from '../utils'

const [acc1, acc2] = base.getAccounts()
const [limit, price] = [as.GasLimit(20000), as.GasPrice(2000000)]

const contractsTx = createContracts({
  chainId: 1337,
  signatureCb: (fn) => fn(acc1.privateKey),
  info: () => Promise.resolve({
    nonce: as.Nonce(3),
    gasLimit: limit,
    gasPrice: price
  }),

  // mock request
  request: (json, tx) => Promise.resolve({ result: [json, tx] }),

  token: acc2.address,
  channelManager: acc2.address,
  nettingChannel: acc2.address
})

test('contracts-tx example', (done) => {
  contractsTx.token.approve({
    _spender: acc2.address,
    _value: as.Wei(20000)
  }, acc1.address)
    .then(r => {
      expect(r.result[0].id).toBe(1)
      expect(as.GasLimit(r.result[1].gasLimit).eq(limit)).toBe(true)
      expect(as.GasLimit(r.result[1].gasPrice).eq(price)).toBe(true)
      done()
    })
})
