/*
* @Author: amitshah
* @Date:   2018-04-20 16:13:14
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-20 16:55:45
*/

const stateChannel= require('state-channel');
const events = require('events');
const util = require("ethereumjs-util");
const message = stateChannel.message;

class TestEventBus extends events.EventEmitter{
  constructor(){
    super();
    this.engine = {};
    this.on('send',this.onReceive);
    this.msgCount=0;
    this.byPass = false;
  }

  addEngine(engine){
    this.engine[engine.address.toString('hex')] = engine;

    var self = this;
    engine.send = function (msg) {
      console.log("SENDING:"+msg.from.toString('hex')+"->"+msg.to.toString('hex')+" of type:"+msg.classType);
      var emitter = self;
      setTimeout(function(){
        emitter.emit('beforeSending-'+emitter.msgCount,msg);
        if(!this.byPass){
          emitter.emit('send',message.SERIALIZE(msg));
        }
        emitter.emit('afterSending-'+emitter.msgCount, msg)
      }, 100);
    }

  }



  onReceive(packet){
    this.msgCount++;
    var msg = message.DESERIALIZE_AND_DECODE_MESSAGE(packet);
    this.emit('beforeReceiving-'+this.msgCount,msg);
    if(!this.byPass){
      this.engine[msg.to.toString('hex')].onMessage(msg);
    }
    this.emit('afterReceiving-'+this.msgCount,msg);

  }


}


function createEngine(address,privateKey,blockchainService){
    var e =  new stateChannel.Engine(address, function (msg) {
      console.log("SIGNING MESSAGE");
      msg.sign(privateKey)
    },blockchainService);
    return e;
}

function simulate(blockchainQueue,channelAddressHexString,acct1,pk1,acct4,pk4,currentBlock){
var backup = console.log;
console.log = function () {

}


//var blockchainQueue = [];
var sendQueue = [];

currentBlock = currentBlock || new util.BN(55);

var channelAddress = util.toBuffer(channelAddressHexString);
//var channelAddress = util.toBuffer("0x8bf6a4702d37b7055bc5495ac302fe77dae5243b");
var engine = createEngine(util.toBuffer(acct1),pk1);
var engine2 = createEngine(util.toBuffer(acct4),pk4);
 //SETUP AND DEPOSIT FOR ENGINES
engine.send = function  (msg) {
 sendQueue.push(message.SERIALIZE(msg));
}

engine2.send = function  (msg) {
 sendQueue.push(message.SERIALIZE(msg));
}

engine.blockchain = function (msg)  {

  blockchainQueue.push(msg);
}
engine2.blockchain = function (msg)  {
  blockchainQueue.push(msg);
}

engine.onNewChannel(channelAddress,
 util.toBuffer(acct1),
  new util.BN(0),
  util.toBuffer(acct4),
  new util.BN(0));
engine2.onNewChannel(channelAddress,
  util.toBuffer(acct1),
  new util.BN(0),
  util.toBuffer(acct4),
  new util.BN(0))



engine.onDeposited(channelAddress,util.toBuffer(acct1), new util.BN(27));
engine2.onDeposited(channelAddress,util.toBuffer(acct1), new util.BN(27));

//END SETUP


currentBlock = currentBlock.add(new util.BN(1));

//START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)

//to,target,amount,expiration,secret,hashLock
var secretHashPair = message.GenerateRandomSecretHashPair();

engine.sendMediatedTransfer(
  util.toBuffer(acct4),
  util.toBuffer(acct4),
  new util.BN(15),
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
  secretHashPair.secret,
  secretHashPair.hash,
  );

var mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);


engine2.onMessage(mediatedTransfer);


var requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1]);
engine.onMessage(requestSecret);
var revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

engine2.onMessage(revealSecretInitiator);

var revealSecretTarget = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
console.log(revealSecretTarget);
engine.onMessage(revealSecretTarget);


console.log(engine2.messageState);
console.log(sendQueue);

 var secretToProof = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
 engine2.onMessage(secretToProof);

sendQueue = [];

secretHashPair = message.GenerateRandomSecretHashPair();

engine2.sendMediatedTransfer(
  util.toBuffer(acct1),
  util.toBuffer(acct1),
  new util.BN(7),
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
  secretHashPair.secret,
  secretHashPair.hash,
  );


mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);


engine.onMessage(mediatedTransfer);


requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1]);
engine2.onMessage(requestSecret);
revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

engine.onMessage(revealSecretInitiator);

revealSecretTarget = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
engine2.onMessage(revealSecretTarget);



secretToProof = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
 engine.onMessage(secretToProof);



//SEND new lock half open
sendQueue = [];

secretHashPair = message.GenerateRandomSecretHashPair();

engine2.sendMediatedTransfer(
  util.toBuffer(acct1),
  util.toBuffer(acct1),
  new util.BN(3),
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
  secretHashPair.secret,
  secretHashPair.hash,
  );


mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);


engine.onMessage(mediatedTransfer);


requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1]);
engine2.onMessage(requestSecret);
revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

engine.onMessage(revealSecretInitiator);

sendQueue = [];

secretHashPair = message.GenerateRandomSecretHashPair();

engine2.sendMediatedTransfer(
  util.toBuffer(acct1),
  util.toBuffer(acct1),
  new util.BN(2),
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
  secretHashPair.secret,
  secretHashPair.hash,
  );


mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
engine.onMessage(mediatedTransfer);


requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1]);
engine2.onMessage(requestSecret);
revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

engine.onMessage(revealSecretInitiator);

sendQueue = [];

secretHashPair = message.GenerateRandomSecretHashPair();

engine2.sendMediatedTransfer(
  util.toBuffer(acct1),
  util.toBuffer(acct1),
  new util.BN(2),
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
  secretHashPair.secret,
  secretHashPair.hash,
  );


mediatedTransfer = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);
engine.onMessage(mediatedTransfer);


requestSecret = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length - 1]);
engine2.onMessage(requestSecret);
revealSecretInitiator = message.DESERIALIZE_AND_DECODE_MESSAGE(sendQueue[sendQueue.length -1]);

engine.onMessage(revealSecretInitiator);


engine2.closeChannel(channelAddress);

engine.onClosed(channelAddress,16);

console.log = backup;
}

module.exports={
  simulate
}