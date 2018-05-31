const test = require('tape')
const util = require('ethereumjs-util')

const Engine = require('../lib/state-channel').Engine
const channel = require('../lib/state-channel').channel
const message = require('../lib/state-channel').message
const merkletree = require('../lib/state-channel').merkletree

var privateKey = util.toBuffer('0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109')
var publicKey = util.privateToPublic(privateKey)
var channelAddress = util.pubToAddress(publicKey)
var events = require('events')
// setup global public/private key pairs
var pkAddr = [{
  pk: util.toBuffer('0xa63c8dec79b2c168b8b76f131df6b14a5e0a1ab0310e0ba652f39bca158884ba'),
  address: util.toBuffer('0x6877cf5f9af67d622d6c665ea473e0b1a14f99d0')
},
{
  pk: util.toBuffer('0x6f1cc905d0a87054c15f183eae89ccc8dc3a79702fdbb47ae337583d22df1a51'),
  address: util.toBuffer('0x43068d574694419cb76360de33fbd177ecd9d3c6')
},
{
  pk: util.toBuffer('0x8dffbd99f8a386c18922a014b5356344a4ac1dbcfe32ee285c3b23239caad10d'),
  address: util.toBuffer('0xe2b7c4c2e89438c2889dcf4f5ea935044b2ba2b0')
}]

function assertProof (assert, transfer, nonce, channelAddress, transferredAmount, locksRoot, from) {
  assert.equals(transfer.nonce.eq(message.TO_BN(nonce)), true, 'correct nonce in transfer')
  assert.equals(transfer.transferredAmount.eq(new util.BN(transferredAmount)), true, 'correct transferredAmount in transfer')
  assert.equals(transfer.channelAddress.compare(util.toBuffer(channelAddress)), 0, 'correct channelAddress in transfer')
  assert.equals(transfer.locksRoot.compare(util.toBuffer(locksRoot)), 0, 'correct locksRoot in transfer')
  if (from) {
    assert.equals(transfer.from.compare(from), 0, 'correct from recovery in transfer')
  }
}

class TestEventBus extends events.EventEmitter {
  constructor () {
    super()
    this.engine = {}
    this.on('send', this.onReceive)
    this.msgCount = 0
    this.byPass = false
  }

  addEngine (engine) {
    this.engine[engine.address.toString('hex')] = engine

    var self = this
    engine.send = function (msg) {
      console.log('SENDING:' + msg.from.toString('hex') + '->' + msg.to.toString('hex') + ' of type:' + msg.classType)
      var emitter = self
      setTimeout(function () {
        emitter.emit('beforeSending-' + emitter.msgCount, msg)
        if (!this.byPass) {
          emitter.emit('send', message.SERIALIZE(msg))
        }
        emitter.emit('afterSending-' + emitter.msgCount, msg)
      }, 100)
    }
  }

  onReceive (packet) {
    this.msgCount++
    var msg = message.DESERIALIZE_AND_DECODE_MESSAGE(packet)
    this.emit('beforeReceiving-' + this.msgCount, msg)
    if (!this.byPass) {
      this.engine[msg.to.toString('hex')].onMessage(msg)
    }
    this.emit('afterReceiving-' + this.msgCount, msg)
  }
}

class MockBlockchain {
  constructor (blockchainQueue) {
    this.blockchainQueue = blockchainQueue
    this.cmdQueue = []
  }

  handle (msg) {
    this.blockchainQueue.push(msg)
  }

  closeChannel (channelAddress, proof) {
    this.cmdQueue.push('closeChannel')
    var self = this
    var args = arguments
    return new Promise(function (resolve, reject) {
      self.blockchainQueue.push(args)
    })
  }

  updateTransfer (channelAddress, proof, success, error) {
    this.cmdQueue.push('updateTransfer')
    var self = this
    var args = arguments
    return new Promise(function (resolve, reject) {
      self.blockchainQueue.push(args)
      resolve(args)
    })
  }

  withdrawLock (channelAddress, encodedLock, merkleProof, secret) {
    this.cmdQueue.push('withdrawPeerOpenLocks')
    var self = this
    var args = arguments
    return new Promise(function (resolve, reject) {
      self.blockchainQueue.push(args)
      resolve(1000)
    })
  }

  newChannel (peerAddress, settleTimeout) {
    return new Promise(function (resolve, reject) {
      this.cmdQueue.push('newChannel')
      // this.cmdQueue.push([peerAddress,settleTimeout]);
      resolve(channelAddress)
    })
  }

  settle (channelAddress) {
    this.cmdQueue.push('settle')
    var args = arguments
    return new Promise(function (resolve, reject) {
      resolve(args)
    })
  }
}

function assertChannelState (assert,
  engine, channelAddress, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount,
  peerNonce, peerDepositBalance, peerTransferredAmount, peerLockedAmount, peerUnlockedAmount, currentBlock) {
  var state1 = engine.channels[channelAddress.toString('hex')].myState
  assertStateBN(assert, state1, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount, currentBlock)
  var state2 = engine.channels[channelAddress.toString('hex')].peerState
  assertStateBN(assert, state2, peerNonce, peerDepositBalance, peerTransferredAmount, peerLockedAmount, peerUnlockedAmount, currentBlock)
};
function assertStateBN (assert, state, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount, currentBlock) {
  assert.equals(state.nonce.eq(new util.BN(nonce)), true, 'correect nonce in state')
  assert.equals(state.proof.transferredAmount.eq(new util.BN(transferredAmount)), true, 'correct transferredAmount in state')
  if (!currentBlock) {
    currentBlock = new util.BN(0)
  }
  assert.equals(state.lockedAmount(currentBlock).eq(new util.BN(lockedAmount)), true, 'correct lockedAmount calculated in state')
  assert.equals(state.unlockedAmount().eq(new util.BN(unlockedAmount)), true, 'correct unlockedAmount calculated in state')
  assert.equals(state.depositBalance.eq(new util.BN(depositBalance)), true, 'correct depositBalance in state')
}

function createEngine (pkIndex, blockchainService) {
  var e = new Engine(pkAddr[pkIndex].address, function (msg) {
    console.log('SIGNING MESSAGE')
    msg.sign(pkAddr[pkIndex].pk)
  }, blockchainService)
  return e
}

test('test engine', function (t) {
  t.test('can initialize engine', function (assert) {
    var engine = createEngine(0)
    // assert engine parameters
    assert.equals(engine.currentBlock.eq(new util.BN(0)), true, 'currentBlock initialized correctly')
    assert.equals(engine.msgID.eq(new util.BN(0)), true, 'msgID initialized correctly')
    assert.equals(engine.address.compare(pkAddr[0].address), 0, 'ethereum address set correctly')

    assert.end()
  })

  t.test('component test: create new channel with 0x' + pkAddr[1].address.toString('hex') + ', depositBalance 501,327', function (assert) {
    var currentBlock = new util.BN(0)
    var engine = createEngine(0)
    engine.blockchain = new MockBlockchain([])
    // channelAddress,myDeposityBalance,peerAddress
    var depositBalance = new util.BN(501)
    engine.newChannel(pkAddr[1].address)

    assert.equals(engine.pendingChannels.hasOwnProperty(pkAddr[1].address.toString('hex')), true)

    try {
      engine.newChannel(pkAddr[1].address, depositBalance)
    } catch (err) {
      assert.equals(err.message, 'Invalid Channel: cannot create new channel as channel already exists with peer', 'can handle multiple calls to create new channel')
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
      assert.equals(err.message, 'Invalid Channel: cannot add new channel as it already exists', 'can handle duplicate calls to onChannelNew')
    }

    assert.equals(engine.pendingChannels.hasOwnProperty(pkAddr[1].address.toString('hex')), false)

    assert.equals(engine.channels.hasOwnProperty(channelAddress.toString('hex')), true)
    assert.equals(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)

    engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))
    engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))

    assertChannelState(assert,
      engine, channelAddress, new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // try an out of order deposit
    try {
      engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(320))
    } catch (err) {
      assert.equals(err.message, 'Invalid Deposit Amount: deposit must be monotonically increasing')
    }
    assertChannelState(assert,
      engine, channelAddress, new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assert.end()
  })

  t.test('component test: e2e engine direct transfer', function (assert) {
    var sendQueue = []
    var blockchainQueue = []
    var currentBlock = new util.BN(0)
    var engine = createEngine(0)
    var engine2 = createEngine(1)

    // SETUP AND DEPOSIT FOR ENGINES
    engine.send = function (msg) {
      sendQueue.push(message.SERIALIZE(msg))
    }

    engine2.send = function (msg) {
      sendQueue.push(message.SERIALIZE(msg))
    }
    var mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain
    engine2.blockchain = mockBlockChain

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

    assert.equals(sendQueue.length, 0, 'send direct transfer')
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
    assert.equals(sendQueue.length, 1, 'send direct transfer')

    var msg = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    assert.equals(msg.to.compare(engine2.address), 0, 'send direct has correct address')
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
    msg = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    assert.equals(sendQueue.length, 2)
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
        assert.equals(err.message, 'Insufficient funds: direct transfer cannot be completed:377 - 377 > 0')
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
        assert.equals(err.message, 'Insufficient funds: direct transfer cannot be completed:879 - 50 > 828')
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
    msg = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    assert.equals(sendQueue.length, 3)
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
    console.log(engine.channels[channelAddress.toString('hex')].state)
    assert.equals(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
    assert.equals(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)

    assert.end()
  })

  t.test('component test: #1) e2e engine mediated transfer #2)engine 1 responds with transferUpdate when it receives a channelClose event as it did not issue close', function (assert) {
    var sendQueue = []
    var blockchainQueue = []
    var currentBlock = new util.BN(0)

    var engine = createEngine(0)
    var engine2 = createEngine(1)

    // SETUP AND DEPOSIT FOR ENGINES
    engine.send = function (msg) {
      sendQueue.push(message.SERIALIZE(msg))
    }

    engine2.send = function (msg) {
      sendQueue.push(message.SERIALIZE(msg))
    }

    var mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain
    engine2.blockchain = mockBlockChain

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
    assert.equals(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP

    currentBlock = currentBlock.add(new util.BN(1))

    // START  A MEDIATED TRANSFER FROM ENGINE(0) to ENGINE(1)

    assert.equals(sendQueue.length, 0, 'send direct transfer')

    // to,target,amount,expiration,secret,hashLock
    var secretHashPair = message.GenerateRandomSecretHashPair()

    engine.sendMediatedTransfer(
      pkAddr[1].address,
      pkAddr[1].address,
      new util.BN(50),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
      secretHashPair.hash
    )

    assert.equals(sendQueue.length, 1, 'medited transfer in send queue')
    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    // console.log(mt.to.toString('hex') +":"+ pk_addr[1].address.toString('hex'));
    var mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine2.onMessage(mediatedTransfer)
    assert.equals(sendQueue.length, 2, 'requestSecret in send queu')
    // console.log(engine.channelByPeer[pk_addr[1].address.toString('hex')]);

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0), currentBlock)

    var requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine.onMessage(requestSecret)
    assert.equals(sendQueue.length, 3, 'reveal secret in send queue from initiator -> target')
    var revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    assert.equals(revealSecretInitiator.from.compare(pkAddr[0].address), 0, 'reveal secret signed by initiator')

    engine2.onMessage(revealSecretInitiator)

    assert.equals(sendQueue.length, 4, 'reveal secret in send queue from target -> initiator')
    var revealSecretTarget = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    assert.equals(revealSecretTarget.from.compare(pkAddr[1].address), 0, 'reveal secret signed by initiator')
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

    assert.equals(sendQueue.length, 5, 'reveal secret in send queue from target -> initiator')
    var secretToProof = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    assert.equals(secretToProof instanceof message.SecretToProof, true, 'secretToProof generated by initiator')
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
    assert.equals(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
    assert.equals(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
    engine2.closeChannel(channelAddress)

    engine2.withdrawPeerOpenLocks(channelAddress)
    assert.equals(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
    assert.equals(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)

    assert.equals(blockchainQueue.length, 1, 'blockchain, no open locks to call to blockchain')
    assertProof(assert, blockchainQueue[0][1], 2, channelAddress, 50, message.EMPTY_32BYTE_BUFFER, engine.address)
    assert.equals(mockBlockChain.cmdQueue.length, 1)
    assert.equals(mockBlockChain.cmdQueue[0], 'closeChannel')

    currentBlock = currentBlock.add(new util.BN(1))

    engine.onChannelClose(channelAddress, engine2.address, currentBlock)
      .then(function () {
        engine.withdrawPeerOpenLocks(channelAddress)
        assert.equals(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_CLOSED)
        assert.equals(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
        assert.equals(blockchainQueue.length, 2, 'engine(2) didnt send any transfers to engine(1) so no close proof needed by engine(1)')
        assert.equals(mockBlockChain.cmdQueue.length, 2)
        assert.equals(mockBlockChain.cmdQueue[0], 'closeChannel')
        assert.equals(mockBlockChain.cmdQueue[1], 'updateTransfer')
      })

    assert.end()
  })

  function assertState (assert, state, expectedState) {
    assert.equal(state.__machina__['mediated-transfer'].state, expectedState)
  }

  t.test('lock expires on engine handleBlock', function (assert) {
    var blockchainQueue = []
    var currentBlock = new util.BN(0)

    var engine = createEngine(0)
    var engine2 = createEngine(1)

    var mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain
    engine2.blockchain = mockBlockChain

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
    assert.equals(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP
    var secretHashPair = message.GenerateRandomSecretHashPair()

    var testEventBus = new TestEventBus()
    testEventBus.addEngine(engine)
    testEventBus.addEngine(engine2)
    engine.sendMediatedTransfer(
      pkAddr[1].address,
      pkAddr[1].address,
      new util.BN(50),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
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
        assert.equals(msg.from.compare(engine2.address), 0)
        // we dont want to send this message, but instead we want to
        // cause the lock to timeout

        assertState(assert, engine.messageState['1'].state, 'awaitRevealSecret')
        engine.onBlock(currentBlock.add(new util.BN(1)))
        assertState(assert, engine.messageState['1'].state, 'expiredTransfer')
      })
      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        pkAddr[0].address,
        pkAddr[0].address,
        new util.BN(120),
        currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
        secretHashPair.secret,
        secretHashPair.hash
      )

      assert.end()
    })
  })

  t.test('multiple unopened locks expire on engine handleBlock', function (assert) {
    var blockchainQueue = []
    var currentBlock = new util.BN(0)

    var engine = createEngine(0)
    var engine2 = createEngine(1)
    var mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain
    engine2.blockchain = mockBlockChain

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
    assert.equals(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP
    var secretHashPair = message.GenerateRandomSecretHashPair()

    var testEventBus = new TestEventBus()
    testEventBus.addEngine(engine)
    testEventBus.addEngine(engine2)
    engine.sendMediatedTransfer(
      pkAddr[1].address,
      pkAddr[1].address,
      new util.BN(50),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
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

        assert.equals(msg.from.compare(engine2.address), 0)
        // we dont want to send this message, but instead we want to
        // cause the lock to timeout
        // ACTUAL TEST:  no blockchain messages are triggered because of these expired blocks as they were not OPEN
        assert.equals(blockchainQueue.length, 0)

        assertState(assert, engine.messageState['1'].state, 'awaitRevealSecret')
        assertState(assert, engine.messageState['2'].state, 'awaitRevealSecret')
        engine.onBlock(currentBlock.add(new util.BN(1)))
        assert.equals(blockchainQueue.length, 0)

        assertState(assert, engine.messageState['1'].state, 'expiredTransfer')
        assertState(assert, engine.messageState['2'].state, 'awaitRevealSecret')

        assert.equals(blockchainQueue.length, 0)

        engine.onBlock(currentBlock.add(new util.BN(5)))
        assertState(assert, engine.messageState['1'].state, 'expiredTransfer')
        assertState(assert, engine.messageState['2'].state, 'expiredTransfer')
        assert.equals(blockchainQueue.length, 0, 'No Blockchain Messages generated as none of the locks are open')
      })

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        pkAddr[0].address,
        pkAddr[0].address,
        new util.BN(50),
        currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
        secretHashPair.secret,
        secretHashPair.hash
      )

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        pkAddr[0].address,
        pkAddr[0].address,
        new util.BN(27),
        currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(5)),
        secretHashPair.secret,
        secretHashPair.hash
      )

      assert.end()
    })
  })

  t.test('should emit GOT.closeChannel if a lock is open and the currentBlock <= lock.expiration + reveal_timeout', function (assert) {
    var currentBlock = new util.BN(0)
    var blockchainQueue = []
    var engine = createEngine(0)
    var engine2 = createEngine(1)
    var mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain
    engine2.blockchain = mockBlockChain

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
    assert.equals(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP
    var secretHashPair = message.GenerateRandomSecretHashPair()

    var testEventBus = new TestEventBus()
    testEventBus.addEngine(engine)
    testEventBus.addEngine(engine2)
    engine.sendMediatedTransfer(
      pkAddr[1].address,
      pkAddr[1].address,
      new util.BN(50),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
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

        assert.equals(msg.from.compare(engine2.address), 0)
        // ==================================CORE OF THE TEST
        // aftwer we apply the reveal secret, we are going to move currentBlock ahead and expire the transfer, this should
        // cause any blockchain events and further processing just moves one without failing
        // cause the lock to timeout

        assert.equals(blockchainQueue.length, 0)
        assertState(assert, engine.messageState['1'].state, 'awaitSecretToProof')

        engine.onBlock(currentBlock.add(new util.BN(1)))
        assert.equals(blockchainQueue.length, 1)
        assertState(assert, engine.messageState['1'].state, 'completedTransfer')

        assert.equals(mockBlockChain.cmdQueue[0], 'closeChannel', 'first command should be close channel')
        assertProof(assert, blockchainQueue[0][1], 1, channelAddress, 0,
          engine.channels[channelAddress.toString('hex')].peerState.proof.locksRoot, engine2.address)

        // now we have to manually execute withdrawLocks onchain
        engine.withdrawPeerOpenLocks(channelAddress, currentBlock)
        assert.equals(mockBlockChain.cmdQueue[1], 'withdrawPeerOpenLocks', 'next we withdraw open locks')

        assert.equals(blockchainQueue.length, 2, 'only a single lock proof is needed')
        // Assert the withdraw proof
        console.log(blockchainQueue[1])

        // arguments: channelAddress, encodedLock, merkleProof,secret,
        var proofArgs = blockchainQueue[1]
        var encodedLock = proofArgs[1]
        var secret = proofArgs[3]
        var hashLock = proofArgs[1].slice(64, 96)
        var proof = engine.channels[channelAddress.toString('hex')].peerState.proof
        assert.equals(util.sha3(secret).compare(hashLock), 0)
        assert.equals(merkletree.checkMerkleProof(proofArgs[2], proof.locksRoot, util.sha3(encodedLock)), true)
        assert.equals(engine.channels[channelAddress.toString('hex')].isOpen(), false)
        assert.equals(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
      })

      testEventBus.on('beforeReceiving-10', function (msg) {
        this.byPass = true
        assert.throws(function () {
          try {
            engine.onMessage(msg)
          } catch (err) {
            assert.equals(err.message, 'Invalid transfer: cannot update a closing channel')
            throw new Error()
          }
        }, 'applying message to closing channel throws error')
        assert.end()
      })

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        pkAddr[0].address,
        pkAddr[0].address,
        new util.BN(120),
        currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
        secretHashPair.secret,
        secretHashPair.hash
      )
    })
  })

  t.test('engine component test: can handle sending multiple medaited transfers without revealing secret to initiator', function (assert) {
    var acct1 = pkAddr[0].address
    var acct4 = pkAddr[1].address
    // var pk1 = pkAddr[0].pk
    // var pk4 = pkAddr[1].pk

    var blockchainQueue = []
    var sendQueue = []
    var currentBlock = new util.BN(0)
    var channelAddress = util.toBuffer('0x8bf6a4702d37b7055bc5495ac302fe77dae5243b')
    var engine = createEngine(0)
    var engine2 = createEngine(1)
    // SETUP AND DEPOSIT FOR ENGINES
    engine.send = function (msg) {
      sendQueue.push(message.SERIALIZE(msg))
    }

    engine2.send = function (msg) {
      sendQueue.push(message.SERIALIZE(msg))
    }

    var mockBlockChain = new MockBlockchain(blockchainQueue)
    engine.blockchain = mockBlockChain
    engine2.blockchain = mockBlockChain

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

    currentBlock = currentBlock.add(new util.BN(1))

    // START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)

    // to,target,amount,expiration,secret,hashLock
    var secretHashPair = message.GenerateRandomSecretHashPair()

    engine.sendMediatedTransfer(
      util.toBuffer(acct4),
      util.toBuffer(acct4),
      new util.BN(15),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
      secretHashPair.hash
    )

    var mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine2.onMessage(mediatedTransfer)

    var requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine.onMessage(requestSecret)
    var revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine2.onMessage(revealSecretInitiator)

    var revealSecretTarget = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    console.log(revealSecretTarget)
    engine.onMessage(revealSecretTarget)

    console.log(engine2.messageState)
    console.log(sendQueue)

    var secretToProof = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine2.onMessage(secretToProof)

    sendQueue = []

    secretHashPair = message.GenerateRandomSecretHashPair()

    engine2.sendMediatedTransfer(
      util.toBuffer(acct1),
      util.toBuffer(acct1),
      new util.BN(7),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
      secretHashPair.hash
    )

    mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine.onMessage(mediatedTransfer)

    requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine2.onMessage(requestSecret)
    revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine.onMessage(revealSecretInitiator)

    revealSecretTarget = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine2.onMessage(revealSecretTarget)

    secretToProof = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine.onMessage(secretToProof)

    // SEND new lock half open
    sendQueue = []

    secretHashPair = message.GenerateRandomSecretHashPair()

    engine2.sendMediatedTransfer(
      util.toBuffer(acct1),
      util.toBuffer(acct1),
      new util.BN(3),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
      secretHashPair.hash
    )

    mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine.onMessage(mediatedTransfer)

    requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine2.onMessage(requestSecret)
    revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine.onMessage(revealSecretInitiator)

    sendQueue = []

    secretHashPair = message.GenerateRandomSecretHashPair()

    engine2.sendMediatedTransfer(
      util.toBuffer(acct1),
      util.toBuffer(acct1),
      new util.BN(2),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
      secretHashPair.hash
    )

    mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine.onMessage(mediatedTransfer)

    requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine2.onMessage(requestSecret)
    revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine.onMessage(revealSecretInitiator)

    sendQueue = []

    secretHashPair = message.GenerateRandomSecretHashPair()

    engine2.sendMediatedTransfer(
      util.toBuffer(acct1),
      util.toBuffer(acct1),
      new util.BN(2),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
      secretHashPair.hash
    )

    mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine.onMessage(mediatedTransfer)

    requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine2.onMessage(requestSecret)
    revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine.onMessage(revealSecretInitiator)

    // ACTUAL TEST, make sure transferrable correct on both sides even if secret is not revealed to initiator
    var channelOne = engine.channels[channelAddress.toString('hex')]

    console.log(channelOne.transferrableFromTo(channelOne.peerState, channelOne.myState, currentBlock))
    assert.equals(channelOne.transferrableFromTo(channelOne.peerState, channelOne.myState, currentBlock).eq(new util.BN(1)), true)

    channelOne = engine2.channels[channelAddress.toString('hex')]

    console.log(channelOne.transferrableFromTo(channelOne.peerState, channelOne.myState, currentBlock))
    assert.equals(channelOne.transferrableFromTo(channelOne.myState, channelOne.peerState, currentBlock).eq(new util.BN(1)), true)
    assert.end()
  })

  t.test('should fail and revert channel state to open when close channel errors out', function (assert) {
    var sendQueue = []
    var blockchainQueue = []
    var currentBlock = new util.BN(0)

    var engine = createEngine(0)
    var engine2 = createEngine(1)

    // SETUP AND DEPOSIT FOR ENGINES
    engine.send = function (msg) {
      sendQueue.push(message.SERIALIZE(msg))
    }

    engine2.send = function (msg) {
      sendQueue.push(message.SERIALIZE(msg))
    }

    var mockBlockChain = new MockBlockchain(blockchainQueue)

    engine.blockchain = mockBlockChain
    engine2.blockchain = mockBlockChain

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
    assert.equals(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    // END SETUP

    currentBlock = currentBlock.add(new util.BN(1))

    // START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)

    assert.equals(sendQueue.length, 0, 'send direct transfer')

    // to,target,amount,expiration,secret,hashLock
    var secretHashPair = message.GenerateRandomSecretHashPair()

    engine.sendMediatedTransfer(
      pkAddr[1].address,
      pkAddr[1].address,
      new util.BN(50),
      currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
      secretHashPair.hash
    )

    assert.equals(sendQueue.length, 1, 'medited transfer in send queue')
    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    // console.log(mt.to.toString('hex') +":"+ pk_addr[1].address.toString('hex'));
    var mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

    engine2.onMessage(mediatedTransfer)
    assert.equals(sendQueue.length, 2, 'requestSecret in send queu')
    // console.log(engine.channelByPeer[pk_addr[1].address.toString('hex')]);

    assertChannelState(assert,
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(assert,
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0), currentBlock)

    var requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    engine.onMessage(requestSecret)
    assert.equals(sendQueue.length, 3, 'reveal secret in send queue from initiator -> target')
    var revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    assert.equals(revealSecretInitiator.from.compare(pkAddr[0].address), 0, 'reveal secret signed by initiator')

    engine2.onMessage(revealSecretInitiator)

    assert.equals(sendQueue.length, 4, 'reveal secret in send queue from target -> initiator')
    var revealSecretTarget = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    assert.equals(revealSecretTarget.from.compare(pkAddr[1].address), 0, 'reveal secret signed by initiator')
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

    assert.equals(sendQueue.length, 5, 'reveal secret in send queue from target -> initiator')
    var secretToProof = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
    assert.equals(secretToProof instanceof message.SecretToProof, true, 'secretToProof generated by initiator')
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

    assert.equals(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
    assert.equals(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
    mockBlockChain.closeChannel = function (channelAddress, proof, success, error) {
      assert.equals(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
      this.cmdQueue.push('closeChannel')
      var self = this
      var args = arguments
      return new Promise(function (resolve, reject) {
        self.blockchainQueue.push(args)
        setTimeout(function () {
          reject(channelAddress)
        }, 1000)
      })
    }

    // REVERT
    engine2.closeChannel(channelAddress).then(function () {
      assert.equals(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
    })

    assert.end()
  })

  // t.test('lock expires on engine handleBlock',function (assert) {
  //   var blockchainQueue = [];
  //   var currentBlock = new util.BN(0);

  //   var engine = createEngine(0);
  //   var engine2 = createEngine(1);

  //   engine.blockchain = function (msg)  {
  //     blockchainQueue.push(msg);
  //   }
  //   engine2.blockchain = function (msg)  {
  //     blockchainQueue.push(msg);
  //   }

  //   engine.onChannelNew(channelAddress,
  //     pk_addr[0].address,
  //     new util.BN(501),
  //     pk_addr[1].address,
  //     new util.BN(0));
  //   engine2.onChannelNew(channelAddress,
  //     pk_addr[0].address,
  //     new util.BN(501),
  //     pk_addr[1].address,
  //     new util.BN(0))

  //   engine.onChannelNewBalance(channelAddress,pk_addr[1].address, new util.BN(327));
  //   engine2.onChannelNewBalance(channelAddress,pk_addr[1].address, new util.BN(327));

  //   assertChannelState(assert,
  //     engine,channelAddress,
  //     new util.BN(0),new util.BN(501),new util.BN(0),new util.BN(0),new util.BN(0),
  //     new util.BN(0),new util.BN(327),new util.BN(0),new util.BN(0),new util.BN(0),currentBlock);
  //   assert.equals(engine.channelByPeer.hasOwnProperty(pk_addr[1].address.toString('hex')),true);
  //   assertChannelState(assert,
  //   engine2,channelAddress,
  //     new util.BN(0),new util.BN(327),new util.BN(0),new util.BN(0),new util.BN(0),
  //     new util.BN(0),new util.BN(501),new util.BN(0),new util.BN(0),new util.BN(0),currentBlock);

  //   //END SETUP
  //   var secretHashPair = message.GenerateRandomSecretHashPair();

  //   var testEventBus = new TestEventBus();
  //   testEventBus.addEngine(engine);
  //   testEventBus.addEngine(engine2);
  //   engine.sendMediatedTransfer(
  //     pk_addr[1].address,
  //     pk_addr[1].address,
  //     new util.BN(50),
  //     currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
  //     secretHashPair.secret,
  //     secretHashPair.hash,
  //     );

  //    testEventBus.on('afterReceiving-4',function (msg) {
  //     //we applied the revealSecret and secretToProof locally, now we are just waiting for other endpoint
  //     //to sync
  //     assertChannelState(assert,
  //     engine,channelAddress,
  //     new util.BN(2),new util.BN(501),new util.BN(50),new util.BN(0),new util.BN(0),
  //     new util.BN(0),new util.BN(327),new util.BN(0),new util.BN(0),new util.BN(0),currentBlock);

  //     assertChannelState(assert,
  //     engine2,channelAddress,
  //       new util.BN(0),new util.BN(327),new util.BN(0),new util.BN(0),new util.BN(0),
  //       new util.BN(1),new util.BN(501),new util.BN(0),new util.BN(0),new util.BN(50),currentBlock);
  //   });
  //   testEventBus.on('afterReceiving-5',function () {

  //     assertChannelState(assert,
  //     engine,channelAddress,
  //     new util.BN(2),new util.BN(501),new util.BN(50),new util.BN(0),new util.BN(0),
  //     new util.BN(0),new util.BN(327),new util.BN(0),new util.BN(0),new util.BN(0),currentBlock);

  //     assertChannelState(assert,
  //     engine2,channelAddress,
  //       new util.BN(0),new util.BN(327),new util.BN(0),new util.BN(0),new util.BN(0),
  //       new util.BN(2),new util.BN(501),new util.BN(50),new util.BN(0),new util.BN(0),currentBlock);

  //     var secretHashPair = message.GenerateRandomSecretHashPair();

  //     engine2.sendMediatedTransfer(
  //       pk_addr[0].address,
  //       pk_addr[0].address,
  //       new util.BN(120),
  //       currentBlock.add(new util.BN(channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
  //       secretHashPair.secret,
  //       secretHashPair.hash,
  //     );

  //     testEventBus.on('afterReceiving-10',function () {

  //       assertChannelState(assert,
  //     engine,channelAddress,
  //     new util.BN(2),new util.BN(501),new util.BN(50),new util.BN(0),new util.BN(0),
  //     new util.BN(2),new util.BN(327),new util.BN(120),new util.BN(0),new util.BN(0),currentBlock);

  //     assertChannelState(assert,
  //     engine2,channelAddress,
  //       new util.BN(2),new util.BN(327),new util.BN(120),new util.BN(0),new util.BN(0),
  //       new util.BN(2),new util.BN(501),new util.BN(50),new util.BN(0),new util.BN(0),currentBlock);

  //      var tt = engine.channels[channelAddress.toString('hex')];
  //     console.log("ENGINE1 transfferrable my->peer",tt.transferrableFromTo(tt.myState,tt.peerState).toString(10));
  //     console.log("ENGINE1 transfferrable peer->my",tt.transferrableFromTo(tt.peerState,tt.myState).toString(10));
  //     tt = engine2.channels[channelAddress.toString('hex')];
  //     console.log("ENGINE2 transfferrable my->peer",tt.transferrableFromTo(tt.myState,tt.peerState).toString(10));
  //     console.log("ENGINE2 transfferrable peer->my",tt.transferrableFromTo(tt.peerState,tt.myState).toString(10));

  //     testEventBus.on('afterReceiving-11',function (msg) {
  //       console.log(msg);

  //       assertChannelState(assert,
  //     engine,channelAddress,
  //     new util.BN(2),new util.BN(501),new util.BN(50),new util.BN(0),new util.BN(0),
  //     new util.BN(3),new util.BN(327),new util.BN(220),new util.BN(0),new util.BN(0),currentBlock);

  //     assertChannelState(assert,
  //     engine2,channelAddress,
  //       new util.BN(3),new util.BN(327),new util.BN(220),new util.BN(0),new util.BN(0),
  //       new util.BN(2),new util.BN(501),new util.BN(50),new util.BN(0),new util.BN(0),currentBlock);

  //     testEventBus.on('afterReceiving-12',function (msg) {
  //       console.log(msg);

  //       assertChannelState(assert,
  //     engine,channelAddress,
  //     new util.BN(3),new util.BN(501),new util.BN(671),new util.BN(0),new util.BN(0),
  //     new util.BN(3),new util.BN(327),new util.BN(220),new util.BN(0),new util.BN(0),currentBlock);

  //     assertChannelState(assert,
  //     engine2,channelAddress,
  //       new util.BN(3),new util.BN(327),new util.BN(220),new util.BN(0),new util.BN(0),
  //       new util.BN(3),new util.BN(501),new util.BN(671),new util.BN(0),new util.BN(0),currentBlock);

  //       var tt = engine.channels[channelAddress.toString('hex')];
  //     console.log("ENGINE1 transfferrable my->peer",tt.transferrableFromTo(tt.myState,tt.peerState).toString(10));
  //     console.log("ENGINE1 transfferrable peer->my",tt.transferrableFromTo(tt.peerState,tt.myState).toString(10));
  //     tt = engine2.channels[channelAddress.toString('hex')];
  //     console.log("ENGINE2 transfferrable my->peer",tt.transferrableFromTo(tt.myState,tt.peerState).toString(10));
  //     console.log("ENGINE2 transfferrable peer->my",tt.transferrableFromTo(tt.peerState,tt.myState).toString(10));

  //     assert.throws(function(){
  //       try{
  //         engine.sendDirectTransfer(pk_addr[1].address, new util.BN(722));
  //       }catch(err){
  //         assert.equals(err.message, "Insufficient funds: direct transfer cannot be completed:722 - 671 > 50")
  //         throw new Error();
  //       }
  //     });

  //     });
  //     engine.sendDirectTransfer(pk_addr[1].address, new util.BN(671));

  //     });
  //     engine2.sendDirectTransfer(pk_addr[0].address, new util.BN(100+120));

  //     });

  //   });
  //   assert.end();
  // })
})
