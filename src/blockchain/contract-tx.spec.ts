import rpcCreate from './rpc'
import { as } from '../utils'

import createContracts from './contracts-tx'
import * as base from './spec.base'

const [acc1, acc2] = base.getAccounts()
const [limit, price] = [as.Gas(20000), as.GasPrice(2000000)]

const cfg = base.config()
const rpc = rpcCreate(cfg.providerUrl)

const contractsTx = createContracts({
  rpc,
  chainId: cfg.chainId,
  signatureCb: (fn) => fn(acc1.privateKey)
})

test('contracts-tx example', (done) => {
  contractsTx.token.approve({
    to: acc1.address,
    nonce: as.Nonce(3),
    gasLimit: limit,
    gasPrice: price
  },
    {
      _spender: acc2.address,
      _value: as.Wei(20000)
    })
    .then(r => {
      console.log('HMM', r)
      // expect(r.result[0].id).toBe(1)
      // expect(as.Gas(r.result[1].gasLimit).eq(limit)).toBe(true)
      // expect(as.Gas(r.result[1].gasPrice).eq(price)).toBe(true)
      done()
    })
})
