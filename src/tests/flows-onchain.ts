import { Client } from './setup'

import { Wei, Address } from 'eth-types'
import { ManagerEventsToArgs } from '../__GEN__/ChannelManagerContract'
import { as } from '../utils'

const log = <T> (msg: string, logValue = false, ...rest: any[]) => (p: T): Promise<T> => {
  logValue ? console.log(msg, p, ...rest) : console.log(msg, ...rest)
  return Promise.resolve(p)
}

export const createChannel = (c1: Client, add2: Address, amount: Wei) =>
  c1.txs.approve({ to: c1.contracts.gotToken },
    { _spender: c1.contracts.manager, _value: amount })
    .then(() =>
      c1.txs.newChannel({ to: c1.contracts.manager },
        { partner: add2, settle_timeout: c1.engine.settleTimeout }))
    .then(logs =>
      (logs.filter(x => x._type === 'ChannelNew')[0] as ManagerEventsToArgs['ChannelNew']).netting_channel)

export const deposit = (from: Client, token: Address, channel: Address, amount: Wei) =>
  from.txs.approve({ to: token }, { _spender: channel, _value: amount })
    .then(() => from.txs.deposit({ to: channel }, { amount: amount }))

export const createChannelAndDeposit = (from: Client, to: Client, amount: Wei) =>
  Promise.all([
    from.blockchain.monitoring.asStream('ChannelNewBalance')
      .take(1)
      .delay(0)
      .toPromise(),
    createChannel(from, to.owner.address, amount)
      .then(ch => deposit(from, from.contracts.testToken, ch, amount)
        .then(() => ({ channel: ch }))
        .then(log(`CREATED AND DEPOSITED ${amount.toString()}$ chan: 0x${ch.toString('hex')} from: 0x${from.owner.addressStr} to: 0x${to.owner.addressStr}`))
      )
  ])
    .then(([_, x]) => x)

export type Balances = { channel: Wei, opener: Wei, other: Wei }
export const checkBalances = (openerToOtherNet: Wei, openerDeposit: Wei) =>
  ({ before, after }: { before: Balances, after: Balances }) => {
    // console.log(openerToOtherNet, before, after, after.opener.sub(before.opener))
    expect(before.channel.eq(openerDeposit)).toBe(true)
    expect(after.channel.eq(as.Wei(0))).toBe(true)
    expect(before.opener.add(openerDeposit.sub(openerToOtherNet)).eq(after.opener)).toBe(true)
    expect(before.other.add(openerToOtherNet).eq(after.other)).toBe(true)
  }

export const getBalances = (opener: Client, other: Client, channelAddress: Address) => () =>
  Promise.all([channelAddress, opener.owner.address, other.owner.address].map(a =>
    opener.blockchain.contractsProxy.call.token.balanceOf({
      to: opener.contracts.testToken
    }, { _owner: a })
  ))
    .then(([channel, opener, other]) => ({
      channel, opener, other
    }))

export const closeChannel = (opener: Client, other: Client, expectedTransfers: 0 | 1 | 2,
  channelAddress = opener.engine.channelByPeer[other.owner.addressStr].channelAddress) => {
  const balances = getBalances(opener, other, channelAddress)
  return balances()
    .then(before =>
      Promise.all([
        other.blockchain.monitoring.asStream('ChannelSettled')
          .take(1)
          .mergeMap(balances)
          .toPromise(),
        other.blockchain.monitoring.asStream('Transfer')
          .take(expectedTransfers === 0 ? 0 : expectedTransfers + 1) // 1 for Got Token
          .toArray()
          .toPromise(),
        opener.engine.closeChannel(channelAddress),
        other.blockchain.monitoring.asStream('TransferUpdated')
          .mergeMapTo(other.blockchain.monitoring.blockNumbers())
          .skip(1)
          .take(1)
          .switchMap(start =>
            other.blockchain.monitoring.blockNumbers()
              .filter(bn => bn.gt(start.add(other.engine.settleTimeout)))
          )
          .take(1)
          .toPromise()
          .then(() => other.engine.settleChannel(channelAddress))
      ])
        .then(([after]) => ({
          before, after
        }) as { before: Balances, after: Balances })
    )
}
