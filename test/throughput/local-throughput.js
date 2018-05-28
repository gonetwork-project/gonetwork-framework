const util = require('ethereumjs-util')

const stateChannel = require('../../src/state-channel/index.js')

const message = stateChannel.message
const channel = stateChannel.channel

var pk1 = util.toBuffer('0xb507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42')
// var pk2 = util.toBuffer('0x4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78')
// var pk3 = util.toBuffer('0xa8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d')
var pk4 = util.toBuffer('0x157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224')

var acct1 = '0xf0c3043550e5259dc1c838d0ea600364d999ea15'
// var acct2 = '0xb0ae572146ab8b5990e069bff487ac25635dabe8'
// var acct3 = '0xff8a018d100ace078d214f02be8df9c6944e7a2b'
var acct4 = '0xf77e9ef93380c70c938ca2e859baa88be650d87d'

function createEngine (address, privateKey, blockchainService) {
  var e = new stateChannel.Engine(address, function (msg) {
    console.log('SIGNING MESSAGE')
    msg.sign(privateKey)
  }, blockchainService)
  return e
}

var blockchainQueue = []
var sendQueue = []
var currentBlock = new util.BN(55)
var channelAddress = util.toBuffer('0x8bf6a4702d37b7055bc5495ac302fe77dae5243b')
var engine = createEngine(util.toBuffer(acct1), pk1)
var engine2 = createEngine(util.toBuffer(acct4), pk4)
// SETUP AND DEPOSIT FOR ENGINES
engine.send = function (msg) {
  sendQueue.push(message.SERIALIZE(msg))
}

engine2.send = function (msg) {
  sendQueue.push(message.SERIALIZE(msg))
}

engine.blockchain = function (msg) {
  blockchainQueue.push(msg)
}
engine2.blockchain = function (msg) {
  blockchainQueue.push(msg)
}

engine.onChannelNew(channelAddress,
  util.toBuffer(acct1),
  util.toBuffer(acct4),
  channel.SETTLE_TIMEOUT)

engine2.onChannelNew(channelAddress,
  util.toBuffer(acct1),
  util.toBuffer(acct4),
  channel.SETTLE_TIMEOUT)

engine.onChannelNewBalance(channelAddress, util.toBuffer(acct1), new util.BN(27000))
engine2.onChannelNewBalance(channelAddress, util.toBuffer(acct1), new util.BN(27000))

// END SETUP

currentBlock = currentBlock.add(new util.BN(1))

// START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)
var cl = console.log

let start = Date.now()
var transferredAmount = new util.BN(1)
for (var i = 0; i < 1000; i++) {
  sendQueue = []
  // to,target,amount,expiration,secret,hashLock
  var secretHashPair = message.GenerateRandomSecretHashPair()
  transferredAmount = transferredAmount.add(new util.BN(1))
  engine.sendDirectTransfer(util.toBuffer(acct4), transferredAmount)
  var directTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1])

  engine2.onMessage(directTransfer)
}
let end = Date.now()
sendQueue = []

cl('Direct Transfers per SECOND per USER ' + 1000 / ((end - start) / 1000))
start = Date.now()
console.log = function () { }
for (let i = 0; i < 1000; i++) {
  sendQueue = []
  // to,target,amount,expiration,secret,hashLock
  secretHashPair = message.GenerateRandomSecretHashPair()

  engine.sendMediatedTransfer(
    util.toBuffer(acct4),
    util.toBuffer(acct4),
    new util.BN(1),
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
}
end = Date.now()
cl('Locked Transfers per SECOND per USER ' + 1000 / ((end - start) / 1000))

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

// }

// sendQueue = [];

// secretHashPair = message.GenerateRandomSecretHashPair();

// engine2.sendMediatedTransfer(
//   util.toBuffer(acct1),
//   util.toBuffer(acct1),
//   new util.BN(7),
//   currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
//   secretHashPair.secret,
//   secretHashPair.hash,
//   );

// mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

// engine.onMessage(mediatedTransfer);

// requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1]);
// engine2.onMessage(requestSecret);
// revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

// engine.onMessage(revealSecretInitiator);

// revealSecretTarget = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
// engine2.onMessage(revealSecretTarget);

// secretToProof = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
//  engine.onMessage(secretToProof);

// //SEND new lock half open
// sendQueue = [];

// secretHashPair = message.GenerateRandomSecretHashPair();

// engine2.sendMediatedTransfer(
//   util.toBuffer(acct1),
//   util.toBuffer(acct1),
//   new util.BN(3),
//   currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
//   secretHashPair.secret,
//   secretHashPair.hash,
//   );

// mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

// engine.onMessage(mediatedTransfer);

// requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1]);
// engine2.onMessage(requestSecret);
// revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

// engine.onMessage(revealSecretInitiator);

// sendQueue = [];

// secretHashPair = message.GenerateRandomSecretHashPair();

// engine2.sendMediatedTransfer(
//   util.toBuffer(acct1),
//   util.toBuffer(acct1),
//   new util.BN(2),
//   currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
//   secretHashPair.secret,
//   secretHashPair.hash,
//   );

// mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
// engine.onMessage(mediatedTransfer);

// requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1]);
// engine2.onMessage(requestSecret);
// revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

// engine.onMessage(revealSecretInitiator);

// sendQueue = [];

// secretHashPair = message.GenerateRandomSecretHashPair();

// engine2.sendMediatedTransfer(
//   util.toBuffer(acct1),
//   util.toBuffer(acct1),
//   new util.BN(2),
//   currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
//   secretHashPair.secret,
//   secretHashPair.hash,
//   );

// mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
// engine.onMessage(mediatedTransfer);

// requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1]);
// engine2.onMessage(requestSecret);
// revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

// engine.onMessage(revealSecretInitiator);

// engine2.closeChannel(channelAddress);

// engine.onClosed(channelAddress,16);
