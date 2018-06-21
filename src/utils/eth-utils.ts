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

export const add = <T extends BN> (a: T, b: T) => a.add(b) as T
export const add1 = <T extends BN> (n: T) => n.add(new BN(1)) as T

const cast = <O, N extends O> (v: O) => v as N
export const castNum = <O extends BN, N extends BN> (v: O | number | string) => {
  if (BN.isBN(v)) return (v as any) as N
  else if (typeof v === 'number') {
    return new BN(v) as N
  } else {
    return new BN(util.stripHexPrefix(v as string), 16) as N
  }
}

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

// todo: add test https://github.com/ethereum/wiki/wiki/JSON-RPC#hex-value-encoding
export const serializeRpcParam = (p: E.TxDataType): string | string[] => {
  if (Array.isArray(p)) {
    return p.map(b => `0x${b.toString('hex')}`)
  } else if (p instanceof Buffer) {
    return `0x${p.toString('hex')}`
  } else if (BN.isBN(p)) {
    return `0x${p.toString(16)}`
  } else if (typeof p === 'string') {
    // not used much - but we need it for DefaultBlock
    return p
  } else {
    // todo: boolean are not needed now
    throw new Error('NOT_SUPPORTED')
    // todo: make sure proper according to spec
    // return p ? '0x1' : '0x0'
  }
}

export const serializeRpcParams = (ps: object) =>
  Object.keys(ps)
    .reduce((acc, p) => {
      acc[p] = serializeRpcParam(ps[p])
      return acc
    }, {} as { [K: string]: string | string[]})
