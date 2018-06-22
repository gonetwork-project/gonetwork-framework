import * as Tx from './blockchain-utils'
import { as } from '../utils/eth-utils'

import * as base from './spec.base'

const [acc1, acc2] = base.getAccounts()

// test('const params to transaction [NO DATA]', () => {
//   const t = Tx.paramsToTxConst.token.name({
//     nonce: as.Nonce(0),
//     to: acc2.address
//   })(null)
//   t.sign(acc1.privateKey)
//   expect(t.from.toString('hex')).toBe(acc1.addressStr)
// })

// test('const params to transaction [DATA]', () => {
//   const t = Tx.paramsToTxConst.manager.contractExists({
//     nonce: as.Nonce(0),
//     to: acc2.address
//   })({
//     channel: acc2.address
//   })
//   t.sign(acc1.privateKey)
//   expect(t.from.toString('hex')).toBe(acc1.addressStr)
// })
