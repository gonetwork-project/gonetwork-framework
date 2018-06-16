import * as E from '../types/eth'
import { BN } from 'bn.js'

const cast = <O, N extends O> (v: O) => v as N
const castNum = <O extends (BN | number), N extends O> (v: O) =>
  (BN.isBN(v) ? v : new BN(v as number)) as N

export const to: {
  [K in keyof E.BasicRaw]: (v: E.BasicRaw[K]) => E.Basic[K]
} = {
  // Buffer
  Address: cast,
  PrivKey: cast,

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
