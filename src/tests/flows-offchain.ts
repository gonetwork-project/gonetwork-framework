import { Observable } from 'rxjs'

import { Client } from './setup'
import { Wei, BlockNumber } from 'eth-types'
import { GenerateRandomSecretHashPair } from '../state-channel/message'
import { BN } from '../utils'

export const transferredAmounts = (from: Client, to: Client) => [
  from.engine.channelByPeer[to.owner.addressStr].myState.transferredAmount,
  to.engine.channelByPeer[from.owner.addressStr].peerState.transferredAmount
]

export const transferredInfo = (from: Client, to: Client, amount: Wei) =>
  `expected: ${amount.toString()}, ` +
  `owner: ${from.engine.channelByPeer[to.owner.addressStr].myState.transferredAmount.toString()}, ` +
  `peer: ${to.engine.channelByPeer[from.owner.addressStr].peerState.transferredAmount.toString()}`

export const transferredEqual = (c1: Client, fromC1: Wei, c2: Client, fromC2: Wei) =>
  transferredAmounts(c1, c2).every(a => a.eq(fromC1)) && transferredAmounts(c2, c1).every(a => a.eq(fromC2))
  || {
    c1: transferredInfo(c1, c2, fromC1),
    c2: transferredInfo(c2, c1, fromC2)
  }
export const sendDirect = (from: Client, to: Client, amount: Wei) => () => {
  const received = Observable.fromEvent(to.p2p, 'message-received')
  .do(x => console.log('RECEIVED', x))
  .take(1) // DirectTransfer
  .delay(25) // allow processing by engine
  .toPromise()

  try {
    from.engine.sendDirectTransfer(to.owner.address, amount)
  } catch (e) {
    // console.log(e)
    throw e
  }

  return received
}

export const sendMediated = (from: Client, to: Client, amount: Wei) => () => {
  // console.warn('MEDIATED', from.owner.addressStr, to.owner.addressStr, amount.toString())
  const secretHashPair = GenerateRandomSecretHashPair()
  return from.blockchain.monitoring.blockNumbers()
    .take(1)
    .do((currentBlock) => {
      from.engine.sendMediatedTransfer(
        to.owner.address,
        to.owner.address,
        amount,
        currentBlock.add(from.engine.revealTimeout).add(new BN(1)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )
    })
    .delayWhen(() =>
      Observable.fromEvent(to.p2p, 'message-received')
        .skip(2) // MediatedTransfer, RevealSecret
        .take(1) // SecretToProof
        .delay(0) // allow processing by engine
    )
    .toPromise()
}
