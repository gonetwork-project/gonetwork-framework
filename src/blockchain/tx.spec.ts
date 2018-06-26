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

  test('call - token.balanceOf', () => {
    cTx.call.token.balanceOf({
      to: cfg.hsToken
    },
      {
        _owner: acc1.address
      })
      .then(x => console.log('WTF?', typeof x))
  })

  test('call - token.totalSupply', () => {
    // console.log(cfg.hsToken, acc1.addressStr, cfg.acc2.addressStr)
    cTx.call.token.totalSupply({
      to: cfg.gotToken,
      from: acc1.address
    })
      .then(x => console.log('SUPP', x))
  })

  test('call - manager.fee', () =>
    cTx.call.manager.fee({
      to: cfg.manager
    }) // TODO FIXME
      .then(x => {
        console.log('FEE', x)
        expect('TODO').toBe('TODO')
      })
  )

  test('sendRawTx - gotToken.approve', () => {
    const cData = {
      _spender: cfg.manager,
      _value: as.Wei(20000000)
    }
    return Promise.all([rpc.getTransactionCount({ address: acc1.address }), rpc.gasPrice()])
      .then(([n, p]) => {
        console.log('NONCE,PRICE', n, p)
        return cTx.estimateRawTx.token.approve({
          nonce: n,
          to: cfg.gotToken,
          gasPrice: p
        }, cData)
          .catch(err => {
            // console.log('CANNOT_ESTIMATE', err)
            return Promise.reject(err)
          })
      }
      )
      .then(r => {
        // console.log('BEFORE-SEND', r)
        return cTx.sendRawTx.token.approve(r.txParams, cData)
      })
    // .then(x => console.log('NEW_TX', x))
  })

  test('sendRawTx - manager.newChannel (if do not exists)', () => {
    const partner = acc2.address
    // cTx.call.manager.contractExists({ to: cfg.manager }, { channel: partner })

    const cData = {
      partner,
      settle_timeout: new BN(500)
    }
    return base.waitFor(1000) // seems that old Nonce is being reported for some time
      .then(() => Promise.all([rpc.getTransactionCount({ address: acc1.address }), rpc.gasPrice()]))
      .then(([n, p]) => {
        console.log('NONCE', n)
        return cTx.estimateRawTx.manager.newChannel({
          nonce: as.Nonce(n),
          to: cfg.manager,
          gasPrice: p
        }, cData)
          .catch(err => {
            console.log('CANNOT_ESTIMATE', err)
            return Promise.reject(err)
          })
      }
      )
      .then(r => {
        console.log('BEFORE-SEND', r)
        return cTx.sendRawTx.manager.newChannel(r.txParams, cData)
      })
      .then(x => console.log('NEW_TX', x))
  })
}
