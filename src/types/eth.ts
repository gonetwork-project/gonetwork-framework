/*
  All ethereum related types.

  The goal is to reduce ambiguity to minimum by:

   * using one underlying data structure for each type (e.g. Buffer for Address, BN for nonce, value)
     and uniform types across libraries used.
   * [TODO] Emulate opaque types with the following construct: type Alias = Simple & { __Alias__: true }
     e.g. type Wei = BN & { __Wei__: true } - so we remove any ambiguity and it will be impossible to pass
     Wei where Ether is expected - even if both use BN as the underlying type.

  When adding new types we want to provide source information by which we introduce them into the system,
  so people new to the project have full context and can learn about the ecosytem.
*/

// IMPORTANT - be aware that there is another popular BigNumber.js lib used in the ecosystem (maybe more)
import { BN } from 'bn.js'

// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
export enum CHAIN_ID {
  MAINNET = 1,
  MORDEN = 2,
  ROPSTEN = 3,
  RINKEBY = 4,
  ROOTSTOCK_MAINNET = 30,
  ROOTSTOCK_TESTNET = 31,
  KOVAN = 42,
  CLASSIC_MAINNET = 61,
  CLASSIC_TESTNET = 62,
  GETH_PRIVATE_CHAINS = 1337 // default
}

export type BNorNum = BN | number
// https://etherconverter.online/
export type Wei = BNorNum & { __Wei__: true }
export type Gwei = BNorNum & { __Gwei__: true }
export type Ether = BNorNum & { __Ether__: true }

export type Address = Buffer & { __Address__: true }
export type PrivKey = Buffer & { __PrivKey__: true }

export type Nonce = BNorNum & { __Nonce__: true }
export type BlockNumber = BNorNum & { __BlockNumber__: true }

export type GasLimit = BNorNum & { __GasLimit__: true }
export type GasPrice = Gwei & { __GasPrice__: true }

// we group them in one place to easily add all required functionalieties

export interface BasicRaw {
  Address: Buffer
  PrivKey: Buffer

  Nonce: BNorNum
  BlockNumber: BNorNum

  Wei: BNorNum
  Gwei: BNorNum
  Ether: BNorNum

  GasLimit: BNorNum
  GasPrice: BNorNum
}

export interface Basic {
  Address: Address
  PrivKey: PrivKey

  Nonce: Nonce
  BlockNumber: BlockNumber

  Wei: Wei
  Gwei: Gwei
  Ether: Ether

  GasLimit: GasLimit
  GasPrice: GasPrice
}

// Tx
export type TxDataType = Buffer | BN | Buffer[] | string | boolean

export type TxData = TxDataType[]

export interface TxParamsRequired {
  nonce: Nonce
  to: Address
}

export interface Signature {
  v: number // todo: int8
  r: Buffer
  s: Buffer
}
export interface TxConstParams extends TxParamsRequired, Partial<Signature> {
  data: TxData | null

  chainId?: CHAIN_ID
}

export interface TxParamsWithGas {
  value: Wei // defaults to 0
  gasLimit: GasLimit
  gasPrice: GasPrice
}

// todo: discuss defaults
export interface TxParams extends TxConstParams, TxParamsWithGas {}
