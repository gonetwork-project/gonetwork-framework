import { Observable } from 'rxjs'

import { Client } from './setup'
import { Wei } from 'eth-types'

export const transferredAmounts = (from: Client, to: Client) =>
  ([from.engine.channelByPeer[to.owner.addressStr].myState.transferredAmount,
    to.engine.channelByPeer[from.owner.addressStr].peerState.transferredAmount])

export const transferredEqual = (c1: Client, fromC1: Wei, c2: Client, fromC2: Wei) =>
  transferredAmounts(c1, c2).every(a => a.eq(fromC1)) && transferredAmounts(c2, c1).every(a => a.eq(fromC2))

export const sendDirect = (from: Client, to: Client, amount: Wei) => () => {
  from.engine.sendDirectTransfer(to.owner.address, amount)
  return Observable.fromEvent(to.p2p, 'message-received')
    .take(1)
    .delay(5) // small delay to allow processing by engine
    .toPromise()
}
