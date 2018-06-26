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

test('call - token.balanceOf', () => {
  // console.log(cfg.hsToken, cfg.acc1.addressStr, cfg.acc2.addressStr)
  return rpc.getTransactionCount({ address: cfg.acc1.address })
    .then(n =>
      cTx.call.token.balanceOf({
        to: cfg.hsToken
        // nonce: n // ?
      } as any,
        {
          _owner: cfg.acc1.address
        })
    )
    .then(x => console.log(x))
})

test('call - token.totalSupply', () => {
  // console.log(cfg.hsToken, cfg.acc1.addressStr, cfg.acc2.addressStr)
  return rpc.getTransactionCount({ address: cfg.acc1.address })
    .then(n =>
      cTx.call.token.totalSupply({
        to: cfg.token,
        from: cfg.acc1.address
      } as any)
    )
    .then(x => console.log(x))
})

test('call', () =>
  rpc.getTransactionCount({ address: cfg.manager })
    .then(n => cTx.call.manager.fee({
      to: cfg.manager
    } as any) // TODO FIXME
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
      // console.log('NONCE,PRICE', n, p)
      return cTx.estimateRawTx.token.approve({
        nonce: n,
        to: cfg.hsToken,
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

test.skip('sendRawTx - manager.newChannel', () => {
  const cData = {
    partner: cfg.acc2.address,
    settle_timeout: new BN(500)
  }
  return Promise.all([rpc.getTransactionCount({ address: cfg.acc1.address }), rpc.gasPrice()])
    .then(([n, p]) => {
      console.log('NONCE,PRICE', n, p)
      return cTx.estimateRawTx.manager.newChannel({
        nonce: as.Nonce(n),
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
