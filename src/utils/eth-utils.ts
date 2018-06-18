import * as E from 'eth-types'
import { BN } from 'bn.js'
import * as Tx from 'ethereumjs-tx'

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

export const as: {
  [K in keyof E.BasicRaw]: (v: E.BasicRaw[K]) => E.Basic[K]
} = {
  // Buffer
  Address: cast,
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
