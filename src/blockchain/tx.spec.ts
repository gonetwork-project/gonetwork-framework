import rpcCreate from './rpc'
import { as, BN } from '../utils'

import { waitFor } from './monitoring'
import createContracts from './tx'
import * as base from './spec.base'
import { init } from '../e2e/init'
import * as E from 'eth-types'

let _cfg = base.config('local')
let cfg: NonNullable<typeof _cfg> = _cfg as any

const AllowanceAmount = as.Wei(2000)

beforeAll(() => {
  init(true)
  cfg = base.config('local') as any
})

if (!cfg) {
  test.skip('skipped - local only', () => undefined)
} else {
  const rpc = rpcCreate(cfg.providerUrl)
  const [acc1, acc2] = cfg.accounts

  const waitForTransaction = waitFor((t: E.TxHash) => rpc.getTransactionReceipt(t) as Promise<E.TxReceipt>, { interval: 100 })

  const cTx = createContracts({
    rpc,
    chainId: cfg.chainId,
    signatureCb: (fn) => fn(acc1.privateKey)
  })

  test('call - token.balanceOf', () =>
    cTx.call.token.balanceOf({
      to: cfg.hsToken
    },
      {
        _owner: acc1.address
      })
      .then(x => expect(x.gte(new BN(2000))).toBe(true)))

  test('call - token.totalSupply', () =>
    cTx.call.token.totalSupply({
      to: cfg.gotToken,
      from: acc1.address
    })
      .then(x => expect(x.gte(new BN(2000))).toBe(true)))

  test('call - manager.fee', () =>
    cTx.call.manager.fee({
      to: cfg.manager
    })
      .then(x => expect(x.gte(new BN(20))).toBe(true))
  )

  // FOLLOWING TESTS NEED TO RUN IN THIS ORDER
  // 1. - approve got tokens
  test('sendRawTx - gotToken.approve', () => {
    const cData = {
      _spender: cfg.manager,
      _value: AllowanceAmount
    }
    return Promise.all([rpc.getTransactionCount({ address: acc1.address }), rpc.gasPrice()])
      .then(([n, p]) => {
        return cTx.estimateRawTx.token.approve({
          nonce: n,
          to: cfg.gotToken,
          gasPrice: p
        }, cData)
          .catch(err => Promise.reject(err))
      })
      .then(r => cTx.sendRawTx.token.approve(r.txParams, cData))
      .then(hash => {
        expect(hash).toHaveLength(66)
        return waitForTransaction(hash)
      })
      .then(x => console.log('RECEIPT', x))
  })

  // 2. create new channel
  test('sendRawTx - manager.newChannel - approve - deposit', () => {
    const partner = acc2.address
    const cData = {
      partner,
      settle_timeout: new BN(500)
    }
    return Promise.all([rpc.getTransactionCount({ address: acc1.address }), rpc.gasPrice()])
      .then(([n, p]) => {
        return cTx.estimateRawTx.manager.newChannel({
          nonce: as.Nonce(n),
          to: cfg.manager,
          gasPrice: p
        }, cData)
          .catch(err => Promise.reject(err))
      }
      )
      .then(r => cTx.sendRawTx.manager.newChannel(r.txParams, cData))
      .then(hash => {
        expect(hash).toHaveLength(66)
        return waitForTransaction(hash)
      })
      .then(x => console.log('RECEIPT', x))

  })

  test('call - token allowance', () =>
  cTx.call.token.allowance(
    { to: cfg.gotToken },
    { _owner: acc1.address, _spender: cfg.manager }
  )
    .then(x => expect(x.eq(AllowanceAmount)).toBe(true))
)

}
