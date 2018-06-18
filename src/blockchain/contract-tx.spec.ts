import createContracts from './contracts-tx'

import * as base from './spec.base'
import { as, util } from '../utils'

const [acc1, acc2] = base.getAccounts()

const contractsTx = createContracts({
  chainId: 1337,
  signatureCb: (fn) => fn(acc1.privateKey),
  info: () => Promise.resolve({
    nonce: as.Nonce(3),
    // todo: this is pretty weird - probably needs to be hidden in implementation
    gasLimit: '0x' + as.GasLimit(20000).toString() as any,
    gasPrice: '0x' + as.GasPrice(2000000).toString() as any
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
      expect(as.GasLimit(r.result[1].gasLimit.toString('hex')).toString())
        .toBe(as.GasLimit(20000).toString())
      expect(as.GasPrice(r.result[1].gasPrice.toString('hex')).toString())
        .toBe(as.GasLimit(2000000).toString())
      done()
    })
})
