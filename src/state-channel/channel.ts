/** @namespace channel */

import * as util from 'ethereumjs-util'
import * as message from './message'
import { BN } from 'bn.js'
import { as, add } from '../utils'

import { EthBlockNumber, EthNonce } from '../types'

// Transfers apply state mutations to the channel object.  Once a transfer is verified
// we apply it to the Channel
/** @memberof channel */
export const CHANNEL_STATE_IS_OPENING = 'opening'
/** @memberof channel */
export const CHANNEL_STATE_IS_CLOSING = 'closing'
/** @memberof channel */
export const CHANNEL_STATE_IS_SETTLING = 'settling'
/** @memberof channel */
export const CHANNEL_STATE_CLOSED = 'closed'
/** @memberof channel */
export const CHANNEL_STATE_OPEN = 'opened'
/** @memberof channel */
export const CHANNEL_STATE_SETTLED = 'settled'

/** @memberof channel */
export const SETTLE_TIMEOUT = new BN(100)
// the minimum amount of time we need from the expiration of a lock to safely unlock
// this property should be negotiable by the users based on their level of conservantiveness
// in addition to expection of settled locks
/** @memberof channel */
export const REVEAL_TIMEOUT = new BN(15)

/** @class Channel represents the states between two participants.  State synchronization occurs against channel endpoints.
 * Channels rely on monotonically increasing simplex channels to track net value transfer flux. Rather then leveraging Poon-Dryja style
 * channels for value transfer with off-chain hashed time lock contracts, we prefer the Raiden Network style simplex channels.  The advantage of Raiden
 * style channels is the counterparties are not punished for providing invalid or out of date lock proofs to the block-chain. From a game theoretic
 * perspective, since the value is monotonically increasing, a rational actor will attempt to send the most up to date and relevant proof to the blockchain.
 * However; this is  only effective for monotonically increasing
 * value transfers.  For general state transfers where the value may vary wildly, we will subclass our LockedTransfer class towards Poon-Dryja implementation.
 * This scheme requires a deposit from both parties (i.e a COMMIT transaction) which is used as punishment for publishing invalidated hashLocks on the blockchain.
 * This is enforced simply as with every new state transfer, a new secret is generated and the old secret is revealed by the party creating the updates.
 * Much care must be given to the order of the operations and the counterparties actions in any of the implementations.  Our design decision relies
 * on mass consumer adoption; i.e. it is likely users will lose proof messages (lost phones, forgotten passwords, hardware failures), and they shouldn't
 * be further punished by the blockchain as they already have lost value due to a stale proof.
 * @see https://en.bitcoin.it/wiki/Payment_channels for further details of implementation strategies.
 * @property {ChannelState} peerState - peer endpoint state
 * @property {ChannelState} myState - my endpoint state
 * @property {Buffer} channelAddress - the Ethereum NettingChannel Contract Address for this channel
 * @property {BN} openedBlock - the block the channel was opened
 * @property {BN} closedBlock=null
 * @property {BN} settledBlock=null
 * @property {BN} issuedCloseBlock=null - the block the channel issuedCloseBlock, null if you never issue
 * @property {BN} issuedTransferUpdateBlock=null
 * @property {BN} issuedSettleBlock=null
 * @property {BN} updatedProofBlock=null - the block you sent your proof message to the on-chain netting channel, null if your partner never send you value transfers
 * @property {Object.<string,int>} withdrawnLocks - the state of the on-chain withdraw proof
 */
export class Channel {
  peerState: any
  myState: any
  channelAddress: Buffer
  openedBlock: EthBlockNumber

  issuedCloseBlock: EthBlockNumber | null = null
  issuedTransferUpdateBlock: EthBlockNumber | null = null
  issuedSettleBlock: EthBlockNumber | null = null
  closedBlock: EthBlockNumber | null = null
  settledBlock: EthBlockNumber | null = null
  updatedProofBlock: EthBlockNumber | null = null
  withdrawnLocks: any = {}

  /**
   * @constructor
   * @param {ChannelState} peerState - The initialized ChannelState object representing a peer.
   * @param {ChannelState} myState - The initialized ChannelState object representing my state.
   * @param {Buffer} channelAddress - The on chain netting channel ethereum contract address.
   * @param {BN} currentBlock - The current block number on ethereum.
   */
  constructor (peerState, myState, channelAddress: Buffer, currentBlock: EthBlockNumber) {
    this.peerState = peerState // channelState.ChannelStateSync
    this.myState = myState// channelState.ChannelStateSync
    this.channelAddress = channelAddress || message.EMPTY_20BYTE_BUFFER
    this.openedBlock = message.TO_BN(currentBlock)
  }

  /**
   * The amount of funds that can be sent from -> to in the payment channel at a particular block.
   * The block is important as locks expire those funds are made available again
   * @param {ChannelState} from
   * @param {ChannelState} to
   * @param {BN} currentBlock - The current block number
   * @returns {BN}
   */
  transferrableFromTo (from, to, currentBlock?: EthBlockNumber) {
    let safeBlock: EthBlockNumber | null = null
    if (currentBlock) {
      safeBlock = add(currentBlock, as.BlockNumber(REVEAL_TIMEOUT))
    }
    return from.depositBalance
      .sub((from.transferredAmount.add(from.lockedAmount(safeBlock)).add(from.unlockedAmount())))
      .add(to.transferredAmount.add(to.unlockedAmount()))
  }

  /** determine which absolute block number the settlement period ends
   * @param {BN} currentBlock
   * @returns {BN}
   */
  getChannelExpirationBlock (currentBlock: EthBlockNumber) {
    if (this.closedBlock) {
      return this.closedBlock.add(SETTLE_TIMEOUT)
    } else {
      return currentBlock.add(SETTLE_TIMEOUT)
    }
  }

  /** @property {string} - return the current channel state */
  get state () {
    if (this.settledBlock) {
      return CHANNEL_STATE_SETTLED
    } else if (this.issuedSettleBlock) {
      return CHANNEL_STATE_IS_SETTLING
    } else if (this.closedBlock) {
      return CHANNEL_STATE_CLOSED
    } else if (this.issuedCloseBlock) {
      return CHANNEL_STATE_IS_CLOSING
    } else {
      return CHANNEL_STATE_OPEN
    }
  }

  /** @returns {bool} returns true iff the channel is open */
  isOpen () {
    return this.state === CHANNEL_STATE_OPEN
  }

  /** @param {message.RevealSecret} revealSecret
   * @returns {bool} - true if applied
   * @throws "Invalid Message: Expected RevealSecret"
   * @throws "Invalid Secret: Unknown secret revealed"
   */
  handleRevealSecret (revealSecret: message.RequestSecret) {
    if (!(revealSecret instanceof message.RevealSecret)) {
      throw new Error('Invalid Message: Expected RevealSecret')
    }
    // TODO: we dont care where it comes from?
    // var from = null;
    // if(this.myState.address.compare(revealSecret.from)===0){
    //   from = this.myState;
    // }else if(this.peerState.address.compare(revealSecret.from)===0)
    // {
    //   from = this.peerState;
    // }
    // if(!from){throw new Error("Invalid RevealSecret: Unknown secret sent")};
    let myLock = this.myState.getLockFromSecret(revealSecret.secret)
    let peerLock = this.peerState.getLockFromSecret(revealSecret.secret)
    if (!myLock && !peerLock) {
      throw new Error('Invalid Secret: Unknown secret revealed')
    }
    if (myLock) {
      this.myState.applyRevealSecret(revealSecret)
    }

    if (peerLock) {
      this.peerState.applyRevealSecret(revealSecret)
    }
    return true
  }

  /** @param {(message.DirectTransfer|message.LockedTransfer)} transfer
   * @param {BN} currentBlock
   * @throws "Invalid transfer: cannot update a closing channel"
   * @throws "Invalid Transfer: unknown from"
   */
  handleTransfer (transfer: message.DirectTransfer | message.LockedTransfer, currentBlock: EthBlockNumber) {
    // check the direction of data flow
    if (!this.isOpen()) {
      throw new Error('Invalid transfer: cannot update a closing channel')
    }
    if (this.myState.address.compare(transfer.from) === 0) {
      this.handleTransferFromTo(this.myState, this.peerState, transfer, currentBlock)
    } else if (this.peerState.address.compare(transfer.from) === 0) {
      this.handleTransferFromTo(this.peerState, this.myState, transfer, currentBlock)
    } else {
      throw new Error('Invalid Transfer: unknown from')
    }
  }

  /** process a transfer in the direction of from > to channelState
   * @param {ChannelState} from - transfer originator
   * @param {ChannelState} to - transfer recipient
   * @param {(message.DirectTransfer|message.LockedTransfer)} transfer
   * @param {BN} currentBlock
   * @throws "Invalid Transfer Type"
   * @throws "Invalid Channel Address: channel address mismatch"
   * @throws "Invalid nonce: Nonce must be incremented by 1"
   * @throws "Invalid Lock: Lock registered previously"
   * @throws "Invalid LocksRoot for LockedTransfer"
   * @throws "Invalid Lock: Lock amount must be greater than 0"
   * @throws "Invalid SecretToProof: unknown secret"
   * @throws "Invalid LocksRoot for SecretToProof:..."
   * @throws "Invalid transferredAmount: must be monotonically increasing value"
   * @throws "Invalid transferredAmount: SecretToProof does not provide expected lock amount"
   * @throws "Invalid transferredAmount: Insufficient Balance:..."
   * @returns {bool} - true if transfer applied to channelState
   */
  handleTransferFromTo (from, to, transfer: message.DirectTransfer | message.LockedTransfer, currentBlock: EthBlockNumber) {
    if (!(transfer instanceof message.ProofMessage)) {
      throw new Error('Invalid Transfer Type')
    }

    let proof = transfer.toProof()
    if (proof.channelAddress.compare(this.channelAddress) !== 0) {
      throw new Error('Invalid Channel Address: channel address mismatch')
    }

    if (!proof.nonce.eq(from.nonce.add(new BN(1)))) {
      throw new Error('Invalid nonce: Nonce must be incremented by 1')
    }

    // Validate LocksRoot

    if (transfer instanceof message.LockedTransfer) {
      let lock = transfer.lock
      if (from.containsLock(lock)) {
        throw new Error('Invalid Lock: Lock registered previously')
      }
      let mtValidate = from._computeMerkleTreeWithHashlock(lock)
      if (mtValidate.getRoot().compare(proof.locksRoot) !== 0) {
        throw new Error('Invalid LocksRoot for LockedTransfer')
      }
      // validate lock as well
      if (lock.amount.lte(new BN(0))) {
        throw new Error('Invalid Lock: Lock amount must be greater than 0')
      }

      // unfortunately we must handle all lock requests because then the state roots will
      // be unsynched.  What we can do instead is if the lock is outside our comfort zone
      // we simply dont make a RequestSecret to the initiator.  if we are in a mediated transfer
      // dont forward message, but alteast the locksRoots are synced

      // var expirationBlock = this.getChannelExpirationBlock(currentBlock);
      // //=  currentBlock.add(revealTimeout)<= expirationBlock <= currentBlock.add(SETTLE_TIMEOUT)
      // if(lock.expiration.lt(currentBlock.add(REVEAL_TIMEOUT)) || lock.expiration.gt(expirationBlock)){
      //   throw new Error("Invalid Lock Expiration: currentBlock+ this.REVEAL_TIMEOUT < Lock expiration < this.SETTLE_TIMEOUT ");
      // }
    } else if (transfer instanceof message.SecretToProof) {
      // TODO: dont try to retreive the lock, just calculate the hash and send in
      // we do this twice thats why
      // If we have a secretToProof for an expired lock, we dont care, as long as
      // the lock exists we can take on the secretToProof
      const lock = from.getLockFromSecret(transfer.secret)
      if (!lock) {
        throw new Error('Invalid SecretToProof: unknown secret')
      }
      const mtValidate = from._computeMerkleTreeWithoutHashlock(lock)
      if (mtValidate.getRoot().compare(proof.locksRoot) !== 0) {
        throw new Error('Invalid LocksRoot for SecretToProof:' + mtValidate.getRoot().toString('hex') + '!=' + proof.locksRoot.toString('hex'))
      }
    } else if (from.merkleTree.getRoot().compare(proof.locksRoot) !== 0) {
      throw new Error('Invalid LocksRoot for Transfer')
    }

    // validate transferredAmount
    if (proof.transferredAmount.lt(from.transferredAmount)) {
      throw new Error('Invalid transferredAmount: must be monotonically increasing value')
    }

    let transferrable = this.transferrableFromTo(from, to, currentBlock)
    if (transfer instanceof message.SecretToProof) {
      const lock = from.getLockFromSecret(transfer.secret)// returns null if lock is not present
      if (!lock || (proof.transferredAmount.lt(from.transferredAmount.add(lock.amount)))) {
        throw new Error('Invalid transferredAmount: SecretToProof does not provide expected lock amount')
      }
      // because we are removing the lock and adding it to transferred amount, we have access to the remaining funds
      // IMPORTANT CHECK, or else if we sent a lock transfer greater then our remaining balance, we could never unlock with a secret proof
      transferrable = transferrable.add(lock.amount)
    }
    // fix
    // if the sent delta between messages is greater than the total transferrable amount (i.e. net value flux)
    if (proof.transferredAmount.sub(from.transferredAmount).gt(transferrable)) {
      throw new Error('Invalid transferredAmount: Insufficient Balance:' + proof.transferredAmount.toString() + ' > ' + transferrable.toString())
    }

    if (transfer instanceof message.LockedTransfer) {
      from.applyLockedTransfer(transfer)
    } else if (transfer instanceof message.DirectTransfer) {
      from.applyDirectTransfer(transfer)
    } if (transfer instanceof message.SecretToProof) {
      from.applySecretToProof(transfer)
    }
    // validate all the values of a transfer prior to applying it to the StateSync

    return true
  }

  /** @returns {BN} incremented nonce */
  incrementedNonce () {
    return this.myState.nonce.add(new BN(1)) as EthNonce
  }

  /** create a locked transfer from myState for peerState
   * @param {BN} msgID
   * @param {Buffer} hashLock - the keccak256 hash of the secret
   * @param {BN} amount
   * @param {BN} expirationBlock
   * @param {BN} currentBlock
   * @returns message.LockedTransfer
   * @throws "Insufficient funds: lock amount must be less than or equal to transferrable amount"
   */
  createLockedTransfer (msgID: BN, hashLock: Buffer, amount: BN, expirationBlock: EthBlockNumber, currentBlock: EthBlockNumber) {
    let transferrable = this.transferrableFromTo(this.myState, this.peerState, currentBlock)
    if (amount.lte(new BN(0)) || transferrable.lt(amount)) {
      throw new Error('Insufficient funds: lock amount must be less than or equal to transferrable amount')
    }

    let lock = new message.Lock({ amount: amount, expiration: expirationBlock, hashLock: hashLock })

    return new message.LockedTransfer({
      msgID: msgID,
      nonce: this.incrementedNonce(),
      channelAddress: this.channelAddress,
      transferredAmount: this.myState.transferredAmount,
      to: this.peerState.address,
      locksRoot: this.myState._computeMerkleTreeWithHashlock(lock).getRoot(),
      lock: lock
    })
  }

  /** create a direct transfer from myState to peerState
   * @param {BN} msgID
   * @param {BN} amount
   * @returns message.DirectTransfer
   * @throws "Insufficient funds: direct transfer cannot be completed:..."
   */
  createDirectTransfer (msgID: BN, transferredAmount: BN) {
    let transferrable = this.transferrableFromTo(this.myState, this.peerState)

    if (transferredAmount.lte(new BN(0)) ||
      transferredAmount.lte(this.myState.transferredAmount) ||
      transferredAmount.gt(transferrable)) {
      throw new Error('Insufficient funds: direct transfer cannot be completed:' +
        transferredAmount.toString() + ' - ' + this.myState.transferredAmount.toString() + ' > ' +
        transferrable.toString(10))
    }

    return new message.DirectTransfer({
      msgID: msgID,
      nonce: this.incrementedNonce(),
      channelAddress: this.channelAddress,
      transferredAmount: transferredAmount,
      to: this.peerState.address,
      locksRoot: this.myState.merkleTree.getRoot()
    })
  }
  /** create a mediated transfer from myState to target using the peerState as a mediator and is set as the to address.
   * This holds if there exists a route in the
   * state channel network between myState and target through the peer
   * @param {BN} msgID
   * @param {Buffer} hashLock - the keccak256 hash of the secret
   * @param {BN} amount
   * @param {BN} expirationBlock
   * @param {Buffer} target - the intended recipient of the locked transfer.  This target node will make the RevealSecret request
   * direction to the initiator
   * @param {Buffer} initiator - myState ethereum address
   * @param {BN} currentBlock
   * @returns message.MediatedTransfer
   */
  createMediatedTransfer (msgID: BN, hashLock: Buffer, amount: BN, expiration: EthBlockNumber,
    target: Buffer, initiator: Buffer, currentBlock: EthBlockNumber) {
    let lockedTransfer = this.createLockedTransfer(msgID, hashLock, amount, expiration, currentBlock)
    let mediatedTransfer = new message.MediatedTransfer(
      Object.assign(
        {
          target: target,
          initiator: initiator
        }, lockedTransfer))
    return mediatedTransfer
  }

  /** Move an openLocks amount to the transferredAmount and remove from merkletree, this can increase channel longevity
   *  as openLocks will require on-chain withdrawals without this mechanism.
   * @param {BN} msgID
   * @param {Buffer} secret
   * @returns {message.SecretToProof}
   */
  createSecretToProof (msgID: BN, secret: Buffer) {
    let lock = this.myState.getLockFromSecret(secret)
    if (!lock) {
      console.log(Object.keys(this.myState.openLocks).map(function (l) {
        console.log('openLock:' + l)
      }))
      throw new Error('Invalid Secret: lock does not exist for secret:' + secret)
    }
    let mt = this.myState._computeMerkleTreeWithoutHashlock(lock)
    let transferredAmount = this.myState.transferredAmount.add(lock.amount)
    return new message.SecretToProof({
      msgID: msgID,
      nonce: this.incrementedNonce(),
      channelAddress: this.channelAddress,
      transferredAmount: transferredAmount,
      to: this.peerState.address,
      locksRoot: mt.getRoot(),
      secret: secret
    })
  }

  // todo: check if @returns is proper JSDoc
  /** handle a block update
   * @param {BN} currentBlock
   * @returns {[string,Buffer][]} - GOT.* events to be processed
   * @see Engine.handleEvent
   */
  onBlock (currentBlock: EthBlockNumber) {
    // we use to auto issue settle but now we leave it to the user.
    let events: [string,Buffer][] = []
    if (this.canIssueSettle(currentBlock)) {
      events.push(['GOT.issueSettle', this.channelAddress])
    }
    return events
    // var earliestLockExpiration = this.peerState.minOpenLockExpiration;
    // if(earliestLockExpiration.sub(revealTimeout).gte(currentBlock)){
    //   this.handleClose(this.myState.address,currentBlock);
    //   return false;//We have to close this channel
    // }
  }

  /** @param {BN} currentBlock
   * @returns {bool}
   */
  canIssueSettle (currentBlock: EthBlockNumber) {
    return !!(this.closedBlock &&
      currentBlock.gt(this.closedBlock.add(SETTLE_TIMEOUT)))
  }

  issueSettle (currentBlock: EthBlockNumber) {
    if (this.canIssueSettle(currentBlock)) {
      this.issuedSettleBlock = currentBlock
    }
    return this.issuedSettleBlock
  }

  issueClose (currentBlock: EthBlockNumber) {
    if (!this.issuedCloseBlock && !this.closedBlock) {
      this.issuedCloseBlock = currentBlock

      return this.peerState.proof.signature ? this.peerState.proof : null
    }
    throw new Error('Channel Error: In Closing State or Is Closed')
  }

  issueTransferUpdate (currentBlock: EthBlockNumber) {
    if (!this.issuedCloseBlock) {
      this.issuedTransferUpdateBlock = currentBlock
      return this.peerState.proof.signature ? this.peerState.proof : null
    }
  }

  issueWithdrawPeerOpenLocks (currentBlock: EthBlockNumber) {
    // TODO: Enable this with updated Test
    // if(!this.updatedProofBlock){
    //   throw new Error("Channel Error: Cannot withdraw lock without updating proof to blockchain");
    // }
    let openLockProofs = this._withdrawPeerOpenLocks()
    for (let i = 0; i < openLockProofs.length; i++) {
      // @ts-ignore FIXME
      let openLock = openLockProofs[i].openLock
      let hashKey = util.addHexPrefix(openLock.hashLock.toString('hex'))
      this.withdrawnLocks[hashKey] = currentBlock
    }

    return openLockProofs
  }

  /** Internal
   * @returns {channel.OpenLock}
   */
  _withdrawPeerOpenLocks () {
    // withdraw all open locks
    let self = this
    let lockProofs = Object.values(this.peerState.openLocks).map(function (lock) {
      try {
        return new OpenLockProof({ 'openLock': lock, 'merkleProof': self.peerState.generateLockProof(lock) })
      } catch (err) {
        // todo: this is a very critical - you still should be able to unlock rest of the lock
        console.log(err)
      }
    })
    return lockProofs
  }

  onChannelNewBalance (address: Buffer, balance: BN) {
    if (this.myState.address.compare(address) === 0) {
      this._handleDepositFrom(this.myState, balance)
    } else if (this.peerState.address.compare(address) === 0) {
      this._handleDepositFrom(this.peerState, balance)
    }
  }

  _handleDepositFrom (from, depositAmount) {
    // deposit amount must be monotonically increasing
    if (from.depositBalance.lt(depositAmount)) {
      from.depositBalance = depositAmount
    } else {
      throw new Error('Invalid Deposit Amount: deposit must be monotonically increasing')
    }
  }

  onChannelClose (closingAddress: Buffer, block: EthBlockNumber) {
    if (!this.closedBlock) {
      this.closedBlock = block
      if (this.issuedCloseBlock) {
        this.updatedProofBlock = block
      }
      return true
    } else {
      throw new Error('Channel Error: Channel Already Closed')
    }
  }

  onChannelCloseError () {
    if (!this.closedBlock) {
      this.issuedCloseBlock = null
    }
  }

  onTransferUpdated (nodeAddress, block) {
    if (!this.updatedProofBlock) {
      this.updatedProofBlock = block
    }
  }

  onTransferUpdatedError () {
    if (!this.updatedProofBlock) {
      this.issuedTransferUpdateBlock = null
      this.updatedProofBlock = null
    }
  }

  onChannelSettled (block) {
    if (!this.settledBlock) {
      this.settledBlock = block
    }
  }

  onChannelSettledError () {
    if (!this.settledBlock) {
      this.settledBlock = null
      this.issuedSettleBlock = null
    }
  }

  onChannelSecretRevealed (secret: Buffer, receiverAddress: Buffer, block: EthBlockNumber) {
    let hashKey = util.addHexPrefix((util.sha3(secret)).toString('hex'))
    if (this.withdrawnLocks.hasOwnProperty(hashKey)) {
      this.withdrawnLocks[hashKey] = block
    }
  }

  onChannelSecretRevealedError (secret: Buffer) {
    let hashKey = util.addHexPrefix((util.sha3(secret)).toString('hex'))
    this.withdrawnLocks[hashKey] = null
  }

  onRefund (receiverAddress: Buffer, amount: BN) {
    throw new Error('NOT_IMPLEMENTED')
  }
}

/** @class encapsulate open lock proof for submission to blockchain
 * @memberof channel
 * @property {message.OpenLock} openLock
 * @property {Buffer[]} merkleProof
 */
export class OpenLockProof {
  openLock: any
  merkleProof: any

  constructor (options) {
    this.openLock = options.openLock
    this.merkleProof = options.merkleProof
  }

  encodeLock () {
    // we dont want the secret appended to this encoding
    return this.openLock.encode().slice(0, 96)
  }
}
