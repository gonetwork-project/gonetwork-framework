import * as util from 'ethereumjs-util'
import * as sjcl from 'sjcl'
import * as abi from 'ethereumjs-abi'
import { BN } from 'bn.js'
import { EthAddress, EthPrivateKey, EthNonce, EthBlockNumber } from '../types'

/**
 * @namespace message
 */

/**
 * @const {Buffer} EMPTY_32BYTE_BUFFER
 * @memberof message
 */
export const EMPTY_32BYTE_BUFFER = Buffer.alloc(32)

/**
 * @const {Buffer} EMPTY_20BYTE_BUFFER
 * @memberof message
 */
export const EMPTY_20BYTE_BUFFER = Buffer.alloc(20)

/** @class A hashable interface class
 * @memberof message
 */
export class Hashable {
  /** getMessageHash - must implement */
  getMessageHash () {
    throw new Error('unimplemented getMessageHash')
  }
}

/** Convert a base 16 int to a BN
 * @param {int} value - convert base 16 value to bn
 * @returns {BN}
 * @memberof message
 */
// FIXME - remove `any` and the following errors
export function TO_BN (value: number | BN | any) {
  if (util.BN.isBN(value)) {
    return value
  } else {
    return new util.BN(value as number, 16)
  }
}

/** A reviver function to be sent to JSON.parse to handle buffer serialization and deserialization
 * @param {} k
 * @param {} v
 * @returns {} - deserialized value
 * @memberof message
 */
export function JSON_REVIVER_FUNC (k: object, v: any) {
  if (
    v !== null &&
    typeof v === 'object' &&
    'type' in v &&
    v.type === 'Buffer' &&
    'data' in v &&
    Array.isArray(v.data)) {
    return util.toBuffer(v.data)
  }
  return v
}

/** Serialize message object
 * @param {SignedMessage} msg - message.SignedMessage base class type
 * @returns {string} - serialized value
 * @memberof message
 */
export function SERIALIZE (msg: SignedMessage) {
  return JSON.stringify(msg)
}

/** Deserialize message object
 * @param {string} data - serialized value
 * @return{SignedMessage} - message type
 * @memberof message
 */
export function DESERIALIZE (data: string) {
  return JSON.parse(data, JSON_REVIVER_FUNC) as SignedMessage
}

/** Deserialize a received message and create the appropriate object type based on classType property
 * @param {string} data - serialized value
 * @returns {SignedMessage} - message type
 * @memberof message
 */
export function DESERIALIZE_AND_DECODE_MESSAGE (data: string) {
  const jsonObj = DESERIALIZE(data)
  if (jsonObj.hasOwnProperty('classType')) {
    switch (jsonObj.classType) {
      case 'SignedMessage':
        return new SignedMessage(jsonObj)
      case 'Proof':
        return new Proof(jsonObj)
      case 'ProofMessage':
        return new ProofMessage(jsonObj)
      case 'Lock':
        return new Lock(jsonObj as any) // FIXME
      case 'OpenLock':
        return new OpenLock(jsonObj)
      case 'DirectTransfer':
        return new DirectTransfer(jsonObj as any) // FIXME
      case 'LockedTransfer':
        return new LockedTransfer(jsonObj)
      case 'MediatedTransfer':
        return new MediatedTransfer(jsonObj)
      case 'RequestSecret':
        return new RequestSecret(jsonObj)
      case 'RevealSecret':
        return new RevealSecret(jsonObj)
      case 'SecretToProof':
        return new SecretToProof(jsonObj)
      case 'Ack':
        return new Ack(jsonObj)
      default:
        throw new Error('Invalid Message: unknown classType')
    }
  }
  throw new Error('Invalid Message: not a recoginized GOT message type')
}

/**
 * Signature Type defintion from ethereumjs
 * @typedef {Object} Signature
 * @property {Buffer} r
 * @property {Buffer} s
 * @property {int} v
 */
export interface Signature {
  r: Buffer, s: Buffer, v: number
}

/** @class Signed message base class that generates a keccak256 hash and signs using ECDSA
 * @property {string} classType - base class type used for reflection
 * @property {Signature} signature - the signature for this message
 * @memberof message
 */
export class SignedMessage {
  classType: string
  signature: Signature
  /** @constructor
   * @param {object} options
   * @param {Signature} [options.signature] - sets the signature of the message, useful during deserilaization of SignedMessage
   */
  constructor (options) {
    this.classType = this.constructor.name
    this.signature = options.signature || null
  }
  /** getHash - child classes must override implementation
   */
  getHash () {
    throw Error('unimplemented getHash()')
  }

  /** sign - signs the message with the private key and sets the signature property
   * @param {Buffer} privateKey
   */
  sign (privateKey: Buffer) {
    // Geth and thus web3 prepends the string \x19Ethereum Signed Message:\n<length of message>
    // to all data before signing it (https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign).
    // If you want to verify such a signature from Solidity from web3/geth, you'll have to prepend
    // the same string in solidity before doing the ecrecovery.
    const buffer = this.getHash()
    // console.log('SIGNING buffer:' + buffer.toString('hex'))
    this.signature = util.ecsign(buffer as any, privateKey)
  }

  /** _recoverAddress - recovers the ethereum address form the signature and message hash
   * @returns {Buffer} - 20 byte Buffer representing the ethereum address
   */
  _recoverAddress () {
    const buffer = this.getHash()
    const pk = util.ecrecover(buffer as any, this.signature.v, util.toBuffer(this.signature.r), util.toBuffer(this.signature.s))
    const address = util.pubToAddress(pk)
    return address
  }

  /** @property {Buffer} from - the calculate from based on the message hash and signature
   * @throws "no signature to recover address from"
   */
  get from () {
    if (!this.signature) {
      // FIXME - getter should not throw
      throw new Error('no signature to recover address from')
    }
    return this._recoverAddress()
  }
  /** isSigned
   * @returns {bool}
   */
  isSigned () {
    return this.signature !== null
  }
}

/** @class Encapsulates a snapshot instance of a message and represents a proof that can be submitted to the blockchain during settlement
 * @extends SignedMessage
 * @property {BN} nonce
 * @property {BN} transferredAmount
 * @property {Buffer} locksRoot
 * @property {Buffer} channelAddress
 * @property {Buffer} messageHash
 * @property {Signature} signature
 * @memberof message
 */
export class Proof extends SignedMessage {
  nonce: EthNonce
  transferredAmount: BN
  locksRoot: Buffer
  channelAddress: Buffer
  messageHash: Buffer

  constructor (options) {
    super(options)
    this.nonce = TO_BN(options.nonce) || new util.BN(0)
    this.transferredAmount = TO_BN(options.transferredAmount) || new util.BN(0)
    this.locksRoot = options.locksRoot || EMPTY_32BYTE_BUFFER
    this.channelAddress = options.channelAddress || EMPTY_20BYTE_BUFFER
    this.messageHash = options.messageHash || EMPTY_32BYTE_BUFFER
    this.signature = options.signature || null
  }

  getHash () {
    const solidityHash = abi.soliditySHA3(
      ['uint256', 'uint256', 'address', 'bytes32', 'bytes32'],
      [
        this.nonce,
        this.transferredAmount,
        this.channelAddress,
        this.locksRoot,
        this.messageHash
      ]
    )
    return solidityHash
  }
}

export interface ProofMessageOptions {
  nonce: EthNonce
  transferredAmount: BN
  locksRoot: Buffer
  channelAddress: Buffer
  messageHash: Buffer
  signature: Signature
}

/** @class
 * @extends SignedMessage
 * @property {BN} nonce
 * @property {BN} transferredAmount
 * @property {Buffer} locksRoot
 * @property {Buffer} channelAddress
 * @property {Buffer} messageHash
 * @property {Signature} signature
 * @memberof message
 */
export class ProofMessage extends SignedMessage {
  nonce: EthNonce
  transferredAmount: BN
  locksRoot: Buffer
  channelAddress: Buffer
  messageHash: Buffer

  constructor (options: Partial<ProofMessageOptions>) {
    super(options)

    this.nonce = TO_BN(options.nonce) || new util.BN(0)
    this.transferredAmount = TO_BN(options.transferredAmount) || new util.BN(0)
    this.locksRoot = options.locksRoot || EMPTY_32BYTE_BUFFER
    this.channelAddress = options.channelAddress || EMPTY_20BYTE_BUFFER
    this.messageHash = options.messageHash || EMPTY_32BYTE_BUFFER;
    (this as any).signature = options.signature || null // fixme
  }

  getHash () {
    const solidityHash = abi.soliditySHA3(
      ['uint256', 'uint256', 'address', 'bytes32', 'bytes32'],
      [
        this.nonce,
        this.transferredAmount,
        this.channelAddress,
        this.locksRoot,
        this.getMessageHash()
      ])
    return solidityHash
  }

  getMessageHash () {
    throw new Error('unimplemented getMessageHash')
  }

  toProof () {
    return new Proof({
      nonce: this.nonce,
      transferredAmount: this.transferredAmount,
      locksRoot: this.locksRoot,
      channelAddress: this.channelAddress,
      messageHash: this.getMessageHash(),
      signature: this.signature
    })
  }
}

export interface LockOptions {
  amount: number | BN
  expiration: number | EthBlockNumber
  hashLock: Buffer
}

/** @class A hashed lock that prevents transfers from being completed until secret is provided
 * @extends Hashable
 * @property {BN} amount - the amount of money that will be transferred if the secret is revealed
 * @property {BN} expiration - the absolute blockNumber where this lock is no longer valid and cannot be redeemed
 * @property {Buffer} hashLock - the keccak256 32 byte hash of the secret
 * @memberof message
 */
export class Lock extends Hashable {
  amount: BN
  expiration: EthBlockNumber
  hashLock: Buffer

  /** @constructor
   * @param {object} options
   * @param {(int|BN)} options.amount=0
   * @param {(int|BN)} options.expiration=0
   * @param {Buffer} options.hashLock=EMPTY_32BYTE_BUFFER
   */
  constructor (options: Partial<LockOptions>) {
    super()

    this.amount = TO_BN(options.amount) || new util.BN(0)
    this.expiration = TO_BN(options.expiration) || new util.BN(0)
    this.hashLock = options.hashLock || EMPTY_32BYTE_BUFFER
  }

  getMessageHash () {
    const hash = abi.soliditySHA3(['uint256', 'uint256', 'bytes32'], [
      this.amount, this.expiration, this.hashLock])
    return hash
  }

  /** encode - solidity pack the properties into a serilazed lock object that can be unpacked or hashed by EVM
   * @returns {Buffer} - 96 Byte Buffer encoding amount,expiration,hashLock
   */
  encode () {
    const value = abi.solidityPack(['uint256', 'uint256', 'bytes32'], [
      this.amount, this.expiration, this.hashLock])
    return value
  }
}

/** @class A hashed lock that prevents transfers from being completed until secret is provided
 * @extends Lock
 * @property {Buffer} secret - the 32 byte secret
 * @memberof message
 */
export class OpenLock extends Lock {
  secret: Buffer
  constructor (lock, secret?) {
    super(lock)
    this.secret = secret
  }

  encode () {
    let value = abi.solidityPack(['uint256', 'uint256', 'bytes32', 'bytes32'], [
      this.amount, this.expiration, this.hashLock, this.secret])
    return value
  }
}

export interface DirectTransferOptions extends Partial<ProofMessageOptions> {
  msgID: BN
  to: Buffer
}

/** @class A direct transfer that can be sent to an engine instance to immediately complete a transfer of funds.
 * Once a direct transfer is sent, the actor sending the message can consider the funds transferred (Given a reliable transport)
 * @extends ProofMessage
 * @property {BN} msgID - incrementing msgID for transport management
 * @property {Buffer} to - Ethereum Address of intended recipient
 * @memberof message
 */
export class DirectTransfer extends ProofMessage {
  msgID: BN
  to: Buffer

  constructor (options: DirectTransferOptions) {
    super(options)

    this.msgID = TO_BN(options.msgID) || new util.BN(0)
    this.to = options.to || EMPTY_20BYTE_BUFFER
  }

  getMessageHash () {
    const solidityHash = abi.soliditySHA3(
      ['uint256', 'uint256', 'uint256', 'address', 'bytes32', 'address'],
      [
        this.msgID,
        this.nonce,
        this.transferredAmount,
        this.channelAddress,
        this.locksRoot,
        this.to
      ])
    return solidityHash
  }
}

/** @class A locked transfer that can be sent to an engine instance to begin lock process transfer.
 * Locked transfers complete asynchronously, as such, there maybe many in-flight and outstanding lock messages.
 * @extends DirectTransfer
 * @property {Lock} lock
 * @memberof message
 */
export class LockedTransfer extends DirectTransfer {
  lock!: Lock // FIXME - remove !

  constructor (options) { // todo: add ts definition and in all other places
    super(options)
    if (!options.lock) {
      options.lock = new Lock({}) // fixme: make params immutable
    }
    if (options.lock instanceof Lock) {
      this.lock = options.lock
    } else if (options.lock instanceof Object) {
      this.lock = new Lock(options.lock)
    }
  }

  getMessageHash () {
    let solidityHash = abi.soliditySHA3(
      ['uint256', 'uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes32'],
      [
        this.msgID,
        this.nonce,
        this.transferredAmount,
        this.channelAddress,
        this.locksRoot,
        this.to,
        this.lock.getMessageHash()
      ]
    )
    return solidityHash
  }
}

/** @class similar to a locked transfer however, this message has a target and to field.
 * This message type is the foundation for mediated transfers.
 * @extends LockedTransfer
 * @property {Buffer} initiator - Ethereum address of initiating party
 * @property {Buffer} target - Ethereum address of mediating target
 * @memberof message
 */
export class MediatedTransfer extends LockedTransfer {
  initiator: Buffer
  target: Buffer

  constructor (options) {
    super(options)
    this.target = options.target || EMPTY_20BYTE_BUFFER // EthAddress
    this.initiator = options.initiator || EMPTY_20BYTE_BUFFER// EthAddress
  }

  getMessageHash () {
    let solidityHash = abi.soliditySHA3(
      ['uint256', 'uint256', 'uint256', 'address', 'bytes32', 'address', 'address', 'address', 'bytes32'],
      [
        this.msgID,
        this.nonce,
        this.transferredAmount,
        this.channelAddress,
        this.locksRoot,
        this.to,
        this.target,
        this.initiator,
        this.lock.getMessageHash()
      ]
    )
    return solidityHash
  }
}

/** @class used during the lifecyle of unlocking a locked message
 * @property {BN} msgID
 * @property {Buffer} to - Ethereum Address
 * @property {Buffer} hashLock - the hash to which you are requesting the secret
 * @property {BN} amount - the amount the secret unlocks
 * @memberof message
 * @extends SignedMessage
 */
export class RequestSecret extends SignedMessage {
  msgID: BN
  to: Buffer
  hashLock: Buffer
  amount: BN

  constructor (options) {
    super(options)
    this.msgID = TO_BN(options.msgID) || new util.BN(0) // fixme: using zero does not feel rigth; fix here and everywhere else
    this.to = options.to || EMPTY_20BYTE_BUFFER
    this.hashLock = options.hashLock || EMPTY_32BYTE_BUFFER // Serializable Lock Object
    this.amount = TO_BN(options.amount) || new util.BN(0)
  }

  getHash () {
    // we cannot include the expiration as this value is modified by hops at times
    return abi.soliditySHA3(
      ['uint256', 'address', 'bytes32', 'uint256'],
      [this.msgID, this.to, this.hashLock, this.amount]
    )
  }
}

/** @class RevealSecret - in response to a RequestSecret
 * @extends SignedMessage
 * @property {BN} msgID
 * @property {Buffer} to - Ethereum Address
 * @property {Buffer} secret - the hash secret
 * @memberof message
 */
export class RevealSecret extends SignedMessage {
  msgID: BN
  secret: Buffer
  to: EthAddress

  constructor (options) {
    super(options)
    this.msgID = TO_BN(options.msgID) || new util.BN(0)
    this.secret = options.secret || EMPTY_32BYTE_BUFFER
    this.to = options.to || EMPTY_20BYTE_BUFFER
  }

  getHash () {
    let solidityHash = abi.soliditySHA3(
      ['bytes32', 'address'],
      [this.secret, this.to])
    return solidityHash
  }

  get hashLock () {
    return util.sha3(this.secret)
  }
}

/** @class Once a secret is known, if we want to keep the payment channel alive longer
 * convert any openLocks into transferredAmounts. This message facilitates that and allows state channels to
 * have indefinite lifetime.  Without this message type, channels would require on-chain withdrawal at the min(openLock.expiration) time.
 * This message effectively sets proof.transferredAmount += lock.amount and removes the lock from the merkle tree so it cannot be double spent
 * @extends ProofMessage
 * @property {BN} msgID
 * @property {Buffer} to - Ethereum Address
 * @property {Buffer} secret - the lock secret whos amount will be added to the transferredAmount of this messages proof
 * @memberof message
 */
export class SecretToProof extends ProofMessage {
  msgID: BN
  to: Buffer
  secret: Buffer

  constructor (options) {
    super(options)
    this.msgID = TO_BN(options.msgID) || new util.BN(0)
    this.to = options.to || EMPTY_20BYTE_BUFFER
    this.secret = options.secret || EMPTY_32BYTE_BUFFER
  }

  getMessageHash () {
    let solidityHash = abi.soliditySHA3(
      ['uint256', 'uint256', 'uint256', 'address', 'bytes32', 'address', 'bytes32'],
      [
        this.msgID,
        this.nonce,
        this.transferredAmount,
        this.channelAddress,
        this.locksRoot, // locksRoot - sha3(secret)
        this.to,
        this.secret
      ]
    )
    return solidityHash
  }

  get hashLock () {
    return util.sha3(this.secret)
  }
}

/** @class An Ack message that identifies a particular msgID has been delivered.
 * @property {BN} msgID
 * @property {Buffer} to - Ethereum Address
 * @property {Buffer} messageHash - the messageHash of the acked message
 * @memberof message
 */
export class Ack {
  to: Buffer
  messageHash: Buffer
  msgID: BN

  constructor (options) {
    this.to = options.to || EMPTY_20BYTE_BUFFER
    this.messageHash = options.messageHash || EMPTY_32BYTE_BUFFER
    this.msgID = options.msgID || new util.BN(0)
  }
}

/** Entropy collector for SJCL when generating random secrets.  Currently, this is broken on mobile platforms and seeding should be done manually.
 * Refer to: https://github.com/bitwiseshiftleft/sjcl/wiki/Symmetric-Crypto#seeding-the-generator
 * @memberof message
 */
export function StartEntropyCollector () {
  sjcl.random.startCollectors()
}

/**
 * Secret Hash Pair
 * @typedef {Object} SecretHashPair
 * @property {Buffer} secret - a cryptographically secure 32 Byte hash if the entropy of sjcl.random is completed appropriately
 * @property {Buffer} hash - keccak256 hash of secret
 */

/** Generate random secret and corresponding keccak256 hash
 * @returns {SecretHashPair}
 * @memberof message
 */
export function GenerateRandomSecretHashPair () {
  let randomBuffer = sjcl.random.randomWords(256 / (4 * 8))
  let secret = util.addHexPrefix(sjcl.codec.hex.fromBits(randomBuffer))
  let hash = util.sha3(secret)
  return { 'secret': secret, 'hash': hash }
}
