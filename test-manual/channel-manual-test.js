const util = require('ethereumjs-util')

const stateChannel = require('../lib/state-channel')
const bcs = require('../lib/blockchain/blockchain.js')
const message = stateChannel.message

var pk1 = util.toBuffer('0xb507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42')
// var pk2 = util.toBuffer('0x4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78')
// var pk3 = util.toBuffer('0xa8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d')
var pk4 = util.toBuffer('0x157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224')

var acct1 = '0xf0c3043550e5259dc1c838d0ea600364d999ea15'
// var acct2 = '0xb0ae572146ab8b5990e069bff487ac25635dabe8'
// var acct3 = '0xff8a018d100ace078d214f02be8df9c6944e7a2b'
var acct4 = '0xf77e9ef93380c70c938ca2e859baa88be650d87d'

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

function createEngine (address, privateKey, blockchainService) {
  var e = new stateChannel.Engine(address, function (msg) {
    console.log('SIGNING MESSAGE')
    msg.sign(privateKey)
  }, blockchainService)
  return e
}

var blockchainQueue = []
var mockBC = new MockBlockchain(blockchainQueue)
var sendQueue = []
var currentBlock = new util.BN(55)
var channelAddress = util.toBuffer('0x8bf6a4702d37b7055bc5495ac302fe77dae5243b')
var engine = createEngine(util.toBuffer(acct1), pk1, mockBC)
var engine2 = createEngine(util.toBuffer(acct4), pk4, mockBC)
// SETUP AND DEPOSIT FOR ENGINES
engine.send = function (msg) {
  sendQueue.push(message.SERIALIZE(msg))
}

engine2.send = function (msg) {
  sendQueue.push(message.SERIALIZE(msg))
}

engine.onChannelNew(util.toBuffer(channelAddress),
  util.toBuffer(acct1),
  util.toBuffer(acct4),
  new util.BN(40))
engine2.onChannelNew(util.toBuffer(channelAddress),
  util.toBuffer(acct1),
  util.toBuffer(acct4),
  new util.BN(40))

engine.onChannelNewBalance(util.toBuffer(channelAddress), util.toBuffer(acct1), new util.BN(27))
engine2.onChannelNewBalance(util.toBuffer(channelAddress), util.toBuffer(acct1), new util.BN(27))
// END SETUP

currentBlock = currentBlock.add(new util.BN(1))

// START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)

// to,target,amount,expiration,secret,hashLock
var secretHashPair = message.GenerateRandomSecretHashPair()

engine.sendMediatedTransfer(
  util.toBuffer(acct4),
  util.toBuffer(acct4),
  new util.BN(15),
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
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
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
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
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
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
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
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
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
  secretHashPair.secret,
  secretHashPair.hash
)

mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
engine.onMessage(mediatedTransfer)

requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])
engine2.onMessage(requestSecret)
revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

engine.onMessage(revealSecretInitiator)

engine2.closeChannel(util.toBuffer(channelAddress))

engine.onChannelClose(util.toBuffer(channelAddress), util.toBuffer(acct4))
engine2.onChannelClose(util.toBuffer(channelAddress), util.toBuffer(acct4))

engine.onTransferUpdated(util.toBuffer(channelAddress), util.toBuffer(acct1))

// blockchainQueue = [];
engine.withdrawPeerOpenLocks(util.toBuffer(channelAddress)).then(function () {
  createWeb3Requests()
})

function createWeb3Requests () {
  var bc = new bcs.BlockchainService(0, function (cb) {
    cb(pk1)
  })

  var bc4 = new bcs.BlockchainService(0, function (cb) {
    cb(pk4)
  })

  var tx = bc.newChannel(8, 1, '0x05e1b1806579881cfd417e1716f23b1900568346', acct4, 150).then(console.log)
  // console.log(tx);

  // console.log("web3.eth.sendRawTransaction(\"0x" + tx.serialize().toString('hex') + "\",function(err,txHash){ console.log(err);})");

  tx = bc.approve(9, 1, '0x9c1af2395beb97375eaee816e355863ec925bc2e', '0x8bf6a4702d37b7055bc5495ac302fe77dae5243b', 500)
  console.log('web3.eth.sendRawTransaction("0x' + tx.serialize().toString('hex') + '",function(err,txHash){ console.log(err);})')

  tx = bc.deposit(10, 1, '0x8bf6a4702d37b7055bc5495ac302fe77dae5243b', 27)
  console.log('web3.eth.sendRawTransaction("0x' + tx.serialize().toString('hex') + '",function(err,txHash){ console.log(err);})')

  var proof = blockchainQueue[0][1]

  // console.log("MESSAGE HASH:"+proof.messageHash.toString('hex'));

  // TESTED ONLY acct4 can submit proof as its signed by acct1, tested, and self signed proofs are not accepted :)

  tx = bc4.close(0, 1, '0x8bf6a4702d37b7055bc5495ac302fe77dae5243b', proof)
  console.log('web3.eth.sendRawTransaction("0x' + tx.serialize().toString('hex') + '",function(err,txHash){ console.log(err);})')

  var proof2 = blockchainQueue[2][1]
  tx = bc.updateTransfer(11, 1, util.addHexPrefix(channelAddress.toString('hex')), proof2)
  console.log('web3.eth.sendRawTransaction("0x' + tx.serialize().toString('hex') + '",function(err,txHash){ console.log(err);})')

  var k = 0
  for (var i = 0; i < blockchainQueue[3][1].length; i++) {
    var withdrawProof = blockchainQueue[3][1][i]
    var encodedLock = withdrawProof[2].slice(0, 96)
    var secret = withdrawProof[2].slice(96, 128)

    if (util.sha3(secret).compare(withdrawProof[0].hashLock) === 0 && stateChannel.merkletree.checkMerkleProof(withdrawProof[1], proof2.locksRoot, util.sha3(encodedLock)) === true) {
      k++
      // console.info("lock #"+k+" processing encoded lock:" +encodedLock.toString('hex'));
      // withdrawProof array index (Lock object, merkleProof: Bytes<32>[], Bytes<96> encodedLock)
      tx = bc.withdrawLock(11 + k, 1, channelAddress, withdrawProof[2], withdrawProof[1], secret)
      console.log('web3.eth.sendRawTransaction("0x' + tx.serialize().toString('hex') + '",function(err,txHash){ console.log(err);})')
    } else {
      console.error('ERROR PROCESSING LOCK:' + k)
    }
  }

  // RUN IN TESTRPC to move blocks ahead

  console.log('for(var i =0; i < 150; i++){')
  console.log('web3.eth.sendTransaction({from:web3.eth.accounts[1],to:web3.eth.accounts[2],value:10})')
  console.log('}')

  tx = bc.settle(15, 1, '0x8bf6a4702d37b7055bc5495ac302fe77dae5243b')
  console.log('web3.eth.sendRawTransaction("0x' + tx.serialize().toString('hex') + '",function(err,txHash){ console.log(err);})')

  const NettingChannelContract = require('../smart-contracts/build/contracts/NettingChannelContract.json')
  console.info(JSON.stringify(NettingChannelContract.abi))

  console.info('Proof2 expected locksroot:' + proof2.locksRoot.toString('hex'))
}

// debugger;

  // class TestEventBus extends events.EventEmitter {
  //   constructor () {
  //     super()
  //     this.engine = {}
  //     this.on('send', this.onReceive)
  //     this.msgCount = 0
  //     this.byPass = false
  //   }

  //   addEngine (engine) {
  //     this.engine[engine.address.toString('hex')] = engine

  //     var self = this
  //     engine.send = function (msg) {
  //       console.log('SENDING:' + msg.from.toString('hex') + '->' + msg.to.toString('hex') + ' of type:' + msg.classType)
  //       var emitter = self
  //       setTimeout(function () {
  //         emitter.emit('beforeSending-' + emitter.msgCount, msg)
  //         if (!this.byPass) {
  //           emitter.emit('send', message.SERIALIZE(msg))
  //         }
  //         emitter.emit('afterSending-' + emitter.msgCount, msg)
  //       }, 100)
  //     }
  //   }

  //   onReceive (packet) {
  //     this.msgCount++
  //     var msg = message.DESERIALIZE_AND_DECODE_MESSAGE(packet)
  //     this.emit('beforeReceiving-' + this.msgCount, msg)
  //     if (!this.byPass) {
  //       this.engine[msg.to.toString('hex')].onMessage(msg)
  //     }
  //     this.emit('afterReceiving-' + this.msgCount, msg)
  //   }
  // }
