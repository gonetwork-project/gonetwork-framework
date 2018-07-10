import * as util from 'ethereumjs-util'
import * as events from 'events'
import { BN } from 'bn.js'

import * as messageLib from './message'
import * as channelLib from './channel'
import * as channelStateLib from './channel-state'
import * as stateMachineLib from './state-machine'

import { IBlockchainService } from '..'
import { BlockNumber, Address, PrivateKey } from 'eth-types'
import { BlockchainEvent } from '../types'

// helper method for debugging - will be removed once stabilized
const addToStr = <A extends Address | Address[]> (add: A): (A extends Address ? string : string[]) =>
  !Buffer.isBuffer(add) ? (add as Address[]).map((a) => a.toString('hex')) : (add as Address).toString('hex') as any

// todo: unify with BlockchainService -
// this actually is better than blockchain approach
// as we do not access private key - any way we should be consistent here
export type SignFn = (msg: { sign: (pk: PrivateKey) => void }) => void
export type SendFn = (to: Address, msg: messageLib.SignedMessage) => Promise<boolean>

export type Config = {
  address: Address
  sign: SignFn
  send: SendFn
  blockchain: IBlockchainService
  settleTimeout?: BlockNumber
  revealTimeout?: BlockNumber
}

/**
 * @class GoNetworks Engine encapsualtes off chain interactions between clients and propogation onto the blockchain.
 * The Engine is platform agnostic and adaptble to different blockchains by providing appropriate blockchainService adapters
 * Overriding the send callback also allows for custom transport layers and methods (not neccessarily IP network based)
 * @extends events.EventEmitter
 * @property {BN} msgID=0
 * @property {BN} currentBlock=0 - the current block which is synchronized to the onchain mined block value via blockchainService handler callbacks
 * @property {Buffer} publicKey - Future Use: ElGamal Elliptic Curve Asymmetric Encryption public key to be sent to channel partners
 * @property {InitiatorFactory} initiatorStateMachine=stateMachine.IntiatorFactory - creates a new state machine for mediated transfers you initiate
 * @property {TargetFactory} targeStateMachine=stateMachine.TargetFactory - creates a new state machine for mediated transfers that are intended for you
 * @property {object} messageState={} - tracks the state of mediated transfer messages using msgID as the key i.e. this.messageState[msgID] = stateMachine.*
 * @property {object} channelByPeer={} - channels by peers ethereum address as hex string no 0x prefix
 * @property {object} channels={} - channels by on-chain contract address hex string no 0x prefix
 * @property {object} pendingChannels={} - used to track newChannel requests initiated by the engine
 * @property {function} signatureService
 * @property {object} blockchain
 */
export class Engine extends events.EventEmitter {
  // dictionary of channels[peerAddress] that are pending mining
  readonly pendingChannels = {}
  readonly channels: { [k: string]: channelLib.Channel } = {}
  // dictionary of channels[peerState.address.toString('hex')];
  readonly channelByPeer: { [k: string]: channelLib.Channel } = {}
  // dictionary of messages[msgID] = statemachine.*
  readonly messageState = {}

  currentBlock = new util.BN(0) as BlockNumber
  msgID = new util.BN(0)

  publicKey = undefined // fixme
  initiatorStateMachine = stateMachineLib.InitiatorFactory()
  targetStateMachine = stateMachineLib.TargetFactory()

  readonly address: Address
  readonly signature: SignFn
  readonly blockchain: IBlockchainService
  readonly settleTimeout: BlockNumber
  readonly revealTimeout: BlockNumber

  private _send: SendFn

  /**
   * @constructror.
   * @param {Buffer} address - your ethereum address; ETH Address is merely the last 20 bytes of the keccak256 hash of the public key given the public private key pair.
   * @param {Function} signatureService - the callback that requests the privatekey for signing of messages.  This allows the user to store the private key in a secure store or other means
   * @param {BlockchainService} blockchainService - a class extending the BlockchainService class to monitor and propogate transactions on chain. Override for different Blockchains
   */
  constructor (readonly cfg: Config) {
    super()

    const { address, sign, send, blockchain } = cfg

    this.address = address
    this.signature = sign
    this.blockchain = blockchain
    this._send = send

    this.settleTimeout = cfg.settleTimeout || channelLib.SETTLE_TIMEOUT
    this.revealTimeout = cfg.revealTimeout || channelLib.REVEAL_TIMEOUT

    if (!this.settleTimeout.gt(this.revealTimeout)) {
      throw new Error('settleTimeout must be strictly and much larger then revealTimeout')
    }

    const self = this

    this.initiatorStateMachine.on('*', function (event, state) {
      self.handleEvent(event, state)
    })
    this.targetStateMachine.on('*', function (event, state) {
      self.handleEvent(event, state)
    })

  }

  dispose = () => {
    this.initiatorStateMachine.off()
    this.targetStateMachine.off()
  }

  onBlockchainEvent = (e: BlockchainEvent) => {
    console.warn(e._type)
    switch (e._type) {
      // netting-channel
      case 'ChannelClosed': return this.onChannelClose(e._contract, e.closing_address)
      case 'ChannelNewBalance': return this.onChannelNewBalance(e._contract, e.participant, e.balance)
      case 'ChannelSecretRevealed': return this.onChannelSecretRevealed(e._contract, e.secret, e.receiver_address)
      case 'ChannelSettled': return this.onChannelSettled(e._contract)
      case 'Refund': return this.onRefund(e._contract, e.receiver, e.amount)
      case 'TransferUpdated': return this.onTransferUpdated(e._contract, e.node_address)
      // token
      case 'Approval': return this.onApproval(e._owner, e._spender, e._value)
      case 'Transfer': return () => null // FIXME -- add handler
      // manager
      case 'ChannelDeleted': return () => null // FIXME -- add handler
      case 'ChannelNew': return this.onChannelNew(e.netting_channel, e.participant1, e.participant2, e.settle_timeout)
      case 'FeesCollected': return () => null // FIXME -- add handler
      case 'OwnershipTransferred': return () => null // FIXME -- add handler
      default:
        ((e: never) => { throw new Error('UNREACHABLE') })(e)
    }
  }

  /**
   * Handle an incoming message after it has been de-serialized
   * @param {message.SignedMessage} message
   * @returns {message.Ack}
   * @throws "Invalid Message: no signature found"
   * @throws "Invalid Message: unknown message received"
   */
  onMessage (message: messageLib.SignedMessage) {
    // console.log('RECEIVED MSG', message)
    // TODO: all messages must be signed here?
    if (!message.isSigned()) {
      throw new Error('Invalid Message: no signature found')
    }

    // todo: refactor to exhaustive switch
    if (message instanceof messageLib.RequestSecret) {
      this.onRequestSecret(message)
    } else if (message instanceof messageLib.RevealSecret) {
      this.onRevealSecret(message)
    } else if (message instanceof messageLib.MediatedTransfer) {
      this.onMediatedTransfer(message)
    } else if (message instanceof messageLib.DirectTransfer) {
      this.onDirectTransfer(message)
    } else if (message instanceof messageLib.SecretToProof) {
      this.onSecretToProof(message)
    } else {
      throw new Error('Invalid Message: unknown message received')
    }

    // FIXME - msgID seems to be not always there
    return new messageLib.Ack({ msgID: message.msgID, messageHash: message.getHash(), to: message.from })
  }

  onRequestSecret (requestSecret: messageLib.RequestSecret) {
    if (this.messageState.hasOwnProperty(requestSecret.msgID.toString())) {
      this.messageState[requestSecret.msgID.toString()].applyMessage('receiveRequestSecret', requestSecret)
    }
  }

  onRevealSecret (revealSecret: messageLib.RevealSecret) {
    // handle reveal secret for all channels that have a lock created by it
    // we dont care where it came from unless we want to progress our state machine
    let errors: any[] = []
    Object.values(this.channelByPeer).map(function (channel: any) {
      try {
        channel.handleRevealSecret(revealSecret)
      } catch (err) {
        errors.push(err)
      }
    })
    // update all state machines that are in awaitRevealSecret state
    Object.values(this.messageState).map(function (messageState: any) {
      try {
        // the state machines will take care of echoing RevealSecrets
        // to channel peerStates
        messageState.applyMessage('receiveRevealSecret', revealSecret)
      } catch (err) {
        errors.push(err)
      }
    })

    errors.map(function (error) {
      console.log(error)
    })
  }

  onSecretToProof (secretToProof: messageLib.SecretToProof) {
    // handle reveal secret for all channels that have a lock created by it.
    // this is in the case where for some reason we get a SecretToProof before
    // a reveal secret

    // encapsulate in message.RevealSecret type of message, we dont have to sign it
    // it is not required
    let tempRevealSecret = new messageLib.RevealSecret({ secret: secretToProof.secret })
    this.signature(tempRevealSecret)
    Object.values(this.channelByPeer).map(function (channel: any) {
      try {
        channel.handleRevealSecret(tempRevealSecret)
      } catch (err) {
        console.log(err)
      }
    })

    Object.values(this.messageState).map(function (messageState: any) {
      try {
        // the state machines will take care of echoing RevealSecrets
        // to channel peerStates
        messageState.applyMessage('receiveRevealSecret', tempRevealSecret)
      } catch (err) {
        console.log(err)
      }
    })

    if (!this.channelByPeer.hasOwnProperty(secretToProof.from.toString('hex'))) {
      throw new Error('Invalid SecretToProof: unknown sender')
    }

    let channel = this.channelByPeer[secretToProof.from.toString('hex')]
    // FIXME
    channel.handleTransfer(secretToProof as any, this.currentBlock)
    if (this.messageState.hasOwnProperty(secretToProof.msgID.toString())) {
      this.messageState[secretToProof.msgID.toString()].applyMessage('receiveSecretToProof', secretToProof)
    } else {
      // todo: improve error propagation
      // Something went wrong with the statemachine :(
    }
  }

  onDirectTransfer (directTransfer: messageLib.DirectTransfer) {
    const channel = this.channels[directTransfer.channelAddress.toString('hex')]

    if (!channel) {
      throw new Error('Invalid DirectTransfer: channel does not exist')
    }
    if (!channel.isOpen()) {
      throw new Error('Invalid Channel State:state channel is not open')
    }

    channel.handleTransfer(directTransfer, this.currentBlock)
  }

  onMediatedTransfer (mediatedTransfer: messageLib.MediatedTransfer) {
    // const [med, ch, to] = addToStr([mediatedTransfer.from, mediatedTransfer.channelAddress, mediatedTransfer.to])
    // debugger
    if (!this.channelByPeer.hasOwnProperty(mediatedTransfer.from.toString('hex'))) {
      throw new Error('Invalid MediatedTransfer: channel does not exist')
    }

    let channel = this.channelByPeer[mediatedTransfer.from.toString('hex')]
    if (!channel.isOpen()) {
      throw new Error('Invalid MediatedTransfer Received:state channel is not open')
    }
    // register the mediated transfer

    channel.handleTransfer(mediatedTransfer, this.currentBlock)
    if (mediatedTransfer.target.compare(this.address) === 0) {
      // console.log('Start targetStateMachine')
      this.messageState[mediatedTransfer.msgID.toString()] = new stateMachineLib.MessageState(mediatedTransfer, this.targetStateMachine)
      this.messageState[mediatedTransfer.msgID.toString()].applyMessage('init', this.currentBlock)
    }
  }

  /**
   * Send a locked transfer to your channel partner. This method intiatlizes a initator state machine which will queue the message for send via handleEvent
   * @param {Address} to - eth address who this message will be sent to.  Only differs from target if mediating a transfer
   * @param {Address} target - eth address of the target.
   * @param {BN} amount - amount to lock and send.
   * @param {BN} expiration - the absolute block number this locked transfer expires at.
   * @param {Buffer} secret - Bytes32 cryptographic secret
   * @param {Buffer} hashLock - Bytes32 keccak256(secret) value.
   * @throws "Invalid MediatedTransfer: channel does not exist"
   * @throws 'Invalid Channel State:state channel is not open'
   */
  sendMediatedTransfer (to: Address, target: Address, amount: BN, expiration: BlockNumber, secret: Buffer, hashLock: Buffer) {
    if (!this.channelByPeer.hasOwnProperty(to.toString('hex'))) {
      throw new Error('Invalid MediatedTransfer: channel does not exist')
    }
    let channel = this.channelByPeer[to.toString('hex')]
    if (!channel.isOpen()) {
      throw new Error('Invalid Channel State:state channel is not open')
    }

    let msgID = this.incrementedMsgID()
    let mediatedTransferState = ({
      msgID: msgID,
      'lock': {
        hashLock: hashLock,
        amount: amount,
        expiration: expiration
      },
      target: to,
      initiator: this.address,
      currentBlock: this.currentBlock,
      secret: secret,
      to: channel.peerState.address
    })

    const msgKey = msgID.toString()
    this.messageState[msgKey] = new stateMachineLib.MessageState(mediatedTransferState, this.initiatorStateMachine)
    this.messageState[msgKey].applyMessage('init')
  }

  /**
   * Send a direct transfer to your channel partner.  This method calls send(directTransfer) and applies the directTransfer to the local channel state.
   * @param {Address} to - eth address who this message will be sent to.  Only differs from target if mediating a transfer
   * @param {BN} transferredAmount - the monotonically increasing amount to send.  This value is set by taking the previous transferredAmount + amount you want to transfer.
   * @throws "Invalid DirectTransfer: unknown to address"
   * @throws 'Invalid DirectTransfer:state channel is not open'
   */
  sendDirectTransfer (to: Address, transferredAmount: BN) {
    if (!this.channelByPeer.hasOwnProperty(to.toString('hex'))) {
      throw new Error('Invalid DirectTransfer: unknown to address')
    }
    let channel = this.channelByPeer[to.toString('hex')]
    if (!channel.isOpen()) {
      throw new Error('Invalid DirectTransfer:state channel is not open')
    }
    let msgID = this.incrementedMsgID()
    let directTransfer = channel.createDirectTransfer(msgID, transferredAmount, this.currentBlock)
    this.signature(directTransfer)
    this.send(to, directTransfer)
    channel.handleTransfer(directTransfer, this.currentBlock)
  }

  incrementedMsgID () {
    this.msgID = this.msgID.add(new util.BN(1))
    return this.msgID
  }

  /** Send the message. Override this function to define different transport channels
   * e.g integrate this with TELEGRAMS Api and securely transfer funds between users on telegram.
   * Generate qrcodes for revelSecret message
   * or implement webRTC p2p protocol for transport etc.
   * @param {message} msg - A message implementation in the message namespace
   */
  send = (to: Address, msg: messageLib.SignedMessage) => this._send(to, msg)

  /** Internal event handlers triggered by state-machine workflows and blockchain events
   * @param {string} event - the GOT.* namespaced event triggered asynchronously by external engine components i.e. stateMachine, on-chain event handlers,etc.
   * @param {object} state - the accompanying object state
   */
  handleEvent (event: string, state: any) { // todo: improve and unify events across rest of the project
    try {
      if (event.startsWith('GOT.')) {
        let channel
        // console.log(event)
        switch (event) {
          case 'GOT.sendMediatedTransfer':
            channel = this.channelByPeer[state.to.toString('hex')]
            if (!channel.isOpen()) {
              throw new Error('Channel is not open')
            }

            // msgID,hashLock,amount,expiration,target,initiator,currentBlock
            let mediatedTransfer = channel.createMediatedTransfer(state.msgID,
              state.lock.hashLock,
              state.lock.amount,
              state.lock.expiration,
              state.target,
              state.initiator,
              state.currentBlock)
            this.signature(mediatedTransfer)
            this.send(state.to, mediatedTransfer)
            channel.handleTransfer(mediatedTransfer)
            break
          case 'GOT.sendRequestSecret':
            channel = this.channelByPeer[state.to.toString('hex')]
            let requestSecret = new messageLib.RequestSecret({
              msgID: state.msgID,
              to: state.from,
              hashLock: state.lock.hashLock,
              amount: state.lock.amount
            })
            this.signature(requestSecret)
            this.send(state.to, requestSecret)
            break
          case 'GOT.sendRevealSecret':
            channel = this.channelByPeer[state.to.toString('hex')]
            // technically, this workflow only works when target == to.  In mediated transfers
            // we need to act more generally and have the state machine tell us where we should
            // send this secret (backwards and forwards maybe)
            let revealSecret = new messageLib.RevealSecret({ to: state.revealTo, secret: state.secret })
            this.signature(revealSecret)
            this.send(state.to, revealSecret)
            // we dont register the secret, we wait for the echo Reveal
            break
          case 'GOT.sendSecretToProof':
            channel = this.channelByPeer[state.to.toString('hex')]
            // OPTIMIZE:technically we can still send sec2proof,
            // it would beneficial to our partner saving $$ for lock withdrawal
            // but for now we act in no interest of the  peer endpoint :( meanie
            if (!channel.isOpen()) {
              throw new Error('Channel is not open')
            }

            let secretToProof = channel.createSecretToProof(state.msgID, state.secret)
            this.signature(secretToProof)
            channel.handleTransfer(secretToProof)
            this.send(state.to, secretToProof)
            // TODO: in the future, wait to apply secret to proof locally. We basically locked the state up now
            // It makes sense, in a sense.  With this implementation, when a lock secret is revealed and echoed back
            // the peer MUST accept a valid SecretToProof or no more new transfers can take place as the states are unsynced
            // By having the peer echo back, we dont really do much difference, the state is simplex

            break
          case 'GOT.closeChannel':
            channel = this.channelByPeer[state.from.toString('hex')]
            // TODO emit closing
            return this.closeChannel(channel.channelAddress)
          // channel.handleClose(this.currentBlock);
          // break
          case 'GOT.issueSettle':
            // TODO emit "IssueSettle to ui + channel";
            let channelAddress = state
            // console.log('CAN ISSUE SETTLE:' + channelAddress.toString('hex'))
            break
        }
        return
      }
    } catch (err) {
      this.handleError(err)
    }
  }

  /** * Internal error handler triggered by errors encountered by handleEvent
   * @param {Error} err - the error caught during handleEvent execution
   */
  handleError (err) {
    console.error(err)
  }

  /** * Blockchain callback when a new block is mined and blockNumber increases.
   * This informs the engine of time progression via block number increments crucial for lockedtransfer
   * and channel lifecycle management
   * @param {BN} block - the latest mined block
   */
  onBlock (block: BlockNumber) {
    if (block.lt(this.currentBlock)) {
      throw new Error('Block Error: block count must be monotonically increasing')
    }

    this.currentBlock = block
    // handleBlock by all the in-flight messages
    // timeout or take action as needed
    let self = this
    Object.values(this.messageState).map(function (messageState: any) {
      try {
        // console.debug('CALL HANDLE BLOCK ON MESSAGE')
        messageState.applyMessage('handleBlock', self.currentBlock)
      } catch (err) {
        console.log(err)
      }
    })
    // handleBlock for each of the channels, perhaps SETTLE_TIMEOUT has passed
    Object.values(this.channels).map(function (channel: any) {
      // console.debug('CALL HANDLE BLOCK ON CHANNEL')
      let events = channel.onBlock(self.currentBlock)
      for (let i = 0; i < events.length; i++) {
        self.handleEvent.apply(events[i])
      }
    })
  }

  /** Create a new channel given the peer ethereum address
   * @param {Buffer} peerAddress - eth address
   * @returns {Promise} - the promise is settled when the channel is mined.  If there is an error during any point of execution in the mining
   * the onChannelNewError(peerAddress) is called
   */
  newChannel (peerAddress: Address) {
    // is this a blocking call?
    if (!this.pendingChannels.hasOwnProperty(peerAddress.toString('hex')) &&
      this.channelByPeer.hasOwnProperty(peerAddress.toString('hex')) &&
      this.channelByPeer[peerAddress.toString('hex')].state !== channelLib.CHANNEL_STATE_SETTLED) {
      throw new Error('Invalid Channel: cannot create new channel as channel already exists with peer and is unsettled')
    }
    this.pendingChannels[peerAddress.toString('hex')] = true
    let self = this
    let _peerAddress = peerAddress

    return this.blockchain.newChannel({ to: this.blockchain.config.manager },
      { partner: peerAddress, settle_timeout: this.settleTimeout }).then(function (vals) {
        // ChannelNew(address netting_channel,address participant1,address participant2,uint settle_timeout);
        // var channelAddress = vals[0];
        // var addressOne = vals[1];
        // var addressTwo = vals[2];
        // var timeout = vals[3];
        // self.onChannelNew(channelAddress,addressOne,addressTwo,timeout);
      }).catch(function (err) {
        self.onChannelNewError(_peerAddress, err)
        // todo: should re-throw (?)
      })
  }

  /** close a channel given the peer ethereum address.  The close proof in the state is transferred during the call to close.
   * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
   * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
   * the onChannelCloseError(channelAddress) is called
   */
  closeChannel (channelAddress: Address) {
    if (!this.channels.hasOwnProperty(channelAddress.toString('hex'))) {
      throw new Error('Invalid Close: unknown channel')
    }
    let channel = this.channels[channelAddress.toString('hex')]
    if (!channel.isOpen()) {
      throw new Error('Invalid Close: Cannot reissue Closed')
    }

    let proof = channel.issueClose(this.currentBlock) as messageLib.Proof
    let self = this

    return this.blockchain.close({ to: channelAddress },
      messageLib.proofToTxData(proof)).catch(function (err) {
        return self.onChannelCloseError(channelAddress, err)
      })
  }

  /** Update the proof after you learn a channel has been closed by the channel counter party
   * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
   * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
   * the onTransferUpdatedError(channelAddress) is called
   */
  transferUpdate (channelAddress: Address) {
    if (!this.channels.hasOwnProperty(channelAddress.toString('hex'))) {
      throw new Error('Invalid TransferUpdate: unknown channel')
    }
    let channel = this.channels[channelAddress.toString('hex')]
    if (channel.isOpen()) {
      throw new Error('Invalid TransferUpdate: Cannot issue update on open channel')
    }
    let proof = channel.issueTransferUpdate(this.currentBlock) as messageLib.Proof
    const self = this

    return this.blockchain.updateTransfer({ to: channelAddress }, messageLib.proofToTxData(proof))
      .catch(function (err) {
        self.onTransferUpdatedError(channelAddress, err)
      })
  }

  /** Issue withdraw proofs on-chain for locks that have had their corresponding secret revealed.  Locks can be settled on chain once a proof has been sent on-chain.
   * Locks can only be withdrawn once.
   * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
   * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
   * the onChannelSecretRevealedError(channelAddress) is called for each lock that was not successfully withdrawn on-chain and must be reissued
   */
  withdrawPeerOpenLocks (channelAddress: Address) {
    if (!this.channels.hasOwnProperty(channelAddress.toString('hex'))) {
      throw new Error('Invalid Withdraw: unknown channel')
    }
    let channel = this.channels[channelAddress.toString('hex')]
    if (channel.isOpen()) {
      throw new Error('Invalid Withdraw: Cannot issue withdraw on open channel')
    }
    let openLockProofs = channel.issueWithdrawPeerOpenLocks(this.currentBlock)
    let withdraws: any[] = []
    for (let i = 0; i < openLockProofs.length; i++) {
      let p = openLockProofs[i]!
      // nonce,gasPrice,nettingChannelAddress, encodedOpenLock, merkleProof,secret)
      let _secret = p.openLock.secret
      let _channelAddress = channelAddress
      let self = this

      let promise = this.blockchain.withdraw(
        { to: channelAddress },
        { locked_encoded: p.encodeLock(), merkle_proof: p.merkleProof, secret: _secret })
        .then(function (vals) {
          // var secret = vals[0];
          // var receiverAddress = vals[1];
          //  //channelAddress, secret, receiverAddress,block
          //  return self.onChannelSecretRevealed(_channelAddress,secret,receiverAddress)
        })
        .catch(function (err) {
          return self.onChannelSecretRevealedError(_channelAddress, _secret, err)
        })
      withdraws.push(promise)
    }
    return Promise.all(withdraws)
  }

  /** Settle the channel on-chain after settle_timeout time has passed since closing, unlocking the on-chain collateral and distributing the funds
   * according to the proofs and lock withdrawals on chain.
   * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
   * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
   * the onChannelSettledError(channelAddress) is called
   */
  settleChannel (channelAddress: Address) {
    if (!this.channels.hasOwnProperty(channelAddress.toString('hex'))) {
      throw new Error('Invalid Settle: unknown channel')
    }
    let channel = this.channels[channelAddress.toString('hex')]
    if (channel.isOpen()) {
      throw new Error('Invalid Settle: cannot issue settle on open channel')
    }

    let self = this
    channel.issueSettle(this.currentBlock)

    return self.blockchain.settle({ to: channelAddress }).catch(function (err) {
      return self.onChannelSettledError(channelAddress, err)
    })
  }

  /** Deposit an amount of the ERC20 token into the channel on-chain.  After the transaction is mined successfully,
   * that amount will be available for net transfer in the channel. This is effectively the collateral locked up during the
   * channel lifetime and cannot be freed until the channel is closed and settled.
   * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
   * @param {BN} amount - the amount of the ERC20 token to deposit.  The maxium amount of the cumulative deposits is determined by the allowance setup for the channel.
   * @see Engine.approveChannel
   * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
   * the onChannelNewBalanceError(channelAddress) is called
   */
  depositChannel (channelAddress: Address, amount: BN) {
    if (!this.channels.hasOwnProperty(channelAddress.toString('hex'))) {
      throw new Error('Invalid Settle: unknown channel')
    }
    let channel = this.channels[channelAddress.toString('hex')]
    if (!channel.isOpen()) {
      throw new Error('Invalid Deposite: cannot issue settle on open channel')
    }
    let _channelAddress = channelAddress
    let self = this

    return self.blockchain.deposit({ to: _channelAddress },
      { amount }).then(function (vals) {
        // event ChannelNewBalance(address token_address, address participant, uint balance);
        // var tokenAddress = vals[0];
        // var nodeAddress = vals[1];
        // var balance = vals[2];
        // return self.onChannelNewBalance(_channelAddress,nodeAddress,balance);
      }).catch(function (err) {
        return self.onChannelNewBalanceError(_channelAddress, err)
      })
  }

  /** approve the channel to take ERC20 deposits.  This must be called before a deposit can be made successfully.  This utlimately creates and allowance
   * for the channel on the ERC20 contract.
   * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
   * @param {BN} amount - the maximum amount of the ERC20 token to allow the channel to transfer when making a deposit.
   * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
   * the onApprovalError(channelAddress) is called
   */
  approveChannel (channelAddress: Address, amount: BN) {
    const self = this
    if (!this.channels.hasOwnProperty(channelAddress.toString('hex'))) {
      throw new Error('Invalid approve Channel: unknown channel')
    }
    let channel = this.channels[channelAddress.toString('hex')]
    let _channelAddress = channel.channelAddress

    return this.blockchain.approve({ to: this.blockchain.config.hsToken },
      { _spender: channel.channelAddress, _value: amount })
      .then(function (vals) {
        // event Approval(address indexed _owner, address indexed _spender, uint256 _value);
        // var owner = vals[0];
        // var spender = vals[1];
        // var value = vals[2];

        // return self.onApproval(owner,spender,value);
      }).catch(function (err) {
        return self.onApprovalError(_channelAddress, err)
      })
  }

  /** Approve the channelManager to take the flat fee in GOT ERC20 tokens when a channel is created.  This only needs to be called once when the engine is initialized
   * @param {BN} amount - the maximum allowance of GOT ERC20 tokens to allow the channelManager to transfer.
   * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
   * the onApprovalError() is called
   */
  approveChannelManager (amount: BN) {
    const self = this

    return self.blockchain.approve(
      { to: self.blockchain.config.gotToken },
      { _spender: self.blockchain.config.manager, _value: amount })
      .then(function (vals) {
        // event Approval(address indexed _owner, address indexed _spender, uint256 _value);
        // var owner = vals[0];
        // var spender = vals[1];
        // var value = vals[2];
        // return self.onApproval(owner,spender,value);
      }).catch(function (err) {
        return self.onApprovalError(err)
      })
  }

  /** Callback when a ERC20 token approves someone for an allowance
   * @param {Address} owner - ethereum address
   * @param {Address} spender - ethereum address
   * @param {BN} value - the allowance that was set
   */
  onApproval (owner: Address, spender: Address, value: BN) {
    return true // todo
  }

  onApprovalError (address, err?) {
    return true // todo
  }

  /** Callback when a new channel is created by the channel manager
   * @param {Address} channelAddress - ethereum address
   * @param {Address} addressOne - ethereum address
   * @param {Address} addressTwo - ethereum address
   * @param {BN} settleTimeout- the settle_timeout for the channel
   */
  onChannelNew (channelAddress: Address, addressOne: Address, addressTwo: Address, settleTimeout: BN) {
    let peerAddress: Address

    // const [a,b,c] = addToStr([channelAddress, addressOne, addressTwo])
    // debugger

    if (addressOne.compare(this.address) === 0) {
      peerAddress = addressTwo
    } else if (addressTwo.compare(this.address) === 0) {
      peerAddress = addressOne
    } else {
      // something very wrong
      throw new Error('Invalid Channel Event:unknown new channel')
    }

    let existingChannel = this.channelByPeer[peerAddress.toString('hex')]
    if (existingChannel && existingChannel.state !== channelLib.CHANNEL_STATE_SETTLED) {
      throw new Error('Invalid Channel: cannot add new channel as it already exists')
    }

    let stateOne = new channelStateLib.ChannelState({
      address: this.address
    })

    let stateTwo = new channelStateLib.ChannelState({
      address: peerAddress
    })

    // constructor(peerState,myState,channelAddress,settleTimeout,revealTimeout,currentBlock){
    let channel = new channelLib.Channel(stateTwo, stateOne, channelAddress,
      this.currentBlock, this.revealTimeout)
    this.channels[util.toBuffer(channel.channelAddress).toString('hex')] = channel
    this.channelByPeer[channel.peerState.address.toString('hex')] = channel

    if (this.pendingChannels.hasOwnProperty(peerAddress.toString('hex'))) {
      delete this.pendingChannels[peerAddress.toString('hex')]
    }

    this.blockchain.monitoring.subscribeAddress(channelAddress)
    return true
  }

  onChannelNewError (peerAddress: Buffer, err?) {
    if (this.pendingChannels.hasOwnProperty(peerAddress.toString('hex'))) {
      delete this.pendingChannels[peerAddress.toString('hex')]
    }

    // TODO: emit UnableToCreate Channel with Peer
  }

  // FIXME - investigate why strings were used in docs @Amit
  /** Callback when a channel has tokens deposited into it on-chain
   * @param {Address} channelAddress - ethereum address hexString
   * @param {Address} address - the particpants ethereum address in hexString who deposited the funds
   * @param {String} balance - the new deposited balance for the participant in the channel
   */
  onChannelNewBalance (channelAddress: Address, address: Address, balance: BN) {
    // console.log(channelAddress.toString('hex'), address.toString('hex'))
    try {
      this.channels[channelAddress.toString('hex')].onChannelNewBalance(address, balance)
    } catch (e) {
      // console.log(this.channels, channelAddress.toString('hex'))
      throw e
    }
    return true // todo
  }

  onChannelNewBalanceError (address, err?) {
    return false // todo
  }

  /** Callback when a  channel is closed on chain identifying which of the partners initiated the close
   * @param {Address} channelAddress - ethereum address hexString
   * @param {Address} closingAddress - ethereum address hexString
   */
  onChannelClose (channelAddress: Address, closingAddress: Address) {
    let channel = this.channels[channelAddress.toString('hex')]
    channel.onChannelClose(closingAddress, this.currentBlock)
    if (closingAddress.compare(this.address) !== 0) {
      return this.transferUpdate(channelAddress)
    }
    return Promise.resolve()
  }

  onChannelCloseError (channelAddress: Address, err?) {
    let channel = this.channels[channelAddress.toString('hex')]
    return channel.onChannelCloseError()
  }

  /** Callback when a the counterpary has updated their transfer proof on-chain
   * @param {Address} channelAddress - ethereum address hexString
   * @param {Address} nodeAddress - the party who submitted the proof
   */
  onTransferUpdated (channelAddress: Address, nodeAddress: Address) {
    return this.channels[channelAddress.toString('hex')].onTransferUpdated(nodeAddress, this.currentBlock)
  }

  onTransferUpdatedError (channelAddress: Buffer, err?) {
    return this.channels[channelAddress.toString('hex')].onTransferUpdatedError()
  }

  /** Callback when a channel is settled on-chain
   * @param {Address} channelAddress - ethereum address hexString
   */
  onChannelSettled (channelAddress: Address) {
    return this.channels[channelAddress.toString('hex')].onChannelSettled(this.currentBlock)
  }
  onChannelSettledError (channelAddress: Address, err?) {
    return this.channels[channelAddress.toString('hex')].onChannelSettledError()
  }

  /** Callback when a lock has been withdrawn on-chain.  If a user was withholding the secret in a mediate transfer,
   * the party can now unlock the pending locks in the other channels.  This is why it is essential in a mediated transfer setting
   * that each hop decrements the expiration by a safe margin such that they may claim a lock off chain in case of byzantine faults
   * @param {Address} channelAddress - ethereum address hexString
   * @param {Buffer} secret - the 32 byte secret in hexString
   * @param {Buffer} receiverAddress - ethereum address hexString which unlocked the lock on-chain
   */
  onChannelSecretRevealed (channelAddress: Address, secret: Buffer, receiverAddress: Buffer) {
    return this.channels[channelAddress.toString('hex')].onChannelSecretRevealed(secret, receiverAddress, this.currentBlock)
  }
  onChannelSecretRevealedError (channelAddress: Address, secret: Buffer, err?) {
    return this.channels[channelAddress.toString('hex')].onChannelSecretRevealedError(secret)
  }

  /** Callback when a channel has been closed and the channel lifetime exceeds the refund interval.
   * i.e. channel.closedBlock - channel.openedBlock > refundInterval.  This is in hopes to incentives longer lived state channels
   * by reducing the cost of their deployment for longer periods.
   * @param {Address} channelAddress - ethereum address hexString
   * @param {Address} receiverAddress - ethereum address hexString of the party that received the refund
   * @param {BN} amount- the amount of GOT refunded
   */
  onRefund (channelAddress: Address, receiverAddress: Address, amount: BN) {
    return true
  }
}
