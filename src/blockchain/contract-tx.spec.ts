import rpcCreate from './rpc'
import { as } from '../utils'

import createContracts from './contracts-tx'
import * as base from './spec.base'

const [acc1, acc2] = base.getAccounts()

const cfg = base.config()
const rpc = rpcCreate(cfg.providerUrl)

const cTx = createContracts({
  rpc,
  chainId: cfg.chainId,
  signatureCb: (fn) => fn(acc1.privateKey)
})

test('estimate', () =>
  cTx.estimateRawTx.token.approve({
    to: acc1.address,
    nonce: as.Nonce(3)
  },
    {
      _spender: acc2.address,
      _value: as.Wei(20000)
    })
    .then(r => {
      // gasLimit is ~20% more than the estimated
      expect(r.estimatedGas.lt(r.txParams.gasLimit)).toBe(true)
      console.log(r.txParams)
      expect(r.txParams.nonce.eq(as.Nonce(3))).toBe(true)
      expect(r.txParams.to).toBe(acc1.address)
    })
)

test('call', () =>
  cTx.call.manager.getChannelsParticipants({
    nonce: as.Nonce(3),
    to: cfg.nettingChannel
  }, null)
    .then(x => console.log(x))

)
