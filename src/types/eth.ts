/// <reference path="external.ts" />

/*
  All ethereum related types.

  IMPORTANT Only types can be placed in this file.

  The goal is to reduce ambiguity to minimum by:

   * using one underlying data structure for each type (e.g. Buffer for Address, BN for nonce, value)
     and uniform types across libraries used.
   * Emulate opaque types with the following construct: type Alias = Simple & { __Alias__: true }
     e.g. type Wei = BN & { __Wei__: true } - so we remove any ambiguity and it will be impossible to pass
     Wei where Ether is expected - even if both use BN as the underlying type.

  When adding new types we want to provide source information by which we introduce them into the system,
  so people new to the project have full context and can learn about the ecosytem.
*/

declare module 'eth-types' {
  // IMPORTANT - be aware that there is another popular BigNumber.js lib used in the ecosystem (maybe more)
  import { BN } from 'bn.js'

  export type BN_Num_Str = BN | number | string
  // https://etherconverter.online/
  export type Wei = BN & { __Wei__: true }
  // export type Gwei = BN & { __Gwei__: true }
  export type Ether = BN & { __Ether__: true }

  export type Address = Buffer & { __Address__: true }
  export type AddressHex = string & { __AddressHex__: true }
  export type PrivateKey = Buffer & { __PrivKey__: true }

  export type Nonce = BN & { __Nonce__: true }
  export type BlockNumber = BN & { __BlockNumber__: true }

  export type Gas = BN & { __GasLimit__: true }
  export type GasPrice = Wei & { __GasPrice__: true }

  // we group them in one place to easily add all required functionalities

  export interface BasicRaw {
    Address: Buffer
    AddressHex: string
    PrivateKey: Buffer

    Nonce: BN_Num_Str
    BlockNumber: BN_Num_Str

    Wei: BN_Num_Str
    // Gwei: BN_Num_Str
    Ether: BN_Num_Str

    Gas: BN_Num_Str
    GasPrice: BN_Num_Str
  }

  export interface Basic {
    Address: Address
    AddressHex: AddressHex
    PrivateKey: PrivateKey

    Nonce: Nonce
    BlockNumber: BlockNumber

    Wei: Wei
    // Gwei: Gwei
    Ether: Ether

    Gas: Gas
    GasPrice: GasPrice
  }

  // non-critical types - not much need making them opaque
  export type TxHash = string
  export type Topic = Buffer
  // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getfilterchanges
  export type Log = {
    blockNumber: BlockNumber | null // null == pending
    address: Address
    data: Buffer[]
    topics: Topic[] // technically 0 - 4
  }

  export type TxRaw = string

  // https://github.com/ethereum/wiki/wiki/JSON-RPC#the-default-block-parameter
  // conversion to hex ath boundary of the system
  export type DefaultBlock = BlockNumber | 'earliest' | 'latest' | 'pending'

  // Tx
  export type TxDataType = Buffer | BN | Buffer[] | string | boolean

  export type TxData = TxDataType[]

  export interface TxParamsRequired {
    to: Address
  }

  export interface Signature {
    v: number
    r: Buffer
    s: Buffer
  }
  export interface TxConstParams extends TxParamsRequired, Partial<Signature> {
    data: TxData | null

    chainId: ChainId
  }

  export interface TxParamsWithGas {
    value: Wei // defaults to 0
    gasLimit: Gas // if not set will be estimated automatically
    gasPrice: GasPrice // if not set will be estimated automatically
    nonce: Nonce // if not set will be obtained automatically
    from: Address // only needed for estimatiation - real transactions are signed and from is recovered
  }

  export interface TxParams extends TxConstParams, TxParamsWithGas { }

  export interface TxResult<T = any> {
    result: T
    // todo: fill
  }

  export type TxSuccess = '0x1'
  export type TxFail = '0x0'

  export type TxStatus = TxSuccess | TxFail

  export interface TxReceipt {
    blockNumber: BlockNumber
    from: Address
    to: Address
    gasUsed: Gas
    contractAddress: Address | null
    logs: string[] // Log[]
    transactionHash: TxHash
    status: TxStatus
  }

  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md

  export type ChainId = 1 | 2 | 3 | 4 | 30 | 31 | 42 | 61 | 62 | 1337
  export interface ChainIds {
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

  // TODO - consider
  export type SignatureCb = (cb: (pk: PrivateKey) => void) => void
}
