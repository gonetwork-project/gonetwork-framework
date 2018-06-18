import * as Tx from './tx-utils'
import { as } from '../utils/eth-utils'

import * as base from './spec.base'

const [acc1, acc2] = base.getAccounts()

test('cast Address to abi', () => {
  const adds = [acc1.address, acc2.address]
  const mapped = Tx.castAddressOrMany(adds)
  expect(mapped[0]).toBe(as.AddressHex(acc1.addressStr))
  expect(mapped[1]).toBe(as.AddressHex(acc2.addressStr))
  expect(Tx.castAddressOrMany(acc1.address)).toBe(as.AddressHex(acc1.addressStr))
})

test('const params to transaction [NO DATA]', () => {
  const t = Tx.paramsToTxConst.token.name({
    nonce: as.Nonce(0),
    to: acc2.address
  })(null)
  t.sign(acc1.privateKey)
  expect(t.from.toString('hex')).toBe(acc1.addressStr)
})

test('const params to transaction [DATA]', () => {
  const t = Tx.paramsToTxConst.manager.contractExists({
    nonce: as.Nonce(0),
    to: acc2.address
  })({
    channel: acc2.address
  })
  t.sign(acc1.privateKey)
  expect(t.from.toString('hex')).toBe(acc1.addressStr)
})
