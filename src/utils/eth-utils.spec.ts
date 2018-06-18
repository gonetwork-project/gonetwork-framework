import { addressToHex, as, util, BN } from './eth-utils'

// this is a bit crazy ideally it would not be needed
test('Address conversions', () => {
  const addressStr = 'f8e9b7b0f5936c0221b56f15ea2182d796d09e63'
  const addressHex = as.AddressHex(addressStr)
  const address = as.Address(new Buffer(addressStr, 'hex'))

  expect(as.AddressHex(addressStr)).toBe(addressHex)
  expect(addressToHex(address)).toBe(addressHex)
})

test('Address conversions throws', () => {
  // last character missing
  const addressStr = 'f8e9b7b0f5936c0221b56f15ea2182d796d09e6'
  const address = as.Address(new Buffer(addressStr, 'hex'))

  expect(() => as.AddressHex(addressStr)).toThrow()
  expect(() => addressToHex(address)).toThrow()
})
