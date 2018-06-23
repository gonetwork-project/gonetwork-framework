import rpcCreate from './rpc'
import { as, BN } from '../utils'

import createContracts from './tx'
import * as base from './spec.base'

const cfg = base.config()
const rpc = rpcCreate(cfg.providerUrl)

const cTx = createContracts({
  rpc,
  chainId: cfg.chainId,
  signatureCb: (fn) => fn(cfg.acc1.privateKey)
})

test('call - token.balanceOf', () =>
  cTx.call.token.balanceOf({
    to: cfg.hsToken,
    nonce: as.Nonce(0) // ?
  }, {
    _owner: cfg.acc1.address
  })
    .then(x => console.log(x))
)

test('estimate - token.approve (wrong addresses)', () =>
  // this estimation passes if though addresses are not contract addresses weird
  cTx.estimateRawTx.token.approve({
    to: cfg.acc1.address,
    nonce: as.Nonce(3)
  },
    {
      _spender: cfg.acc2.address,
      _value: as.Wei(20000)
    })
    .then(r => {
      // gasLimit is ~20% more than the estimated
      expect(r.estimatedGas.lt(r.txParams.gasLimit)).toBe(true)
      expect(r.txParams.nonce.eq(as.Nonce(3))).toBe(true)
      expect(r.txParams.to).toBe(cfg.acc1.address)
    })
)

test('call', () =>
  rpc.getTransactionCount({ address: cfg.manager })
    .then(n => cTx.call.manager.fee({
      nonce: n,
      to: cfg.manager
    })
      // todo unwrap params
      .then(x => expect('TODO').toBe('TODO'))
    )
)

test('sendRawTx - token.approve', () => {
  const cData = {
    _spender: cfg.manager,
    _value: as.Wei(20000000)
  }
  return Promise.all([rpc.getTransactionCount({ address: cfg.acc1.address }), rpc.gasPrice()])
    .then(([n, p]) => {
      console.log('NONCE,PRICE', n, p)
      return cTx.estimateRawTx.token.approve({
        nonce: as.Nonce(n.add(new BN(1))),
        to: cfg.token,
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
      return cTx.sendRawTx.token.approve(r.txParams, cData)
    })
    .then(x => console.log('NEW_TX', x))
})

test.skip('sendRawTx - manager.newChannel', () => {
  const cData = {
    partner: cfg.acc2.address,
    settle_timeout: new BN(500)
  }
  return Promise.all([rpc.getTransactionCount({ address: cfg.acc1.address }), rpc.gasPrice()])
    .then(([n, p]) => {
      console.log('NONCE,PRICE', n, p)
      return cTx.estimateRawTx.manager.newChannel({
        nonce: as.Nonce(n.add(new BN(1))),
        to: cfg.manager,
        // value: as.Wei(100000)
        gasPrice: p
        // gasLimit: as.Gas(20000000000)
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
