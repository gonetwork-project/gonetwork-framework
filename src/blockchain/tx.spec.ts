import rpcCreate from './rpc'
import { as, BN } from '../utils'

import createContracts from './tx'
import * as base from './spec.base'
import { init } from '../e2e/init'

let _cfg = base.config('local')
let cfg: NonNullable<typeof _cfg> = _cfg as any

beforeAll(() => {
  init(true)
  cfg = base.config('local') as any
})

if (!cfg) {
  test.skip('skipped - local only', () => undefined)
} else {
  const rpc = rpcCreate(cfg.providerUrl)
  const [acc1, acc2] = cfg.accounts

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

  test('sendRawTx - gotToken.approve', () => {
    const cData = {
      _spender: cfg.manager,
      _value: as.Wei(20000000)
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
  })

  // TODO - finish
  test('sendRawTx - manager.newChannel - approve - deposit', () => {
    const partner = acc2.address
    const cData = {
      partner,
      settle_timeout: new BN(500)
    }
    return base.waitFor(1000) // todo: change waitFor for proper monitoring
      .then(() => Promise.all([rpc.getTransactionCount({ address: acc1.address }), rpc.gasPrice()]))
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
  })

  test('call - token allowance', () =>
    cTx.call.token.allowance({
      to: cfg.gotToken
    }, {
        _owner: acc1.address, _spender: cfg.manager
      })
      .then(x => expect(x.eq(as.Wei(20000000))).toBe(true))
  )
}
