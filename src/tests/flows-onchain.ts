import { Client } from './setup'

import { Wei, Address } from 'eth-types'
import { BN, as } from '../utils'
import { ManagerEventsToArgs } from '../__GEN__/ChannelManagerContract'
import { Observable } from 'rxjs'

const log = <T> (msg: string, logValue = false, ...rest: any[]) => (p: T): Promise<T> => {
  logValue ? console.log(msg, p, ...rest) : console.log(msg, ...rest)
  return Promise.resolve(p)
}

export const createChannel = (c1: Client, add2: Address, amount: Wei) =>
  c1.txs.approve({ to: c1.contracts.gotToken },
    { _spender: c1.contracts.manager, _value: amount })
    .then(log('APPROVED'))
    .then(() =>
      c1.txs.newChannel({ to: c1.contracts.manager },
        { partner: add2, settle_timeout: c1.engine.settleTimeout }))
    .then(logs =>
      (logs.filter(x => x._type === 'ChannelNew')[0] as ManagerEventsToArgs['ChannelNew']).netting_channel)

export const deposit = (from: Client, token: Address, channel: Address, amount: Wei) =>
  from.txs.approve({ to: token }, { _spender: channel, _value: amount })
    .then(log('APPROVED'))
    .then(() => from.txs.deposit({ to: channel }, { amount: amount }))

export const createChannelAndDeposit = (from: Client, to: Client, amount: Wei) =>
  createChannel(from, to.owner.address, amount)
    .then(log('CHANNEL_CREATED'))
    .then(ch => deposit(from, from.contracts.hsToken, ch, amount)
      .then(() => ({ channel: ch })))
    .then(log('DEPOSITED'))

export const closeChannel = (opener: Client, other: Client, openerAmount?: Wei | 0, otherAmount?: Wei | 0,
  channel = opener.engine.channelByPeer[other.owner.addressStr].channelAddress) =>
  Promise.all([
    other.blockchain.monitoring.asStream('Transfer')
      .do(x => console.warn(x))
      .take([openerAmount, otherAmount].filter(Boolean).length)
      .toArray()
      .do(x => console.warn(x))
      .toPromise(),
    opener.engine.closeChannel(channel)
      .then(log('CHANNEL-CLOSED')),
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
      .then(() => other.engine.settleChannel(channel))
      .then(log('CHANNEL-SETTLED'))
  ])
