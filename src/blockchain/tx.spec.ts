import rpcCreate from './rpc'
import { as, BN } from '../utils'

import { waitFor, setWaitForDefault } from './monitoring'
import createContracts from './contracts-proxy'
import * as base from './spec.base'
import { init } from '../tests/init'
import * as E from 'eth-types'

let _cfg = base.config('local')
let cfg: NonNullable<typeof _cfg> = _cfg as any
setWaitForDefault({ timeout: 60 * 1000, interval: 200 })

const GOTAllow = as.Wei(200) // todo: make units for Got and other ERC20
const HSAllow = as.Wei(200)

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

  // FOLLOWING TESTS NEED TO RUN IN THIS ORDER
  // 1. - approve got tokens
  test('txFull - approve GOT', () => {
    const cData = {
      _spender: cfg.manager,
      _value: GOTAllow
    }
    return Promise.all([rpc.getTransactionCount({ address: acc1.address }), rpc.gasPrice()])
      .then(([nonce, gasPrice]) => {
        return cTx.txFull.token.approve({ nonce, gasPrice, to: cfg.gotToken }, cData)
          .then(x => console.log('APPROVE-GOT', x))
      })
  })

  // (optional)
  test('call - token allowance', () =>
    cTx.call.token.allowance(
      { to: cfg.gotToken },
      { _owner: acc1.address, _spender: cfg.manager }
    )
      .then(x => expect(x.eq(GOTAllow)).toBe(true))
  )

  // 2. - create new channel
  let netChannel: E.Address
  test('txFull - new channel', () => {
    const partner = acc2.address
    const cData = {
      partner,
      settle_timeout: new BN(500)
    }
    return Promise.all([rpc.getTransactionCount({ address: acc1.address }), rpc.gasPrice()])
      .then(([nonce, gasPrice]) => cTx.txFull.manager.newChannel({ nonce, gasPrice, to: cfg.manager }, cData))
      .then((x) => {
        console.log('NEW-CHANNEL', x.length, x)
        // todo: fixme - ideally we matched what events to contract methods
        netChannel = (x.filter(l => l._type === 'ChannelNew')[0] as any).netting_channel
      })
  })

  // 3. - approve some money for the net-channel
  test('txFull - approve HS', () => {
    const cData = {
      _spender: netChannel,
      _value: HSAllow
    }
    return Promise.all([rpc.getTransactionCount({ address: acc1.address }), rpc.gasPrice()])
      .then(([nonce, gasPrice]) => {
        return cTx.txFull.token.approve({ nonce, gasPrice, to: cfg.hsToken }, cData)
          .then(x => console.log('APPROVE-HS', x))
      })
  })

  // 4. - deposit some money in the netting-channel
  test('txFull - deposit', () => {
    return Promise.all([rpc.getTransactionCount({ address: acc1.address }), rpc.gasPrice()])
      .then(([nonce, gasPrice]) => {
        return cTx.txFull.channel.deposit({ nonce, gasPrice, to: netChannel }, { amount: HSAllow })
          .then(x => console.log('DEPOSIT-HS', x))
      })
  })

}
