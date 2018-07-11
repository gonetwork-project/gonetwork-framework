import * as E from 'eth-types'
import { BN } from 'bn.js'
import * as util from 'ethereumjs-util'
import * as abi from 'ethereumjs-abi'
import * as Tx from 'ethereumjs-tx'

import * as T from '../types'
import GenericLogDecoder from './generic-log-decoder'

export {
  BN, util, abi, Tx
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
    if (v[1] === 'x') {
      return new BN(util.stripHexPrefix(v as string), 16) as N
    }
    return new BN(v, 10) as N
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
  Gas: castNum,
  GasPrice: castNum,
  Ether: castNum,
  // Gwei: castNum,
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
  } else if (typeof p === 'boolean') {
    console.log(p)
    // todo: boolean are not needed now
    throw new Error('NOT_SUPPORTED_BOOL')
    // todo: make sure proper according to spec
    // return p ? '0x1' : '0x0'
  } else if (typeof p === 'object') {
    // if none of the basic than richer object - for example eth_getLogs
    return serializeRpcParams(p) as any
  } else if (typeof p === 'number') {
    return `0x${new BN(p).toString(16)}`
  } else {
    throw new Error('NOT_SUPPORTED')
  }
}

export const serializeRpcParams = (ps: object) =>
  Object.keys(ps)
    .reduce((acc, k) => {
      acc[k] = serializeRpcParam(ps[k])
      return acc
    }, {} as { [K: string]: string | string[] })

// todo: remove it and use generated stuff
const ChannelManagerContract = require('../../smart-contracts/build/contracts/ChannelManagerContract.json')
const NettingChannelContract = require('../../smart-contracts/build/contracts/NettingChannelContract.json')
const HumanStandardTokenContract = require('../../smart-contracts/build/contracts/HumanStandardToken.json')

const decoder = new GenericLogDecoder([ChannelManagerContract, NettingChannelContract, HumanStandardTokenContract])
export const decodeLogs = (logs: any[]) => logs.map(decoder.decode.bind(decoder)) as T.BlockchainEvent[]

let id = 0
export const nextId = () => {
  if (id === Number.MAX_SAFE_INTEGER) {
    id = 0
  }
  return ++id
}

export const serializeSignature = (sig: E.Signature) => {
  let packed = abi.solidityPack(['bytes32', 'bytes32', 'uint8'], [sig.r, sig.s, sig.v])
  if (packed.length !== 65) {
    throw new Error('Incompatible Signature!')
  }
  return packed
}

export const addressFromString = (a: string) => util.toBuffer(util.stripHexPrefix(a)) as E.Address

type AsString<T> = {
  [K in keyof T]: T[K] extends any[] ? string[] : string
}

export const parseTxReceipt = (r: AsString<E.TxReceipt>): E.TxReceipt => ({
  blockNumber: as.BlockNumber(r.blockNumber),
  contractAddress: addressFromString(r.contractAddress),
  from: addressFromString(r.from),
  to: addressFromString(r.to),
  gasUsed: as.Gas(r.gasUsed),
  transactionHash: r.transactionHash,
  status: r.status as E.TxStatus,
  logs: r.logs as any
})
