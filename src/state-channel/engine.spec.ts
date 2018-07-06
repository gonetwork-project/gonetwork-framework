import * as util from 'ethereumjs-util'
import * as assert from 'assert'

import { Engine, channel, message, merkletree } from '.'
import { Address, PrivateKey, BlockNumber } from 'eth-types'

const privateKey = util.toBuffer('0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109') as PrivateKey
const publicKey = util.privateToPublic(privateKey)
const channelAddress = util.pubToAddress(publicKey) as Address
const events = require('events')
// setup global public/private key pairs
const pkAddr = [
  {
    pk: util.toBuffer('0xa63c8dec79b2c168b8b76f131df6b14a5e0a1ab0310e0ba652f39bca158884ba') as PrivateKey,
    address: util.toBuffer('0x6877cf5f9af67d622d6c665ea473e0b1a14f99d0') as Address
  },
  {
    pk: util.toBuffer('0x6f1cc905d0a87054c15f183eae89ccc8dc3a79702fdbb47ae337583d22df1a51') as PrivateKey,
    address: util.toBuffer('0x43068d574694419cb76360de33fbd177ecd9d3c6') as Address
  },
  {
    pk: util.toBuffer('0x8dffbd99f8a386c18922a014b5356344a4ac1dbcfe32ee285c3b23239caad10d') as PrivateKey,
    address: util.toBuffer('0xe2b7c4c2e89438c2889dcf4f5ea935044b2ba2b0') as Address
  }
]

function assertProof (assert, transfer, nonce, channelAddress, transferredAmount, locksRoot, from) {
  assert.equal(transfer.nonce.eq(nonce), true, 'correct nonce in transfer')
  assert.equal(transfer.transferredAmount.eq(new util.BN(transferredAmount)), true, 'correct transferredAmount in transfer')
  assert.equal(transfer.channelAddress.compare(util.toBuffer(channelAddress)), 0, 'correct channelAddress in transfer')
  assert.equal(transfer.locksRoot.compare(util.toBuffer(locksRoot)), 0, 'correct locksRoot in transfer')
  if (from) {
    assert.equal(transfer.from.compare(from), 0, 'correct from recovery in transfer')
  }
}

const mockSendFn = (sendQueue: any[]) => (_: Address, msg: any) => {
  sendQueue.push(message.serialize(msg))
  return Promise.resolve(true)
}

class TestEventBus extends events.EventEmitter {
  byPass: boolean
  constructor () {
    super()
    this.engine = {}
    this.on('send', this.onReceive)
    this.msgCount = 0
    this.byPass = false
  }

  addEngine (engine) {
    this.engine[engine.address.toString('hex')] = engine

    const self = this
    engine.send = function (_, msg) {
      // console.log('SENDING: ' + msg.from.toString('hex') + ' -> ' + msg.to.toString('hex') + ' of type:' + msg.classType)
      const emitter = self
      setTimeout(function () {
        emitter.emit('beforeSending-' + emitter.msgCount, msg)
        if (!self.byPass) {
          emitter.emit('send', message.serialize(msg))
        }
        emitter.emit('afterSending-' + emitter.msgCount, msg)
      }, 100)
    }
  }

  onReceive (packet) {
    this.msgCount++
    const msg = message.deserializeAndDecode(packet)
    this.emit('beforeReceiving-' + this.msgCount, msg)
    if (!this.byPass) {
      this.engine[(msg as any).to.toString('hex')].onMessage(msg)
    }
    this.emit('afterReceiving-' + this.msgCount, msg)
  }
}

class MockBlockchain {
  cmdQueue = [] as any[]
  config = {}

  monitoring = {
    subscribeAddress: () => Promise.resolve(true)
  }
  rpc: any
  contractsProxy: any
  txs: any

  constructor (readonly blockchainQueue: any[]) { }

  handle (msg) {
    this.blockchainQueue.push(msg)
  }

  close (channelAddress, proof) {
    this.cmdQueue.push('closeChannel')
    const self = this
    const args = arguments
    return new Promise(function (resolve, reject) {
      self.blockchainQueue.push(args)
    })
  }

  updateTransfer (channelAddress, proof, success, error) {
    this.cmdQueue.push('updateTransfer')
    const self = this
    const args = arguments
    return new Promise(function (resolve, reject) {
      self.blockchainQueue.push(args)
      resolve(args)
    })
  }

  withdraw (channelAddress, encodedLock, merkleProof, secret) {
    this.cmdQueue.push('withdrawPeerOpenLocks')
    let self = this
    let args = arguments
    return new Promise(function (resolve, reject) {
      self.blockchainQueue.push(args)
      resolve(1000)
    })
  }

  newChannel (peerAddress, settleTimeout) {
    return new Promise((resolve, reject) => {
      this.cmdQueue.push('newChannel')
      // this.cmdQueue.push([peerAddress,settleTimeout]);
      resolve(channelAddress)
    })
  }

  settle (channelAddress) {
    this.cmdQueue.push('settle')
    let args = arguments
    return new Promise(function (resolve, reject) {
      resolve(args)
    })
  }
}

function assertChannelState (assert,
  engine, channelAddress, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount,
  peerNonce, peerDepositBalance, peerTransferredAmount, peerLockedAmount, peerUnlockedAmount, currentBlock) {
  let state1 = engine.channels[channelAddress.toString('hex')].myState
  assertStateBN(assert, state1, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount, currentBlock)
  let state2 = engine.channels[channelAddress.toString('hex')].peerState
  assertStateBN(assert, state2, peerNonce, peerDepositBalance, peerTransferredAmount, peerLockedAmount, peerUnlockedAmount, currentBlock)
}
function assertStateBN (assert, state, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount, currentBlock) {
  assert.equal(state.nonce.eq(new util.BN(nonce)), true, 'correect nonce in state')
  assert.equal(state.proof.transferredAmount.eq(new util.BN(transferredAmount)), true, 'correct transferredAmount in state')
  if (!currentBlock) {
    currentBlock = new util.BN(0)
  }
  assert.equal(state.lockedAmount(currentBlock).eq(new util.BN(lockedAmount)), true, 'correct lockedAmount calculated in state')
  assert.equal(state.unlockedAmount().eq(new util.BN(unlockedAmount)), true, 'correct unlockedAmount calculated in state')
  assert.equal(state.depositBalance.eq(new util.BN(depositBalance)), true, 'correct depositBalance in state')
}

function createEngine (pkIndex, blockchainService?) {
  let e = new Engine({
    address: pkAddr[pkIndex].address as Address,
    sign: function (msg) {
      // console.log('SIGNING MESSAGE')
      msg.sign(pkAddr[pkIndex].pk as PrivateKey)
    },
    blockchain: blockchainService,
    send: () => Promise.resolve(true) // not used in tests
  })
  return e
}

describe('test engine', () => {
  test('can initialize engine', () => {
    let engine = createEngine(0)
    // assert engine parameters
    assert.equal(engine.currentBlock.eq(new util.BN(0)), true, 'currentBlock initialized correctly')
    assert.equal(engine.msgID.eq(new util.BN(0)), true, 'msgID initialized correctly')
    assert.equal(engine.address.compare(pkAddr[0].address), 0, 'ethereum address set correctly')
  })

  test(`component test: create new channel with 0x ${pkAddr[1].address.toString('hex')}, depositBalance 501,327`,
    () => {
      let currentBlock = new util.BN(0)
      let engine = createEngine(0)
      engine.blockchain = new MockBlockchain([]) as any
      // channelAddress,myDeposityBalance,peerAddress
      let depositBalance = new util.BN(501)
      engine.newChannel(pkAddr[1].address)

      assert.equal(engine.pendingChannels.hasOwnProperty(pkAddr[1].address.toString('hex')), true)

      try {
        engine.newChannel(pkAddr[1].address)
      } catch (err) {
        assert.equal(err.message, 'Invalid Channel: cannot create new channel as channel already exists with peer', 'can handle multiple calls to create new channel')
      }

      engine.onChannelNew(channelAddress,
        pkAddr[0].address,
        pkAddr[1].address,
        channel.SETTLE_TIMEOUT)

      // handle multiple events coming back from blockchain
      try {
        engine.onChannelNew(channelAddress,
          pkAddr[0].address,
          pkAddr[1].address,
          new util.BN(0))
      } catch (err) {
        assert.equal(err.message, 'Invalid Channel: cannot add new channel as it already exists', 'can handle duplicate calls to onChannelNew')
      }

      assert.equal(engine.pendingChannels.hasOwnProperty(pkAddr[1].address.toString('hex')), false)

      assert.equal(engine.channels.hasOwnProperty(channelAddress.toString('hex')), true)
      assert.equal(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)

      engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))
      engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))

      assertChannelState(assert,
        engine, channelAddress, new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      // try an out of order deposit
      try {
        engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(320))
      } catch (err) {
        assert.equal(err.message, 'Invalid Deposit Amount: deposit must be monotonically increasing')
      }
      assertChannelState(assert,
        engine, channelAddress, new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    })

  test('component test: e2e engine direct transfer', function () {
    let sendQueue = [] as any[]
    let blockchainQueue = [] as any[]
    let currentBlock = new util.BN(0)
    let engine = createEngine(0)
    let engine2 = createEngine(1)

    // SETUP AND DEPOSIT FOR ENGINES
    engine.send = mockSendFn(sendQueue)
    engine2.send = mockSendFn(sendQueue)

    let mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain as any
    engine2.blockchain = mockBlockChain as any

    engine.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)
    engine2.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)

    engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine2.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))
    engine2.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP

    currentBlock = currentBlock.add(new util.BN(1))

    // START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)

    assert.equal(sendQueue.length, 0, 'send direct transfer')
    engine.sendDirectTransfer(pkAddr[1].address, new util.BN(50))
    // sent but not prcessed yet by engine(1) as expected
    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assert.equal(sendQueue.length, 1, 'send direct transfer')

    let msg = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
    assert.equal(msg.to.compare(engine2.address), 0, 'send direct has correct address')
    engine2.onMessage(msg)
    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

    engine2.sendDirectTransfer(pkAddr[0].address, new util.BN(377))
    msg = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
    assert.equal(sendQueue.length, 2)
    engine.onMessage(msg)

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(327), new util.BN(377), new util.BN(0), new util.BN(0), currentBlock)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(1), new util.BN(327), new util.BN(377), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

    // engine2 has no more money left!
    assert.throws(function () {
      try {
        engine2.sendDirectTransfer(pkAddr[0].address, new util.BN(377))
      } catch (err) {
        assert.equal(err.message, 'Insufficient funds: direct transfer cannot be completed:377 - 377 > 0')
        throw new Error()
      }
    }, 'Insufficient funds: direct transfer cannot be completed:377 - 377 > 0')

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(327), new util.BN(377), new util.BN(0), new util.BN(0), currentBlock)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(1), new util.BN(327), new util.BN(377), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

    // now engine(0) tries to send more money then it has
    assert.throws(function () {
      try {
        engine.sendDirectTransfer(pkAddr[1].address, new util.BN(879))
      } catch (err) {
        assert.equal(err.message, 'Insufficient funds: direct transfer cannot be completed:879 - 50 > 828')
        throw new Error()
      }
    })

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(327), new util.BN(377), new util.BN(0), new util.BN(0), currentBlock)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(1), new util.BN(327), new util.BN(377), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

    engine.sendDirectTransfer(pkAddr[1].address, new util.BN(828))
    msg = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
    assert.equal(sendQueue.length, 3)
    engine2.onMessage(msg)

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(2), new util.BN(501), new util.BN(828), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(327), new util.BN(377), new util.BN(0), new util.BN(0), currentBlock)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(1), new util.BN(327), new util.BN(377), new util.BN(0), new util.BN(0),
      new util.BN(2), new util.BN(501), new util.BN(828), new util.BN(0), new util.BN(0), currentBlock)

    engine.closeChannel(channelAddress)
    // console.log(engine.channels[channelAddress.toString('hex')].state)
    assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
    assert.equal(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
  })

  test('component test: #1) e2e engine mediated transfer #2)engine 1 responds with transferUpdate when it receives a channelClose event as it did not issue close',
    () => {
      let sendQueue = [] as any[]
      let blockchainQueue = [] as any[]
      let currentBlock = new util.BN(0)

      let engine = createEngine(0)
      let engine2 = createEngine(1)

      // SETUP AND DEPOSIT FOR ENGINES
      engine.send = mockSendFn(sendQueue)
      engine2.send = mockSendFn(sendQueue)

      let mockBlockChain = new MockBlockchain(blockchainQueue)
      engine.blockchain = mockBlockChain as any
      engine2.blockchain = mockBlockChain as any

      engine.onChannelNew(channelAddress,
        pkAddr[0].address,
        pkAddr[1].address,
        channel.SETTLE_TIMEOUT)
      engine2.onChannelNew(channelAddress,
        pkAddr[0].address,
        pkAddr[1].address,
        channel.SETTLE_TIMEOUT)

      engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
      engine2.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
      engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))
      engine2.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))

      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
      assert.equal(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      // END SETUP

      currentBlock = currentBlock.add(new util.BN(1))

      // START  A MEDIATED TRANSFER FROM ENGINE(0) to ENGINE(1)

      assert.equal(sendQueue.length, 0, 'send direct transfer')

      // to,target,amount,expiration,secret,hashLock
      let secretHashPair = message.GenerateRandomSecretHashPair()

      engine.sendMediatedTransfer(
        pkAddr[1].address,
        pkAddr[1].address,
        new util.BN(50),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )

      assert.equal(sendQueue.length, 1, 'medited transfer in send queue')
      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
      // console.log(mt.to.toString('hex') +":"+ pk_addr[1].address.toString('hex'));
      let mediatedTransfer = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine2.onMessage(mediatedTransfer as any)
      assert.equal(sendQueue.length, 2, 'requestSecret in send queu')
      // console.log(engine.channelByPeer[pk_addr[1].address.toString('hex')]);

      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0), currentBlock)

      let requestSecret = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine.onMessage(requestSecret as any)
      assert.equal(sendQueue.length, 3, 'reveal secret in send queue from initiator -> target')
      let revealSecretInitiator = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
      assert.equal(revealSecretInitiator.from.compare(pkAddr[0].address), 0, 'reveal secret signed by initiator')

      engine2.onMessage(revealSecretInitiator)

      assert.equal(sendQueue.length, 4, 'reveal secret in send queue from target -> initiator')
      let revealSecretTarget = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
      assert.equal(revealSecretTarget.from.compare(pkAddr[1].address), 0, 'reveal secret signed by initiator')
      console.log(revealSecretTarget)
      engine.onMessage(revealSecretTarget)

      console.log(engine.channels[channelAddress.toString('hex')].myState)
      console.log(engine2.channels[channelAddress.toString('hex')].peerState)

      // TEST #1 states should be synced
      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)

      assert.equal(sendQueue.length, 5, 'reveal secret in send queue from target -> initiator')
      let secretToProof = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
      assert.equal(secretToProof instanceof message.SecretToProof, true, 'secretToProof generated by initiator')
      engine2.onMessage(secretToProof)

      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

      // TEST #2 Engine 2 initiates close, Engine 1 responds to onChannelClose with updateTransfer request to blockchain
      assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
      assert.equal(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
      engine2.closeChannel(channelAddress)

      engine2.withdrawPeerOpenLocks(channelAddress)
      assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
      assert.equal(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)

      assert.equal(blockchainQueue.length, 1, 'blockchain, no open locks to call to blockchain')
      assertProof(assert, blockchainQueue[0][1], 2, channelAddress, 50, message.EMPTY_32BYTE_BUFFER, engine.address)
      assert.equal(mockBlockChain.cmdQueue.length, 1)
      assert.equal(mockBlockChain.cmdQueue[0], 'closeChannel')

      currentBlock = currentBlock.add(new util.BN(1))

      engine.onChannelClose(channelAddress, engine2.address)
        .then(() => {
          engine.withdrawPeerOpenLocks(channelAddress)
          assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_CLOSED)
          assert.equal(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
          assert.equal(blockchainQueue.length, 2, 'engine(2) didnt send any transfers to engine(1) so no close proof needed by engine(1)')
          assert.equal(mockBlockChain.cmdQueue.length, 2)
          assert.equal(mockBlockChain.cmdQueue[0], 'closeChannel')
          assert.equal(mockBlockChain.cmdQueue[1], 'updateTransfer')
        })
    })

  function assertState (assert, state, expectedState) {
    assert.equal(state.__machina__['mediated-transfer'].state, expectedState)
  }

  test('lock expires on engine handleBlock', () => {
    let blockchainQueue = []
    let currentBlock = new util.BN(0)

    let engine = createEngine(0)
    let engine2 = createEngine(1)

    let mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain as any
    engine2.blockchain = mockBlockChain as any

    engine.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)
    engine2.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)

    engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine2.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))
    engine2.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    assert.equal(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP
    let secretHashPair = message.GenerateRandomSecretHashPair()

    let testEventBus = new TestEventBus()
    testEventBus.addEngine(engine)
    testEventBus.addEngine(engine2)
    engine.sendMediatedTransfer(
      pkAddr[1].address,
      pkAddr[1].address,
      new util.BN(50),
      currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
      secretHashPair.secret as any, // FIXME
      secretHashPair.hash
    )
    // MsgCount , engine(1) <-> engine(2)
    //                START TRANSFER
    // 1 , MediatedTransfer ->
    // 2 ,                  <- RequestSecret
    // 3 , RevealSecret     ->
    // 4 ,                  <- RevealSecret
    // 5 , secretToProof    ->
    //                COMPLETED TRANSFER

    testEventBus.on('afterReceiving-4', function (msg) {
      // we applied the revealSecret and secretToProof locally, now we are just waiting for other endpoint
      // to sync
      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)
    })
    testEventBus.on('afterReceiving-5', function () {
      // One Secret Completed, Second Secret will timeout before reveal sent
      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

      testEventBus.on('beforeReceiving-8', function (msg) {
        // before we apply the reveal secret, we are going to move this ahead and expire the transfer, this should not
        // cause any blockchain events and further processing just moves one without failing
        assert.equal(msg.from.compare(engine2.address), 0)
        // we dont want to send this message, but instead we want to
        // cause the lock to timeout

        assertState(assert, engine.messageState['1'].state, 'awaitRevealSecret')
        engine.onBlock(currentBlock.add(new util.BN(1)) as BlockNumber)
        assertState(assert, engine.messageState['1'].state, 'expiredTransfer')
      })
      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        pkAddr[0].address,
        pkAddr[0].address,
        new util.BN(120),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )
    })
  })

  test('multiple unopened locks expire on engine handleBlock', () => {
    let blockchainQueue = []
    let currentBlock = new util.BN(0)

    let engine = createEngine(0)
    let engine2 = createEngine(1)
    let mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain as any
    engine2.blockchain = mockBlockChain as any

    engine.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)
    engine2.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)

    engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine2.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))
    engine2.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    assert.equal(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP
    let secretHashPair = message.GenerateRandomSecretHashPair()

    let testEventBus = new TestEventBus()
    testEventBus.addEngine(engine)
    testEventBus.addEngine(engine2)
    engine.sendMediatedTransfer(
      pkAddr[1].address,
      pkAddr[1].address,
      new util.BN(50),
      currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
      secretHashPair.secret as any,
      secretHashPair.hash
    )
    // MsgCount , engine(1) <-> engine(2)
    //                START TRANSFER
    // 1 , MediatedTransfer ->
    // 2 ,                  <- RequestSecret
    // 3 , RevealSecret     ->
    // 4 ,                  <- RevealSecret
    // 5 , secretToProof    ->
    //                COMPLETED TRANSFER

    testEventBus.on('afterReceiving-4', function (msg) {
      // we applied the revealSecret and secretToProof locally, now we are just waiting for other endpoint
      // to sync
      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)
    })
    testEventBus.on('afterReceiving-5', function () {
      // One Secret Completed, Second Secret will timeout before reveal sent

      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

      testEventBus.on('beforeReceiving-10', function (msg) {
        // before we apply the reveal secret, we are going to move this ahead and expire the transfer, this should not
        // cause any blockchain events and further processing just moves one without failing

        assert.equal(msg.from.compare(engine2.address), 0)
        // we dont want to send this message, but instead we want to
        // cause the lock to timeout
        // ACTUAL TEST:  no blockchain messages are triggered because of these expired blocks as they were not OPEN
        assert.equal(blockchainQueue.length, 0)

        assertState(assert, engine.messageState['1'].state, 'awaitRevealSecret')
        assertState(assert, engine.messageState['2'].state, 'awaitRevealSecret')
        engine.onBlock(currentBlock.add(new util.BN(1)) as BlockNumber)
        assert.equal(blockchainQueue.length, 0)

        assertState(assert, engine.messageState['1'].state, 'expiredTransfer')
        assertState(assert, engine.messageState['2'].state, 'awaitRevealSecret')

        assert.equal(blockchainQueue.length, 0)

        engine.onBlock(currentBlock.add(new util.BN(5)) as BlockNumber)
        assertState(assert, engine.messageState['1'].state, 'expiredTransfer')
        assertState(assert, engine.messageState['2'].state, 'expiredTransfer')
        assert.equal(blockchainQueue.length, 0, 'No Blockchain Messages generated as none of the locks are open')
      })

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        pkAddr[0].address,
        pkAddr[0].address,
        new util.BN(50),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        pkAddr[0].address,
        pkAddr[0].address,
        new util.BN(27),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(5)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )
    })
  })

  test('should emit GOT.closeChannel if a lock is open and the currentBlock <= lock.expiration + reveal_timeout', () => {
    let currentBlock = new util.BN(0)
    let blockchainQueue = []
    let engine = createEngine(0)
    let engine2 = createEngine(1)
    let mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain as any
    engine2.blockchain = mockBlockChain as any

    engine.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)
    engine2.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)

    engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine2.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))
    engine2.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    assert.equal(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP
    let secretHashPair = message.GenerateRandomSecretHashPair()

    let testEventBus = new TestEventBus()
    testEventBus.addEngine(engine)
    testEventBus.addEngine(engine2)
    engine.sendMediatedTransfer(
      pkAddr[1].address,
      pkAddr[1].address,
      new util.BN(50),
      currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
      secretHashPair.secret as any, // FIXME
      secretHashPair.hash
    )
    // MsgCount , engine(1) <-> engine(2)
    //                START TRANSFER
    // 1 , MediatedTransfer ->
    // 2 ,                  <- RequestSecret
    // 3 , RevealSecret     ->
    // 4 ,                  <- RevealSecret
    // 5 , secretToProof    ->
    //                COMPLETED TRANSFER

    testEventBus.on('afterReceiving-4', function (msg) {
      // we applied the revealSecret and secretToProof locally, now we are just waiting for other endpoint
      // to sync
      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)
    })
    testEventBus.on('afterReceiving-5', function () {
      // One Secret Completed, Second Secret will timeout before reveal sent
      assertChannelState(assert,
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(assert,
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

      testEventBus.on('afterReceiving-8', function (msg) {
        // engine.onMessage(msg);
        assertChannelState(assert,
          engine, channelAddress,
          new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
          new util.BN(1), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(120), currentBlock)

        assertChannelState(assert,
          engine2, channelAddress,
          new util.BN(1), new util.BN(327), new util.BN(0), new util.BN(120), new util.BN(0),
          new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

        assert.equal(msg.from.compare(engine2.address), 0)
        // ==================================CORE OF THE TEST
        // aftwer we apply the reveal secret, we are going to move currentBlock ahead and expire the transfer, this should
        // cause any blockchain events and further processing just moves one without failing
        // cause the lock to timeout

        assert.equal(blockchainQueue.length, 0)
        assertState(assert, engine.messageState['1'].state, 'awaitSecretToProof')

        engine.onBlock(currentBlock.add(new util.BN(1)) as BlockNumber)
        assert.equal(blockchainQueue.length, 1)
        assertState(assert, engine.messageState['1'].state, 'completedTransfer')

        assert.equal(mockBlockChain.cmdQueue[0], 'closeChannel', 'first command should be close channel')
        assertProof(assert, blockchainQueue[0][1], 1, channelAddress, 0,
          engine.channels[channelAddress.toString('hex')].peerState.proof.locksRoot, engine2.address)

        // now we have to manually execute withdrawLocks onchain
        engine.withdrawPeerOpenLocks(channelAddress)
        assert.equal(mockBlockChain.cmdQueue[1], 'withdrawPeerOpenLocks', 'next we withdraw open locks')

        assert.equal(blockchainQueue.length, 2, 'only a single lock proof is needed')
        // Assert the withdraw proof
        // console.log('PROOF', engine.channels[channelAddress.toString('hex')].peerState.proof)

        // arguments: channelAddress, encodedLock, merkleProof,secret,
        let proofArgs = blockchainQueue[1]
        // console.log('ARGS', proofArgs)

        let encodedLock = proofArgs[1].locked_encoded
        let secret = proofArgs[1].secret
        let hashLock = proofArgs[1].locked_encoded.slice(64, 96)
        let proof = engine.channels[channelAddress.toString('hex')].peerState.proof
        assert.equal(util.sha3(secret).compare(hashLock), 0)
        assert.equal(merkletree.checkMerkleProof(proofArgs[1].merkle_proof, proof.locksRoot, util.sha3(encodedLock)), true)
        assert.equal(engine.channels[channelAddress.toString('hex')].isOpen(), false)
        assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
      })

      testEventBus.on('beforeReceiving-10', (msg) => {
        testEventBus.byPass = true
        assert.throws(function () {
          try {
            engine.onMessage(msg)
          } catch (err) {
            assert.equal(err.message, 'Invalid transfer: cannot update a closing channel')
            throw new Error()
          }
        }, 'applying message to closing channel throws error')
      })

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        pkAddr[0].address,
        pkAddr[0].address,
        new util.BN(120),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )
    })
  })

  test('engine component test: can handle sending multiple mediated transfers without revealing secret to initiator',
    () => {
      let acct1 = pkAddr[0].address
      let acct4 = pkAddr[1].address
      // const pk1 = pkAddr[0].pk
      // const pk4 = pkAddr[1].pk

      let blockchainQueue = [] as any[]
      let sendQueue = [] as any[]
      let currentBlock = new util.BN(0) as BlockNumber
      let channelAddress = util.toBuffer('0x8bf6a4702d37b7055bc5495ac302fe77dae5243b') as Address
      let engine = createEngine(0)
      let engine2 = createEngine(1)
      // SETUP AND DEPOSIT FOR ENGINES
      engine.send = mockSendFn(sendQueue)
      engine2.send = mockSendFn(sendQueue)

      let mockBlockChain = new MockBlockchain(blockchainQueue)
      engine.blockchain = mockBlockChain as any
      engine2.blockchain = mockBlockChain as any

      engine.onChannelNew(channelAddress,
        pkAddr[0].address,
        pkAddr[1].address,
        channel.SETTLE_TIMEOUT)
      engine2.onChannelNew(channelAddress,
        pkAddr[0].address,
        pkAddr[1].address,
        channel.SETTLE_TIMEOUT)

      engine.onChannelNewBalance(channelAddress, util.toBuffer(acct1), new util.BN(27))
      engine2.onChannelNewBalance(channelAddress, util.toBuffer(acct1), new util.BN(27))

      // END SETUP

      currentBlock = currentBlock.add(new util.BN(1)) as BlockNumber

      // START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)

      // to,target,amount,expiration,secret,hashLock
      let secretHashPair = message.GenerateRandomSecretHashPair()

      engine.sendMediatedTransfer(
        util.toBuffer(acct4),
        util.toBuffer(acct4),
        new util.BN(15),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )

      let mediatedTransfer = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine2.onMessage(mediatedTransfer as any)

      let requestSecret = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine.onMessage(requestSecret as any)
      let revealSecretInitiator = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine2.onMessage(revealSecretInitiator as any)

      let revealSecretTarget = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      console.log(revealSecretTarget)
      engine.onMessage(revealSecretTarget as any)

      console.log(engine2.messageState)
      console.log(sendQueue)

      let secretToProof = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine2.onMessage(secretToProof as any)

      sendQueue = []

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        util.toBuffer(acct1),
        util.toBuffer(acct1),
        new util.BN(7),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )

      mediatedTransfer = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine.onMessage(mediatedTransfer as any)

      requestSecret = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine2.onMessage(requestSecret as any)
      revealSecretInitiator = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine.onMessage(revealSecretInitiator as any)

      revealSecretTarget = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine2.onMessage(revealSecretTarget as any)

      secretToProof = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine.onMessage(secretToProof as any)

      // SEND new lock half open
      sendQueue = [] as any[]

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        util.toBuffer(acct1),
        util.toBuffer(acct1),
        new util.BN(3),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
        secretHashPair.secret as any,
        secretHashPair.hash
      )

      mediatedTransfer = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine.onMessage(mediatedTransfer as any)

      requestSecret = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine2.onMessage(requestSecret as any)
      revealSecretInitiator = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine.onMessage(revealSecretInitiator as any)

      sendQueue = []

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        util.toBuffer(acct1),
        util.toBuffer(acct1),
        new util.BN(2),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )

      mediatedTransfer = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine.onMessage(mediatedTransfer as any)

      requestSecret = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine2.onMessage(requestSecret as any)
      revealSecretInitiator = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine.onMessage(revealSecretInitiator as any)

      sendQueue = [] as any[]

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        util.toBuffer(acct1),
        util.toBuffer(acct1),
        new util.BN(2),
        currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
        secretHashPair.secret as any, // FIXME
        secretHashPair.hash
      )

      mediatedTransfer = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine.onMessage(mediatedTransfer as any)

      requestSecret = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine2.onMessage(requestSecret as any)
      revealSecretInitiator = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine.onMessage(revealSecretInitiator as any)

      // ACTUAL TEST, make sure transferrable correct on both sides even if secret is not revealed to initiator
      let channelOne = engine.channels[channelAddress.toString('hex')]

      console.log(channelOne.transferrableFromTo(channelOne.peerState, channelOne.myState, currentBlock))
      assert.equal(channelOne.transferrableFromTo(channelOne.peerState, channelOne.myState, currentBlock).eq(new util.BN(1)), true)

      channelOne = engine2.channels[channelAddress.toString('hex')]

      console.log(channelOne.transferrableFromTo(channelOne.peerState, channelOne.myState, currentBlock))
      assert.equal(channelOne.transferrableFromTo(channelOne.myState, channelOne.peerState, currentBlock).eq(new util.BN(1)), true)
    })

  test('should fail and revert channel state to open when close channel errors out', () => {
    let sendQueue = [] as any[]
    let blockchainQueue = [] as any[]
    let currentBlock = new util.BN(0)

    let engine = createEngine(0)
    let engine2 = createEngine(1)

    // SETUP AND DEPOSIT FOR ENGINES
    engine.send = mockSendFn(sendQueue)
    engine2.send = mockSendFn(sendQueue)

    let mockBlockChain = new MockBlockchain(blockchainQueue)

    engine.blockchain = mockBlockChain as any
    engine2.blockchain = mockBlockChain as any

    engine.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)
    engine2.onChannelNew(channelAddress,
      pkAddr[0].address,
      pkAddr[1].address,
      channel.SETTLE_TIMEOUT)

    engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine2.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))
    engine2.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    assert.equal(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP

    currentBlock = currentBlock.add(new util.BN(1))

    // START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)

    assert.equal(sendQueue.length, 0, 'send direct transfer')

    // to,target,amount,expiration,secret,hashLock
    let secretHashPair = message.GenerateRandomSecretHashPair()

    engine.sendMediatedTransfer(
      pkAddr[1].address,
      pkAddr[1].address,
      new util.BN(50),
      currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(1)) as BlockNumber,
      secretHashPair.secret as any, // FIXME
      secretHashPair.hash
    )

    assert.equal(sendQueue.length, 1, 'mediated transfer in send queue')
    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    // console.log(mt.to.toString('hex') +":"+ pk_addr[1].address.toString('hex'));
    let mediatedTransfer = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

    engine2.onMessage(mediatedTransfer as any)
    assert.equal(sendQueue.length, 2, 'requestSecret in send queu')
    // console.log(engine.channelByPeer[pk_addr[1].address.toString('hex')]);

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0), currentBlock)

    let requestSecret = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
    engine.onMessage(requestSecret as any)
    assert.equal(sendQueue.length, 3, 'reveal secret in send queue from initiator -> target')
    let revealSecretInitiator = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
    assert.equal(revealSecretInitiator.from.compare(pkAddr[0].address), 0, 'reveal secret signed by initiator')

    engine2.onMessage(revealSecretInitiator)

    assert.equal(sendQueue.length, 4, 'reveal secret in send queue from target -> initiator')
    let revealSecretTarget = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
    assert.equal(revealSecretTarget.from.compare(pkAddr[1].address), 0, 'reveal secret signed by initiator')
    console.log(revealSecretTarget)
    engine.onMessage(revealSecretTarget)

    console.log(engine.channels[channelAddress.toString('hex')].myState)
    console.log(engine2.channels[channelAddress.toString('hex')].peerState)

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)

    assert.equal(sendQueue.length, 5, 'reveal secret in send queue from target -> initiator')
    let secretToProof = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
    assert.equal(secretToProof instanceof message.SecretToProof, true, 'secretToProof generated by initiator')
    engine2.onMessage(secretToProof)

    // final states synchronized
    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

    // MAIN PART OF TEST

    assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
    assert.equal(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN);
    (mockBlockChain as any).closeChannel = function (channelAddress, proof, success, error) {
      assert.equal(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
      this.cmdQueue.push('closeChannel')
      let self = this
      let args = arguments
      return new Promise(function (resolve, reject) {
        self.blockchainQueue.push(args)
        setTimeout(function () {
          reject(channelAddress)
        }, 1000)
      })
    }

    // REVERT
    engine2.closeChannel(channelAddress).then(function () {
      assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
    })
  })
})
