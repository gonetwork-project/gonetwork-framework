import { Observable } from 'rxjs'

import { Client } from './setup'
import { Wei } from 'eth-types'

export const sendDirect = (from: Client, to: Client, amount: Wei) => () => {
  from.engine.sendDirectTransfer(to.owner.address, amount)
  return Observable.fromEvent(to.p2p, 'message-received')
    .take(1)
    .delay(5) // small delay to allow processing by engine
    .toPromise()
}
