import { Client } from './setup'

import { Wei, Address } from 'eth-types'
import { BN } from '../utils'
import { ManagerEventsToArgs } from '../__GEN__/ChannelManagerContract'

const log = <T> (msg: string) => (p: T): Promise<T> => {
  console.log(msg, p)
  return Promise.resolve(p)
}

export const createChannel = (c1: Client, add2: Address, amount: Wei) =>
  c1.txs.approve({ to: c1.contracts.gotToken },
    { _spender: c1.contracts.manager, _value: amount })
    .then(() =>
      c1.txs.newChannel({ to: c1.contracts.manager },
        { partner: add2, settle_timeout: new BN(500) }))
    .then(logs =>
      (logs.filter(x => x._type === 'ChannelNew')[0] as ManagerEventsToArgs['ChannelNew']).netting_channel)

export const deposit = (from: Client, token: Address, channel: Address, amount: Wei) =>
  from.txs.approve({ to: token }, { _spender: channel, _value: amount })
    .then(() => from.txs.deposit({ to: channel }, { amount: amount }))

export const createChannelAndDeposit = (from: Client, to: Client, amount: Wei) =>
  createChannel(from, to.owner.address, amount)
    .then(log('CHANNEL_CREATED'))
    .then(ch => deposit(from, from.contracts.hsToken, ch, amount)
      .then(() => ({ channel: ch })))
    .then(log('DEPOSITED'))
