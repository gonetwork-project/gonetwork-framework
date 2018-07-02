import rpcCreate from './rpc'
import { as, BN } from '../utils'

import createContracts from './contracts-proxy'
import * as base from './spec.base'
import { init } from '../tests/init-contracts'
import * as E from 'eth-types'
import { RPC } from './types'

if (base.isInEnv('local')) {
  let cfg: base.LocalConfig

  // todo: make units for Got and other ERC20
  const GOTAllow = as.Wei(200)
  const HSAllow = as.Wei(200)

  let acc1: NonNullable<typeof cfg>['accounts'][0]
  let acc2: NonNullable<typeof cfg>['accounts'][0]
  let rpc: RPC
  let cTx: ReturnType<typeof createContracts>

  beforeAll(() => {
    init()
    cfg = base.local()
    console.log('\n\RUN\n\n', cfg.run)
    acc1 = cfg.accounts[0]
    acc2 = cfg.accounts[cfg.run];

    // block accessing accounts directly
    (cfg as any).accounts = null

    console.log(`ACC2: 0x${acc2.addressStr} abc`)

    rpc = rpcCreate(cfg.providerUrl)
    cTx = createContracts({
      owner: acc1.address,
      rpc,
      chainId: cfg.chainId,
      signatureCb: (fn) => fn(acc1.privateKey)
    })

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
          .then(x => expect(x[0]._value.eq(GOTAllow)).toBe(true))
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
    return rpc.gasPrice()
      .then((gasPrice) => cTx.txFull.manager.newChannel({ gasPrice, to: cfg.manager }, cData))
      .then((x) => {
        netChannel = (x.filter(l => l._type === 'ChannelNew')[0] as any).netting_channel
        expect(netChannel).toBeInstanceOf(Buffer)
      })
  })

  // 3. - approve some money for the net-channel
  test('txFull - approve HS', () => {
    const cData = {
      _spender: netChannel,
      _value: HSAllow
    }
    return rpc.gasPrice()
      .then(gasPrice => {
        return cTx.txFull.token.approve({ gasPrice, to: cfg.hsToken }, cData)
          .then(x => console.log('APPROVE-HS', x))
      })
  })

  // 4. - deposit some money in the netting-channel
  test('txFull - deposit', () => {
    return rpc.gasPrice()
      .then(gasPrice => {
        return cTx.txFull.channel.deposit({ gasPrice, to: netChannel }, { amount: HSAllow })
          .then(x => console.log('DEPOSIT-HS', x))
      })
  })
} else {
  test.skip('skipped - local only', () => undefined)
}
