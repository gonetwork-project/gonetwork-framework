import * as E from 'eth-types'
import { BN } from 'bn.js'
import * as util from 'ethereumjs-util'

export {
  BN, util
}

// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
export const CHAIN_ID: Readonly<E.ChainIds> = {
  MAINNET: 1,
  MORDEN: 2,
  ROPSTEN: 3,
  RINKEBY: 4,
  ROOTSTOCK_MAINNET: 30,
  ROOTSTOCK_TESTNET: 31,
  KOVAN: 42,
  CLASSIC_MAINNET: 61,
  CLASSIC_TESTNET: 62,
  GETH_PRIVATE_CHAINS: 1337 // default
}

const cast = <O, N extends O> (v: O) => v as N
const castNum = <O extends (BN | number), N extends O> (v: O) =>
  (BN.isBN(v) ? v : new BN(v as number)) as N

export const castToHex = <O extends (Buffer | string), N extends O> (
  isValid: (x: string) => boolean,
  message = 'Cannot convert to hex'
) => (v: O) => {
  let x: string
  if (v instanceof Buffer) {
    x = v.toString('hex')
  } else {
    x = v as string
  }
  x = util.addHexPrefix(x)
  if (isValid(x)) {
    return x as N
  }
  throw message
}

export const addressToHex = (add: E.Address): E.AddressHex =>
  castToHex(util.isValidAddress, 'Cannot convert Address/Buffer to AddressHex.')(add) as E.AddressHex

export const as: {
  [K in keyof E.BasicRaw]: (v: E.BasicRaw[K]) => E.Basic[K]
} = {
  // Buffer
  Address: cast,
  AddressHex: castToHex(util.isValidAddress, 'Cannot convert string to AddressHex.'),
  PrivateKey: cast,

  // BN - count
  BlockNumber: castNum,
  Nonce: castNum,

  // BN - value
  GasLimit: castNum,
  GasPrice: castNum,
  Ether: castNum,
  Gwei: castNum,
  Wei: castNum
}
