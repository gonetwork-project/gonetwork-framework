/*
* @Author: amitshah
* @Date:   2018-04-18 19:55:20
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-26 03:48:58
*/

const events = require('events');
const util = require("ethereumjs-util");

const stateChannel= require('../../src/state-channel/index.js');

const message = stateChannel.message;
const channel = stateChannel.channel;


var pk1=util.toBuffer("0xb507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42");
var pk2 =util.toBuffer("0x4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78");
var pk3=util.toBuffer("0xa8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d");
var pk4=util.toBuffer("0x157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224");

 var acct1 = "0xf0c3043550e5259dc1c838d0ea600364d999ea15";
    var acct2 = "0xb0ae572146ab8b5990e069bff487ac25635dabe8";
    var acct3 = "0xff8a018d100ace078d214f02be8df9c6944e7a2b";
    var acct4 = "0xf77e9ef93380c70c938ca2e859baa88be650d87d";


function createEngine(address,privateKey,blockchainService){
    var e =  new stateChannel.Engine(address, function (msg) {
      console.log("SIGNING MESSAGE");
      msg.sign(privateKey)
    },blockchainService);
    return e;
}

var channelAddress = util.toBuffer("0x8bf6a4702d37b7055bc5495ac302fe77dae5243b");

var engine2 = createEngine(util.toBuffer(acct1),pk1);
 
engine2.onChannelNew(channelAddress,
      util.toBuffer(acct1),
      util.toBuffer(acct4),
      channel.SETTLE_TIMEOUT);

engine2.onChannelNewBalance(channelAddress,util.toBuffer(acct1), new util.BN(27000));
   
//END SETUP


//START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)
var cl = console.log;

start = Date.now();
var transferredAmount = new util.BN(1);

var mqtt = require('mqtt')
var client2  = mqtt.connect('mqtt://test.mosquitto.org')
 
client2.on('connect', function () {
  client2.subscribe(acct1)
})

var count=0;
var totalCount = 0;
start = Date.now();
end = Date.now();
var currentBlock = new util.BN(1);

engine2.send = function(msg){
  
  client2.publish(acct4,message.SERIALIZE(msg));
  if(msg instanceof message.SecretToProof && count < 20){
    console.log(msg);
    var secretHashPair = message.GenerateRandomSecretHashPair();
    console.log("hashlock:"+secretHashPair.hash.toString('hex'));

    engine2.sendMediatedTransfer(
      util.toBuffer(acct4),
      util.toBuffer(acct4),
      new util.BN(1),
      currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
      secretHashPair.secret,
      secretHashPair.hash,
      );
    count++;
  }
}

console.log(engine2.channels[channelAddress.toString('hex')].peerState.proof);
client2.on('message', function (topic, msg) {
  // message is Buffer
  //count++;
  
  // //else if(count === 10){
  //   var proof = engine2.channels[channelAddress.toString('hex')].issueClose();
  //   console.log(proof);
    //end = Date.now();
    // cl("Direct Transfers Processed Per SECOND per USER "+ 1000/((end - start)/1000));
  //}
  //console.log(msg);


    var m = message.DESERIALIZE_AND_DECODE_MESSAGE(msg);
    engine2.onMessage(m);


  
  
});
for(var i=0; i < 1; i++){
var secretHashPair = message.GenerateRandomSecretHashPair();
console.log("hashlock:"+secretHashPair.hash.toString('hex'));

  engine2.sendMediatedTransfer(
  util.toBuffer(acct4),
  util.toBuffer(acct4),
  new util.BN(1),
  currentBlock.add(new util.BN(stateChannel.channel.REVEAL_TIMEOUT)).add(new util.BN(1)),
  secretHashPair.secret,
  secretHashPair.hash,
  );
}
