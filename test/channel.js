/*
* @Author: amitshah
* @Date:   2018-04-16 18:03:32
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-25 16:53:19
*/
var test = require('tape');
const util = require('ethereumjs-util');

var merkleTree = require('../src/state-channel/merkletree');
var channelState = require('../src/state-channel/channel-state');
var channelLib = require('../src/state-channel/channel');
const message =require('../src/state-channel/message');


var privateKey =  util.toBuffer('0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109');
var publicKey =util.privateToPublic(privateKey);
var address = util.pubToAddress(publicKey);

var pk_addr = [{pk:util.toBuffer('0xa63c8dec79b2c168b8b76f131df6b14a5e0a1ab0310e0ba652f39bca158884ba'),
address: util.toBuffer('0x6877cf5f9af67d622d6c665ea473e0b1a14f99d0')},
{pk:util.toBuffer('0x6f1cc905d0a87054c15f183eae89ccc8dc3a79702fdbb47ae337583d22df1a51'),
address: util.toBuffer('0x43068d574694419cb76360de33fbd177ecd9d3c6')
},
{pk:util.toBuffer('0x8dffbd99f8a386c18922a014b5356344a4ac1dbcfe32ee285c3b23239caad10d'),
address: util.toBuffer('0xe2b7c4c2e89438c2889dcf4f5ea935044b2ba2b0')
}];


function assertStateBN(assert,state,nonce,depositBalance,transferredAmount,lockedAmount,unlockedAmount,currentBlock){
  assert.equals(state.nonce.eq(new util.BN(nonce)),true, "correect nonce in state");
  assert.equals(state.proof.transferredAmount.eq(new util.BN(transferredAmount)),true, "correct transferredAmount in state");
  if(!currentBlock){
    currentBlock = new util.BN(0);
  }
  assert.equals(state.lockedAmount(currentBlock).eq(new util.BN(lockedAmount)),true, "correct lockedAmount calculated in state");
  assert.equals(state.unlockedAmount().eq(new util.BN(unlockedAmount)),true, "correct unlockedAmount calculated in state");
  assert.equals(state.depositBalance.eq(new util.BN(depositBalance)),true, "correct depositBalance in state");
}

function assertStateProof(assert,state,nonce,transferredAmount,hashLockRoot,channelAddress){
  assert.equals(state.proof.nonce.eq(new util.BN(nonce)),true);
  assert.equals(state.proof.transferredAmount.eq(new util.BN(transferredAmount)),true);
  assert.equals(state.proof.hashLockRoot.compare(util.toBuffer(hashLockRoot)),0);
  assert.equals(state.proof.channelAddress.compare(util.toBuffer(channelAddress)),0);
}

function assertSignature(assert,state,r,s,v){
  assert.equals(state.proof.signature.r.compare(util.toBuffer(r)),0);
  assert.equals(state.proof.signature.s.compare(util.toBuffer(s)),0);
  assert.equals(state.proof.signature.v.compare(v),0);
}


function createTestLock(amount,expiration,secret){

  return new message.Lock({
    amount:new util.BN(amount),
    expiration:new util.BN(expiration),
    hashLock:util.sha3(secret)
  })
}

function createMediatedTransfer(msgID,nonce,transferredAmount,channelAddress,locksRoot,to,target,initiator,lock,expiration){
  return new message.MediatedTransfer({msgID:new util.BN(msgID),nonce:new util.BN(nonce),
    transferredAmount:new util.BN(transferredAmount),
    channelAddress:util.toBuffer(channelAddress),locksRoot:util.toBuffer(locksRoot),
    to:util.toBuffer(to),target:util.toBuffer(target),initiator:util.toBuffer(initiator),
    lock:lock,
    expiration:expiration});

}

function createRevealSecret(to,secret){
  return new message.RevealSecret({secret:util.toBuffer(secret),to:to});
}

function createSecretToProof (msgID,nonce,transferredAmount,channelAddress,locksRoot,to,secret) {
  return new message.SecretToProof({
    msgID:new util.BN(msgID),
    nonce:new util.BN(nonce),
    transferredAmount:new util.BN(transferredAmount),
    channelAddress:util.toBuffer(channelAddress),
    locksRoot:util.toBuffer(locksRoot), // locksRoot - sha3(secret)
    to:util.toBuffer(to),
    secret:util.toBuffer(secret)
  });
}

function createDirectTransfer (msgID,nonce,transferredAmount,channelAddress,locksRoot,to) {
  return new message.DirectTransfer({
    msgID:new util.BN(msgID),
    nonce:new util.BN(nonce),
    transferredAmount:new util.BN(transferredAmount),
    channelAddress:util.toBuffer(channelAddress),
    locksRoot:util.toBuffer(locksRoot), // locksRoot - sha3(secret)
    to:util.toBuffer(to)
  });
}

function computeMerkleTree(lockElements){
  var mt = new merkleTree.MerkleTree(lockElements.map(
        function (l) {
        return l.getMessageHash();
      }));
  mt.generateHashTree();
  return mt;
}

function assertProof(assert,transfer,nonce,channelAddress,transferredAmount,locksRoot,from){
  assert.equals(transfer.nonce.eq(message.TO_BN(nonce)),true,"correct nonce in transfer");
  assert.equals(transfer.transferredAmount.eq(new util.BN(transferredAmount)),true, "correct transferredAmount in transfer");
  assert.equals(transfer.channelAddress.compare(util.toBuffer(channelAddress)),0,"correct channelAddress in transfer");
  assert.equals(transfer.locksRoot.compare(util.toBuffer(locksRoot)),0, "correct locksRoot in transfer");
  if(from){
      assert.equals(transfer.from.compare(from),0, "correct from recovery in transfer");
  }
}

function assertDirectTransfer(assert,directTransfer,from,nonce,channelAddress,transferredAmount,locksRoot,to){
  assertProof(assert,directTransfer.toProof(),nonce,channelAddress,transferredAmount,locksRoot,from);
  assert.equals(directTransfer.to.compare(to),0, "correct to set in directTransfer");
}

function assertChannel(assert,channel,transferrableAtoB,transferrableBtoA,nonceA,nonceB,currentBlock){
  assert.equals(channel.transferrableFromTo(channel.myState,channel.peerState).eq(message.TO_BN(transferrableAtoB)),true);
  assert.equals(channel.transferrableFromTo(channel.peerState,channel.myState).eq(message.TO_BN(transferrableBtoA)),true);
  assert.equals(channel.myState.nonce.eq(message.TO_BN(nonceA)),true);
  assert.equals(channel.peerState.nonce.eq(message.TO_BN(nonceB)),true);

}

function assertMediatedTransfer(assert,transfer,from,nonce,channelAddress,transferredAmount,locksRoot,to,target,initiator){
  assertProof(assert,transfer.toProof(),nonce,channelAddress,transferredAmount,locksRoot,from);
  assert.equals(transfer.initiator.compare(initiator),0);
  assert.equals(transfer.to.compare(to),0, "correct to set in mediatedtransfer");
  assert.equals(transfer.target.compare(target),0,"correct target set in mediatedtransfer");
}


function printProof(myState){

    console.log("R:"+myState.proof.signature.r.toString('hex'));
    console.log("S:"+myState.proof.signature.s.toString('hex'));
    console.log("V:"+myState.proof.signature.v);
    console.log("SEND TO SOLIDITY APPEND HASH:"+myState.proof.nonce.toString(10) + "," +
      myState.proof.transferredAmount.toString(10)+ "," +
      "\""+util.addHexPrefix(myState.proof.channelAddress.toString('hex'))+ "\"," +
      "\""+util.addHexPrefix(myState.proof.locksRoot.toString('hex'))+ "\"," +
      "\""+util.addHexPrefix(myState.proof.messageHash.toString('hex'))+ "\""
      )
    console.log("OUR HASH:"+myState.proof.getHash().toString('hex'));
}
test('test channel', function(t){

  function setup(assert){
      myState = new channelState.ChannelState({depositBalance:new util.BN(123),
      address:pk_addr[0].address
    });

    peerState = new channelState.ChannelState({depositBalance:new util.BN(200),
        address:pk_addr[1].address
      });

      //constructor(peerState,myState,channelAddress,settleTimeout,revealTimeout,currentBlock){
    channel = new channelLib.Channel(peerState,myState,address,
        10);

    peerChannel = new channelLib.Channel(myState,peerState,address,
        10);

    locks=[{secret:util.toBuffer("SECRET1"),amount:10,expiration:20}, //normal
    {secret:util.toBuffer("SECRET2"),amount:20,expiration:40},//normal
    {secret:util.toBuffer("SECRET3"),amount:30,expiration:20},//normal
    {secret:util.toBuffer("SECRET4"),amount:10,expiration:1}, //ok balance bad expiration
    {secret:util.toBuffer("SECRET5"),amount:1231231230,expiration:10},//more than balance ok expiration
    {secret:util.toBuffer("SECRET6"),amount:1231231230,expiration:1}];//more then balance bad expiration

    testLocks = locks.map(function(lock){ return createTestLock(lock.amount,
      lock.expiration,
      lock.secret)});

    //ENSURE everything was setup properly
    assert.equals(channel.openedBlock.eq(new util.BN(10)),true);
    assert.equals(myState.address.compare(pk_addr[0].address),0);
    assertStateBN(assert,myState,0,123,0,0,0);
    assert.equals(peerState.address.compare(pk_addr[1].address),0);
    assertStateBN(assert,peerState,0,200,0,0,0);
    assertChannel(assert,channel,123,200,0,0);

  };
  function teardown(){
    myState = null;
    peerState = null;
    channel = null;
    locks = null;
    testLocks = null;
  };

  t.test('test transferrableFromTo',function (assert) {
    setup(assert);

    var transferrable = channel.transferrableFromTo(channel.myState,channel.peerState,new util.BN(1000));
    assert.equals(transferrable.eq(new util.BN(123)),true,'correct transferrable amount from mystate');
    transferrable = channel.transferrableFromTo(channel.peerState,channel.myState,new util.BN(1000));
    assert.equals(transferrable.eq(new util.BN(200)),true,'correct transferrable amount from peerstate');
    assert.end();
    teardown();
  })

  t.test('channel component test: direct transfer create and handle',function  (assert) {
    setup(assert);

    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    var directTransfer = channel.createDirectTransfer(msgID,transferredAmount);
    //ensure the state wasnt updated when transfer was created
    assertStateBN(assert,myState,0,123,0,0,0);
    assertStateBN(assert,peerState,0,200,0,0,0);

    assert.throws(function () {
      directTransfer.from;
    }, "no signature to recover address from caught correctly");

    directTransfer.sign(pk_addr[0].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,directTransfer,pk_addr[0].address,1,address,10,Buffer.alloc(32),pk_addr[1].address);

    //handle the signed transfer
    channel.handleTransfer(directTransfer,new util.BN(2));

    //ensure that appropriate state values updated: nonce+1, transferredAmount but nothing else
    assertStateBN(assert,myState,1,123,10,0,0);
    assertStateBN(assert,peerState,0,200,0,0,0);

    var transferrable = channel.transferrableFromTo(channel.myState,channel.peerState);
    assert.equals(transferrable.eq(new util.BN(113)),true,'correct transferrable amount from mystate');
    transferrable = channel.transferrableFromTo(channel.peerState,channel.myState);
    console.log(transferrable);
    assert.equals(transferrable.eq(new util.BN(210)),true,'correct transferrable amount from peerstate');


    //create a second directTransfer and ensure appropriate update
    directTransfer = channel.createDirectTransfer(msgID,transferredAmount.add(new util.BN(50)));
    //ensure the state wasnt updated when transfer was created
    assertStateBN(assert,myState,1,123,10,0,0);
    assertStateBN(assert,peerState,0,200,0,0,0);

    assert.throws(function () {
      directTransfer.from;
    }, "no signature to recover address from caught correctly");

    directTransfer.sign(pk_addr[0].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,directTransfer,pk_addr[0].address,2,address,10+50,Buffer.alloc(32),pk_addr[1].address);

    //handle the signed transfer
    channel.handleTransfer(directTransfer,new util.BN(2));

    //ensure that appropriate state values updated: nonce+1, transferredAmount but nothing else
    assertStateBN(assert,myState,2,123,60,0,0);
    assertStateBN(assert,peerState,0,200,0,0,0);

    var transferrable = channel.transferrableFromTo(channel.myState,channel.peerState);
    assert.equals(transferrable.eq(new util.BN(63)),true,'correct transferrable amount from mystate');
    transferrable = channel.transferrableFromTo(channel.peerState,channel.myState);
    console.log(transferrable);
    assert.equals(transferrable.eq(new util.BN(260)),true,'correct transferrable amount from peerstate');


    //send money from peer to myself

    //create a second directTransfer and ensure appropriate update
    var peerDirectTransfer = peerChannel.createDirectTransfer(msgID,new util.BN(250));
    //ensure the state wasnt updated when transfer was created
   assertStateBN(assert,myState,2,123,60,0,0);
   assertStateBN(assert,peerState,0,200,0,0,0);

    assert.throws(function () {
      peerDirectTransfer.from;
    }, "no signature to recover address from caught correctly");

    //peer sign
    peerDirectTransfer.sign(pk_addr[1].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,peerDirectTransfer,pk_addr[1].address,1,address,250,Buffer.alloc(32),pk_addr[0].address);

    //handle the peer signed transfer
    channel.handleTransfer(peerDirectTransfer,new util.BN(2));

    // //ensure that appropriate state values updated: nonce+1, transferredAmount but nothing else
    assertStateBN(assert,myState,2,123,60,0,0);
    assertStateBN(assert,peerState,1,200,250,0,0);

    var transferrable = channel.transferrableFromTo(channel.myState,channel.peerState);
    assert.equals(transferrable.eq(new util.BN(313)),true,'correct transferrable amount from mystate');
    transferrable = channel.transferrableFromTo(channel.peerState,channel.myState);
    console.log(transferrable);
    assert.equals(transferrable.eq(new util.BN(10)),true,'correct transferrable amount from peerstate');




    assert.end();


    teardown();
  })

  t.test('channel component test: direct transfer should not createDirectTransfer when transferredAmount > transferrable',function  (assert) {
    setup(assert);

    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(124);
    assert.throws(function(){
      var directTransfer = channel.createDirectTransfer(msgID,transferredAmount);
    },"Insufficient funds: direct transfer cannot be completed");
    //ensure the state wasnt updated when transfer was created
    assertStateBN(assert,myState,0,123,0,0,0);
    assertStateBN(assert,peerState,0,200,0,0,0);

    assert.end();


    teardown();
  });

  t.test('channel component test: direct transfer should not handleTransfer when transferredAmount < state.transferredAmount',function  (assert) {
    setup(assert);

    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(40);
    var transferredAmountFail = new util.BN(30);
    //(msgID,nonce,transferredAmount,channelAddress,locksRoot,to)
    var directTransfer = createDirectTransfer(msgID,1,transferredAmount,address,Buffer.alloc(32),pk_addr[1].address);
    directTransfer.sign(pk_addr[0].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,directTransfer,pk_addr[0].address,1,address,40,Buffer.alloc(32),pk_addr[1].address);
    channel.handleTransfer(directTransfer,new util.BN(2));
    assertStateBN(assert,myState,1,123,40,0,0);
    assertStateBN(assert,peerState,0,200,0,0,0);


    var directTransferFail = createDirectTransfer(msgID,2,transferredAmountFail,address,Buffer.alloc(32),pk_addr[1].address);
    directTransferFail.sign(pk_addr[0].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,directTransferFail,pk_addr[0].address,2,address,30,Buffer.alloc(32),pk_addr[1].address);

    assert.throws(function(){
      channel.handleTransfer(directTransferFail,new util.BN(2));
    },
      new Error("Invalid transferredAmount: must be monotonically increasing value"));

    assertStateBN(assert,myState,1,123,40,0,0);
    assertStateBN(assert,peerState,0,200,0,0,0);

    //handle the signed transfer


    assert.end();


    teardown();
  });

  t.test('channel component test: direct transfer should not handleTransfer when state !== CHANNEL_STATE_OPEN',function  (assert) {
    setup(assert);

    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(40);
    var transferredAmountFail = new util.BN(30);
    //(msgID,nonce,transferredAmount,channelAddress,locksRoot,to)
    var directTransfer = createDirectTransfer(msgID,1,transferredAmount,address,Buffer.alloc(32),pk_addr[1].address);
    directTransfer.sign(pk_addr[0].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,directTransfer,pk_addr[0].address,1,address,40,Buffer.alloc(32),pk_addr[1].address);
    channel.closedBlock = new util.BN(10);
    try{
      channel.handleTransfer(directTransfer,new util.BN(2));
    }catch(err){
      assert.equals(err.message, "Invalid transfer: cannot update a closing channel");
    }
    assertStateBN(assert,myState,0,123,0,0,0);
    assertStateBN(assert,peerState,0,200,0,0,0);

    assert.end();


    teardown();
  });

  t.test('channel component test: direct transfer should not handleTransfer when transferredAmount > transferrable',function  (assert) {
    setup(assert);

    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(124);
    //(msgID,nonce,transferredAmount,channelAddress,locksRoot,to)
    var directTransfer = createDirectTransfer(msgID,1,transferredAmount,address,Buffer.alloc(32),pk_addr[1].address);
    directTransfer.sign(pk_addr[0].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,directTransfer,pk_addr[0].address,1,address,124,Buffer.alloc(32),pk_addr[1].address);

    //handle the signed transfer
    assert.throws(function(){channel.handleTransfer(directTransfer,new util.BN(2));},new Error("Invalid transferredAmount: Insufficient Balance"));


    assert.end();


    teardown();
  });

  t.test('channel component test: direct transfer should not handleTransfer with invalid locksroot',function  (assert) {
    setup(assert);

    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(120);
    //(msgID,nonce,transferredAmount,channelAddress,locksRoot,to)
    var directTransfer = createDirectTransfer(msgID,1,transferredAmount,address,testLocks[0].getMessageHash(),pk_addr[1].address);
    directTransfer.sign(pk_addr[0].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,directTransfer,pk_addr[0].address,1,address,120,testLocks[0].getMessageHash(),pk_addr[1].address);

    //handle the signed transfer
    assert.throws(function(){
      channel.handleTransfer(directTransfer,new util.BN(2));
    },
      new Error("Invalid LocksRoot for Transfer"));


    assert.end();
    teardown();
  });

  t.test('channel component test: direct transfer should not handleTransfer with no signature',function  (assert) {
    setup(assert);

    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(120);
    //(msgID,nonce,transferredAmount,channelAddress,locksRoot,to)
    var directTransfer = createDirectTransfer(msgID,1,transferredAmount,address,testLocks[0].getMessageHash(),pk_addr[1].address);

    //handle the signed transfer
    assert.throws(function(){
      channel.handleTransfer(directTransfer,new util.BN(2));
    },
      new Error("Invalid Transfer: unknown from"));


    assert.end();
    teardown();
  });



  t.test('channel component test: direct transfer should not handleTransfer with decremented nonce',function  (assert) {
    setup(assert);

    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(50);
    //(msgID,nonce,transferredAmount,channelAddress,locksRoot,to)
    var directTransfer = createDirectTransfer(msgID,-1,transferredAmount,address,Buffer.alloc(32),pk_addr[1].address);
    directTransfer.sign(pk_addr[0].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,directTransfer,pk_addr[0].address,-1,address,50,Buffer.alloc(32),pk_addr[1].address);

    //handle the signed transfer
    assert.throws(function(){
      channel.handleTransfer(directTransfer,new util.BN(2));
    },new Error("Invalid nonce: Nonce must be incremented by 1"));


    assert.end();


    teardown();
  });


  t.test('channel component test: direct transfer should not handleTransfer with nonce > nonce+1',function  (assert) {
    setup(assert);

    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(50);
    //(msgID,nonce,transferredAmount,channelAddress,locksRoot,to)
    var directTransfer = createDirectTransfer(msgID,2,transferredAmount,address,Buffer.alloc(32),pk_addr[1].address);
    directTransfer.sign(pk_addr[0].pk);
    //make sure direct transfer was created properly
    assertDirectTransfer(assert,directTransfer,pk_addr[0].address,2,address,50,Buffer.alloc(32),pk_addr[1].address);

    //handle the signed transfer
    assert.throws(function(){
      channel.handleTransfer(directTransfer,new util.BN(2));
    },new Error("Invalid nonce: Nonce must be incremented by 1"));


    assert.end();


    teardown();
  });

  t.test('channel component test: mediated transfer create and handle',function  (assert) {
    setup(assert);
    //NOTE: at a minimum the locks must be CURRENT_BLOCK+REVEAL_TIMEOUT in the future.
    //We are better off creating Locks with expiration set to currentBlock + settleTimeout and
    //not issuing the secret

    //revealTimeout = 15
    currentBlock = new util.BN(5);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)

    var mediatedtransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration, // currentBlock = 5
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);

    //ensure the state wasnt updated when transfer was created
    assertStateBN(assert,myState,0,123,0,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.throws(function () {
      mediatedtransfer.from;
    }, "no signature to recover address from caught correctly");

    mediatedtransfer.sign(pk_addr[0].pk);

    //make sure mediated transfer was created properly
    assertMediatedTransfer(
      assert,mediatedtransfer,pk_addr[0].address,1,address,0,
      testLocks[0].getMessageHash(),pk_addr[1].address,pk_addr[1].address,pk_addr[0].address);

    //handle the signed transfer
    channel.handleTransfer(mediatedtransfer,currentBlock);

    //ensure that appropriate state values updated: nonce+1, transferredAmount but nothing else
    assertStateBN(assert,myState,1,123,0,10,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

       //lock right before expire (currentBlock + channel.REVEAL_TIMEOUT < expirtation ):: 5-1 + 15 < 20
    var transferrable = channel.transferrableFromTo(channel.myState,channel.peerState,currentBlock.sub( new util.BN(1)));
    assert.equals(transferrable.eq(new util.BN(113)),true,'correct transferrable amount from mystate');

    transferrable = channel.transferrableFromTo(channel.myState,channel.peerState,currentBlock);
    assert.equals(transferrable.eq(new util.BN(123)),true,'correct transferrable amount from mystate');

    transferrable = channel.transferrableFromTo(channel.peerState,channel.myState);
    assert.equals(transferrable.eq(new util.BN(200)),true,'correct transferrable amount from peerstate');
    assert.equals(myState.containsLock(testLocks[0]),true);


    // console.log(channel.myState.pendingLocks);
    // console.log(util.sha3(locks[0].secret));
    currentBlock = currentBlock.add(new util.BN(1));
    var secretReveal = createRevealSecret(pk_addr[0].address,locks[0].secret);

    channel.handleRevealSecret(secretReveal);
    assert.equals(myState.containsLock(testLocks[0]),true);
    assertStateBN(assert,myState,1,123,0,0,10,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);


    currentBlock = currentBlock.add(new util.BN(1));
    var secretToProof = channel.createSecretToProof(msgID,locks[0].secret);
    secretToProof.sign(pk_addr[0].pk);
    channel.handleTransfer(secretToProof);
    assertStateBN(assert,myState,2,123,10,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.end();
    teardown();
  })

t.test('channel component test: mediated transfer should accept expired locks ; even if requests wont be sent for secrets',function  (assert) {
    setup(assert);
    //NOTE: at a minimum the locks must be CURRENT_BLOCK+REVEAL_TIMEOUT in the future.
    //We are better off creating Locks with expiration set to currentBlock + settleTimeout and
    //not issuing the secret

    //revealTimeout = 15
    currentBlock = new util.BN(50);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)

    var mediatedtransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);

    mediatedtransfer.sign(pk_addr[0].pk);

    //make sure mediated transfer was created properly
    assertMediatedTransfer(
      assert,mediatedtransfer,pk_addr[0].address,1,address,0,
      testLocks[0].getMessageHash(),pk_addr[1].address,pk_addr[1].address,pk_addr[0].address);

    //handle the signed transfer
    channel.handleTransfer(mediatedtransfer,currentBlock);
    assert.equals(channel.myState.lockedAmount(currentBlock).eq(new util.BN(0)),true);
    // //ensure that appropriate state values updated: nonce+1, transferredAmount but nothing else
    assertStateBN(assert,myState,1,123,0,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    //lock is in locksRoot but is expired so not counted towards transferrable
    assert.equals(channel.myState.merkleTree.getRoot().compare(testLocks[0].getMessageHash()),0);

    var transferrable = channel.transferrableFromTo(channel.myState,channel.peerState,currentBlock);
    assert.equals(transferrable.eq(new util.BN(123)),true,'correct transferrable amount from mystate');
    transferrable = channel.transferrableFromTo(channel.peerState,channel.myState);
    assert.equals(transferrable.eq(new util.BN(200)),true,'correct transferrable amount from peerstate');
    assert.equals(myState.containsLock(testLocks[0]),true);



    assert.end();
    teardown();
  })


  t.test('channel component test: mediatedTransfer should not accept with different locksRoot ',function  (assert) {
    setup(assert);
    currentBlock = new util.BN(11);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)

    //revealTimeout = 10;
    //settleTimeout = 100;
    var testMT = computeMerkleTree(testLocks.slice(0,2));
    var invalidLocksRoot = computeMerkleTree(testLocks.slice(1,1));

    var openLocks = {};
    openLocks[testLocks[0].hashLock.toString('hex')] = testLocks[0];
    openLocks[testLocks[1].hashLock.toString('hex')] = testLocks[1];

    myState.proof = {
      nonce:new util.BN(17),

      transferredAmount:new util.BN(0),

      locksRoot :testMT.getRoot()
    };
    myState.depositBalance= new util.BN(2313),
    myState.openLocks = openLocks;
    myState.merkleTree = testMT;


    assertStateBN(assert,myState,17,2313,0,0,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    var invalidLocksRoot = createMediatedTransfer(1,18,50,address,invalidLocksRoot.getRoot(),address,
      address,address,testLocks[2]);
    invalidLocksRoot.sign(pk_addr[0].pk);

    try{
      channel.handleTransfer(invalidLocksRoot,currentBlock);
    }catch(err){
      assert.equals(err.message, "Invalid LocksRoot for LockedTransfer");
    }

    assertStateBN(assert,myState,17,2313,0,0,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);




    assert.end();
    teardown();
  })

  t.test('channel component test: mediatedTransfer should not accept with differing locksRoot; even if set to zero buffer ',function  (assert) {
    setup(assert);
    currentBlock = new util.BN(11);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)

    //revealTimeout = 10;
    //settleTimeout = 100;
    var testMT = computeMerkleTree(testLocks.slice(0,2));
    var invalidLocksRoot = computeMerkleTree(testLocks.slice(1,1));

    var openLocks = {};
    openLocks[testLocks[0].hashLock.toString('hex')] = testLocks[0];
    openLocks[testLocks[1].hashLock.toString('hex')] = testLocks[1];

    myState.proof = {
      nonce:new util.BN(17),

      transferredAmount:new util.BN(0),

      locksRoot :testMT.getRoot()
    };
    myState.depositBalance= new util.BN(2313),
    myState.openLocks = openLocks;
    myState.merkleTree = testMT;


    assertStateBN(assert,myState,17,2313,0,0,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    var invalidLocksRoot = createMediatedTransfer(1,18,50,address,Buffer.alloc(32),address,
      address,address,testLocks[2]);
    invalidLocksRoot.sign(pk_addr[0].pk);

    try{
      channel.handleTransfer(invalidLocksRoot,currentBlock);
    }catch(err){
      assert.equals(err.message, "Invalid LocksRoot for LockedTransfer");
    }

    assertStateBN(assert,myState,17,2313,0,0,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.end();
    teardown();
  })

  t.test('channel component test: mediatedTransfer cannot register same lock twice; both in pending',function  (assert) {
    setup(assert);
    setup(assert);
    //NOTE: at a minimum the locks must be CURRENT_BLOCK+REVEAL_TIMEOUT in the future.
    //We are better off creating Locks with expiration set to currentBlock + settleTimeout and
    //not issuing the secret

    //revealTimeout = 10
    currentBlock = new util.BN(5);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)

    var mediatedtransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);



    //ensure the state wasnt updated when transfer was created
    assertStateBN(assert,myState,0,123,0,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);


    mediatedtransfer.sign(pk_addr[0].pk);


    //make sure mediated transfer was created properly
    assertMediatedTransfer(
      assert,mediatedtransfer,pk_addr[0].address,1,address,0,
      testLocks[0].getMessageHash(),pk_addr[1].address,pk_addr[1].address,pk_addr[0].address);

    //handle the signed transfer
    channel.handleTransfer(mediatedtransfer,currentBlock);

    //ensure that appropriate state values updated: nonce+1, transferredAmount but nothing else
    assertStateBN(assert,myState,1,123,0,10,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    var duplicateTransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
     duplicateTransfer.sign(pk_addr[0].pk);
    try{
      channel.handleTransfer(duplicateTransfer,currentBlock.add(new util.BN(10)));
    }catch(err){
      assert.equals(err.message, "Invalid Lock: Lock registered previously");
    }
    assert.end();
    teardown();
  })

  t.test('channel component test: mediatedTransfer cannot register same lock twice; one in openLocks',function  (assert) {
    setup(assert);
    currentBlock = new util.BN(11);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)

    //revealTimeout = 10;
    //settleTimeout = 100;
    var testMT = computeMerkleTree(testLocks.slice(0,2));
    var invalidLocksRoot = computeMerkleTree(testLocks.slice(1,1));

    var openLocks = {};
    openLocks[testLocks[0].hashLock.toString('hex')] = testLocks[0];
    openLocks[testLocks[1].hashLock.toString('hex')] = testLocks[1];

    myState.proof = {
      nonce:new util.BN(17),

      transferredAmount:new util.BN(0),

      locksRoot :testMT.getRoot()
    };
    myState.depositBalance= new util.BN(2313),
    myState.openLocks = openLocks;
    myState.merkleTree = testMT;


    assertStateBN(assert,myState,17,2313,0,0,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);


    var duplicateTransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
     duplicateTransfer.sign(pk_addr[0].pk);
    try{
      channel.handleTransfer(duplicateTransfer,currentBlock.add(new util.BN(10)));
    }catch(err){
      assert.equals(err.message, "Invalid Lock: Lock registered previously");
    }

    assertStateBN(assert,myState,17,2313,0,0,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.end();
    teardown();
  })

  t.test('channel component test: mediatedTransfer can handle same secret multiple times',function  (assert) {
    setup(assert);
    currentBlock = new util.BN(11);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)

    //revealTimeout = 10;
    //settleTimeout = 100;
    var testMT = computeMerkleTree(testLocks.slice(0,2));
    var invalidLocksRoot = computeMerkleTree(testLocks.slice(1,1));

    var pendingLocks = {};
    pendingLocks[testLocks[0].hashLock.toString('hex')] = testLocks[0];
    pendingLocks[testLocks[1].hashLock.toString('hex')] = testLocks[1];

    myState.proof = {
      nonce:new util.BN(17),

      transferredAmount:new util.BN(0),

      locksRoot :testMT.getRoot()
    };
    myState.depositBalance= new util.BN(2313),
    myState.pendingLocks = pendingLocks;
    myState.merkleTree = testMT;


    assertStateBN(assert,myState,17,2313,0,30,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);


    var revealSecret = new message.RevealSecret({
      to:pk_addr[1].address,
      secret:locks[0].secret});
    channel.handleRevealSecret(revealSecret);

    assertStateBN(assert,myState,17,2313,0,20,10);
    assertStateBN(assert,peerState,0,200,0,0,0);

    //send the RevealSecret again and it shouldnt effect the final state
    //For expired locks, the state machine implementation must handle not accepting the secret
    //if secret2proof is sent for expired lock, it could be fine
     var revealSecret2 = new message.RevealSecret({
      to:pk_addr[1].address,
      secret:locks[0].secret});
    channel.handleRevealSecret(revealSecret2);

    assertStateBN(assert,myState,17,2313,0,20,10,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.end();
    teardown();
  })

  t.test('channel component test: mediatedTransfer should not accept with less transferredAmount ',function  (assert) {
    setup(assert);
    currentBlock = new util.BN(5);
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);

    var testMT = computeMerkleTree(testLocks.slice(0,1));
    myState.proof.transferredAmount = new util.BN(1000);
    assertStateBN(assert,myState,0,123,1000,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    var invalidTransferredAmount = createMediatedTransfer(1,1,50,address,testLocks[0].getMessageHash(),address,
      address,address,testLocks[0]);
    invalidTransferredAmount.sign(pk_addr[0].pk);

    try{
      channel.handleTransfer(invalidTransferredAmount,currentBlock);
    }catch(err){
      assert.equals(err.message, "Invalid transferredAmount: must be monotonically increasing value");
    }
    assertStateBN(assert,myState,0,123,1000,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);




    assert.end();
    teardown();
  })

  //START BLOCK CHAIN TESTS

  t.test('channel component test: mediated transfer should not accept unknown signed proof',function  (assert) {
    setup(assert);
    currentBlock = new util.BN(10);
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //SETUP Phoney State
    var openLocks = {};
    openLocks[testLocks[0].hashLock.toString('hex')] = testLocks[0];
    openLocks[testLocks[1].hashLock.toString('hex')] = testLocks[1];

    var testMT = computeMerkleTree(testLocks.slice(0,2));
    myState.proof = {
      nonce:new util.BN(17),

      transferredAmount:new util.BN(0),

      locksRoot :testMT.getRoot()
    };
    myState.depositBalance= new util.BN(2313),
    myState.openLocks = openLocks;
    myState.merkleTree = testMT;


    assertStateBN(assert,myState,17,2313,0,0,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    //generate a secret to proof message but dont sign properly
    var secretToProof = channel.createSecretToProof(msgID,locks[0].secret);
    secretToProof.sign(pk_addr[2].pk);
    try{
      channel.handleTransfer(secretToProof);
    }catch(err){
      assert.equals(err.message, "Invalid Transfer: unknown from");
    }

    //state should not change
    assertStateBN(assert,myState,17,2313,0,0,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.end();
    teardown();
  })

  //Block Chain event tests
  t.test('channel handles depositBalance ony when it is greater then previous balance',function (assert) {
    setup(assert);
    assertStateBN(assert,myState, 0,123,0,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);
    try{
      channel.onChannelNewBalance(myState.address, new util.BN(12));
    }catch(err){
      assert.equals(err.message, "Invalid Deposit Amount: deposit must be monotonically increasing");
    }
    assertStateBN(assert,myState, 0,123,0,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);
    channel.onChannelNewBalance(myState.address, new util.BN(129));
    assertStateBN(assert,myState, 0,129,0,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);
    channel.onChannelNewBalance(peerState.address, new util.BN(209));
    assertStateBN(assert,myState, 0,129,0,0,0,currentBlock);
    assertStateBN(assert,peerState,0,209,0,0,0,currentBlock);
    assert.end();

  })

  t.test('MANUAL TEST: channel can prove lock in solidity',function  (assert) {
    setup(assert);

    //revealTimeout = 15
    currentBlock = new util.BN(5);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);
    assertStateBN(assert,myState,0,123,0,0,0,currentBlock);

    var mediatedtransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
    mediatedtransfer.sign(pk_addr[0].pk);

    channel.handleTransfer(mediatedtransfer,currentBlock);
     assertStateBN(assert,myState,1,123,0,10,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

     var mediatedtransfer2 = channel.createMediatedTransfer(
      msgID.add(new util.BN(1)),
      testLocks[1].hashLock,
      testLocks[1].amount,
      testLocks[1].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
      mediatedtransfer2.sign(pk_addr[0].pk);
    channel.handleTransfer(mediatedtransfer2,currentBlock);
     assertStateBN(assert,myState,2,123,0,30,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);


     var mediatedtransfer3 = channel.createMediatedTransfer(
      msgID.add(new util.BN(1)),
      testLocks[2].hashLock,
      testLocks[2].amount,
      testLocks[2].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
      mediatedtransfer3.sign(pk_addr[0].pk);
    channel.handleTransfer(mediatedtransfer3,currentBlock);
     assertStateBN(assert,myState,3,123,0,60,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    //recall you must accept expired locks because it may have expired on transit and we would
    //then have unsynced locksRoots
     var mediatedtransfer4 = channel.createMediatedTransfer(
      msgID.add(new util.BN(1)),
      testLocks[3].hashLock,
      testLocks[3].amount,
      testLocks[3].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
      mediatedtransfer4.sign(pk_addr[0].pk);

    channel.handleTransfer(mediatedtransfer4,currentBlock);

    assertStateBN(assert,myState,4,123,0,60,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    currentBlock = currentBlock.add(new util.BN(1));
    var secretReveal = createRevealSecret(pk_addr[0].address,locks[0].secret);
    var secretReveal2 = createRevealSecret(pk_addr[0].address,locks[1].secret);
    secretReveal.sign(pk_addr[0].pk);
    secretReveal.sign(pk_addr[0].pk);

    channel.handleRevealSecret(secretReveal);
    channel.handleRevealSecret(secretReveal2);

    assert.equals(myState.containsLock(testLocks[0]),true);
    assert.equals(myState.containsLock(testLocks[1]),true);
    assertStateBN(assert,myState,4,123,0,30,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    console.log(myState.merkleTree.getRoot());
    currentBlock = currentBlock.add(new util.BN(1));
    var secretToProof = channel.createSecretToProof(msgID.add(new util.BN(2)),locks[0].secret);
    secretToProof.sign(pk_addr[0].pk);
    console.log(secretToProof.toProof());
    channel.handleTransfer(secretToProof);
    assertStateBN(assert,myState,5,123,10,30,20,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.equals(peerChannel.isOpen(), true);
    assert.equals(peerChannel.updatedProofBlock, null);

    console.log(peerChannel._withdrawPeerOpenLocks());

    //Manual Test in Solidity - Lock 1
    var ll = Object.values(peerChannel.peerState.openLocks)[0];
    console.log('"0x'+ll.getMessageHash().toString('hex')+'","0x'
      +peerChannel.peerState.merkleTree.generateProof(ll.getMessageHash())[0].toString('hex')
      +peerChannel.peerState.merkleTree.generateProof(ll.getMessageHash())[1].toString('hex')+'","0x'+
     channel.myState.merkleTree.getRoot().toString('hex')+'"');


    // MANUAL SOLIDITY TEST FUNCTION: Put above into contract
  //   function checkElements(string stringHash,string stringEl,string stringRoot) public view returns(bool){
  //     bytes32  h = toBytes32(hexStrToBytes(stringHash),0);
  //     bytes32 root = toBytes32(hexStrToBytes(stringRoot),0);
  //     bytes32 el;
  //     if(bytes(stringEl).length > 0){
  //       bytes memory proof =  bytes(hexStrToBytes(stringEl));
  //       for (uint256 i = 32; i <= proof.length; i += 32) {
  //          assembly {
  //           el := mload(add(proof, i))
  //           }
  //          if (h < el) {

  //           h = keccak256(h, el);
  //           } else {
  //               h = keccak256(el, h);
  //           }
  //           }
  //       }
  //       return h == root;
  // }
    assert.end();
  })


  t.test('channel can only close once and correct lockProofs generated against solidity',function  (assert) {
    setup(assert);
    var bcReq = [];
    peerChannel.blockchain = function (req){
        bcReq.push(req);
      }


    var printProof =function(lock,proof,root){
      console.log("Encoded Lock:"+util.addHexPrefix(lock.encode().toString('hex')));
      console.log('"'+util.addHexPrefix(lock.getMessageHash().toString('hex')) +'","'
        +util.addHexPrefix(proof.reduce(function (result, hashBytes) {
          result+=hashBytes.toString('hex');
          return result;
      },"")) +'","'+util.addHexPrefix(root.toString('hex'))+'"');
    }

    var assertLockProofString = function(lock,proof,root,stringABIEncodedLock, stringProofHexString,stringRoot){
      assert.equals(util.addHexPrefix(lock.encode().toString('hex')),stringABIEncodedLock, "correctly solidity encoded lock");
      assert.equals(util.addHexPrefix(proof.reduce(function (result, hashBytes) {
          result+=hashBytes.toString('hex');
          return result;
      },"")), stringProofHexString, "correct proof string");
      assert.equal(util.addHexPrefix(root.toString('hex')), stringRoot);
    };
    //FURTHER SETUP OF LOCKS ETC.

    //revealTimeout = 15
    currentBlock = new util.BN(5);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);
    assertStateBN(assert,myState,0,123,0,0,0,currentBlock);

    var mediatedtransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
    mediatedtransfer.sign(pk_addr[0].pk);

    channel.handleTransfer(mediatedtransfer,currentBlock);
     assertStateBN(assert,myState,1,123,0,10,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

     var mediatedtransfer2 = channel.createMediatedTransfer(
      msgID.add(new util.BN(1)),
      testLocks[1].hashLock,
      testLocks[1].amount,
      testLocks[1].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
      mediatedtransfer2.sign(pk_addr[0].pk);
    channel.handleTransfer(mediatedtransfer2,currentBlock);
     assertStateBN(assert,myState,2,123,0,30,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    currentBlock = currentBlock.add(new util.BN(1));
    var secretReveal = createRevealSecret(pk_addr[0].address,locks[0].secret);
    var secretReveal2 = createRevealSecret(pk_addr[0].address,locks[1].secret);
    secretReveal.sign(pk_addr[0].pk);
    secretReveal2.sign(pk_addr[0].pk);

    channel.handleRevealSecret(secretReveal);
    channel.handleRevealSecret(secretReveal2);

    assert.equals(myState.containsLock(testLocks[0]),true);
    assert.equals(myState.containsLock(testLocks[1]),true);
    assertStateBN(assert,myState,2,123,0,0,30,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.equals(peerChannel.isOpen(), true);
    assert.equals(peerChannel.updatedProofBlock, null);

    //MAIN PART OF TEST
    var proof = peerChannel.issueClose(currentBlock);

    var testMT = new merkleTree.MerkleTree(testLocks.slice(0,2).map(function (l)  {
      return l.getMessageHash();
    }));
    testMT.generateHashTree();
    var openLockProofs = peerChannel.issueWithdrawPeerOpenLocks(currentBlock);
    console.log(openLockProofs);
    

    var assertLockProofString = function(openLockProof,root,stringABIEncodedLock, stringProofHexString,stringRoot){
      assert.equals(util.addHexPrefix(openLockProof.encodeLock().toString('hex')),stringABIEncodedLock, "correctly solidity encoded lock");
      assert.equals(util.addHexPrefix(openLockProof.merkleProof.reduce(function (result, hashBytes) {
          result+=hashBytes.toString('hex');
          return result;
      },"")), stringProofHexString, "correct proof string");
      assert.equal(util.addHexPrefix(root.toString('hex')), stringRoot);
    };

    var expectedLockProofs = [
    ["0x000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000014b8c5926ff513010d19bc9c549d21e8514c5577ef228eff65e3b6bc29a0e25ad2",
    "0x508f0f548b4306ecff5e60b641479a8645cfce137ceddf6e9afe43e38412c31a",
    "0xd4194160804ec927608381e350dac6adb02f2ee3270ca63b62ccae0e8a990420"],
    [
    "0x00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000028211d5b14c838a5d7ebab63b8e080f1cf529b51b7c58bb4446ae7f24b0edb158e",
    "0x0eeee20f167e07ba2f3e0e3c122add49c06ab4f3a8df2a2e3b9e895f07f80e8f",
    "0xd4194160804ec927608381e350dac6adb02f2ee3270ca63b62ccae0e8a990420"
    ]];
    for(var i = 0; i < openLockProofs.length; i++){
      var opl = openLockProofs[i];
      assert.equals(opl.encodeLock().length, 96);
      assertLockProofString(opl,testMT.getRoot(),expectedLockProofs[i][0],expectedLockProofs[i][1],expectedLockProofs[i][2]);
    }
    //assert,transfer,nonce,channelAddress,transferredAmount,locksRoot,from
    

    assertProof(assert,proof, new util.BN(2), channel.channelAddress, new util.BN(0), testMT.getRoot(), pk_addr[0].address )
    assert.equals(peerChannel.isOpen(),false, "channel is closed after issuing a close block even if its not mined yet");
    assert.equals(peerChannel.issuedCloseBlock.eq(currentBlock), true, "issued close block");
    assert.equals(peerChannel.updatedProofBlock, null, "updatedProof should not be set");
    assert.equals(peerChannel.closedBlock,null, "close block not set");
    

    currentBlock = currentBlock.add(new util.BN(10));
    try{
      peerChannel.onChannelClose(peerChannel.address,currentBlock);
    }catch(err){
      assert.equals(err.message, "Channel Error: Channel Already Closed");
    }
    assert.equals(peerChannel.isOpen(),false, "channel is closed after issuing a close block even if its not mined yet");
    assert.equals(peerChannel.issuedCloseBlock.eq(new util.BN(6)), true, "issued close block");
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(16)),true, "updatedProof should be set as we issued close");
    assert.equals(peerChannel.closedBlock.eq(new util.BN(16)),true, "close block set");
    
    assert.end();
  })

  t.test('channel can call handleClose again in case of blockChain error',function (assert) {
   setup(assert);
    
    //revealTimeout = 15
    currentBlock = new util.BN(5);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);
    assertStateBN(assert,myState,0,123,0,0,0,currentBlock);

    var mediatedtransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
    mediatedtransfer.sign(pk_addr[0].pk);

    channel.handleTransfer(mediatedtransfer,currentBlock);
     assertStateBN(assert,myState,1,123,0,10,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);


    currentBlock = currentBlock.add(new util.BN(1));
    var secretReveal = createRevealSecret(pk_addr[0].address,locks[0].secret);
    secretReveal.sign(pk_addr[0].pk);

    channel.handleRevealSecret(secretReveal);

    assert.equals(myState.containsLock(testLocks[0]),true);
    assertStateBN(assert,myState,1,123,0,0,10,currentBlock);

    assert.equals(peerChannel.isOpen(), true);
    assert.equals(peerChannel.updatedProofBlock, null);
    assert.equals(peerChannel.issuedCloseBlock, null);
    assert.equals(peerChannel.closedBlock, null);

    //MAIN PART OF TEST
    var proof1 = peerChannel.issueClose(currentBlock);
    assert.equals(peerChannel.updatedProofBlock, null);
    assert.equals(peerChannel.issuedCloseBlock.eq(currentBlock), true, "issued close block");
    assert.equals(peerChannel.closedBlock, null);
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_IS_CLOSING);
      
    //blockchain returns an error, oh i dunno lets say due to out of gax exception
    peerChannel.onChannelCloseError(peerChannel.address,currentBlock)
    assert.equals(peerChannel.updatedProofBlock, null);
    assert.equals(peerChannel.issuedCloseBlock,null, "can reissue close block after error");
    assert.equals(peerChannel.closedBlock, null);
    assert.equals(peerChannel.isOpen(), true);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_OPEN);

    //call again, this time successul
    var proof2 = peerChannel.issueClose(currentBlock);
    assert.equals(peerChannel.updatedProofBlock, null);
    assert.equals(peerChannel.issuedCloseBlock.eq(currentBlock), true, "issued close block");
    assert.equals(peerChannel.closedBlock, null);
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_IS_CLOSING);

    currentBlock = currentBlock.add(new util.BN(1));
    peerChannel.onChannelClose(peerChannel.address,currentBlock)
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(7)),true);
    assert.equals(peerChannel.issuedCloseBlock.eq(new util.BN(6)),true, "can reissue close block after error");
    assert.equals(peerChannel.closedBlock.eq(new util.BN(7)),true, "closed block tracked correctly");
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);


    
    var testMT = new merkleTree.MerkleTree(testLocks.slice(0,1).map(function (l)  {
      return l.getMessageHash();
    }));
    testMT.generateHashTree();
    
    assertProof(assert,proof1, new util.BN(1), channel.channelAddress, new util.BN(0), testMT.getRoot(), pk_addr[0].address )
    assertProof(assert,proof2, new util.BN(1), channel.channelAddress, new util.BN(0), testMT.getRoot(), pk_addr[0].address )
    
    currentBlock = currentBlock.add(new util.BN(4));
    try{
      peerChannel.issueClose(currentBlock);
    }catch(err){
      assert.equals(err.message, "Channel Error: In Closing State or Is Closed", "cant issue closed on closed channel")
    }

    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(7)),true);
    assert.equals(peerChannel.issuedCloseBlock.eq(new util.BN(6)),true, "can reissue close block after error");
    assert.equals(peerChannel.closedBlock.eq(new util.BN(7)),true, "closed block tracked correctly");
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.end();
  })

t.test('channel can call transferUpdate after on chain close initiated by partner',function (assert) {
   setup(assert);
    
    //revealTimeout = 15
    currentBlock = new util.BN(5);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);
    assertStateBN(assert,myState,0,123,0,0,0,currentBlock);

    var mediatedtransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration,
      pk_addr[1].address,
      pk_addr[0].address,
      currentBlock);
    mediatedtransfer.sign(pk_addr[0].pk);

    channel.handleTransfer(mediatedtransfer,currentBlock);
     assertStateBN(assert,myState,1,123,0,10,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);


    currentBlock = currentBlock.add(new util.BN(1));
    var secretReveal = createRevealSecret(pk_addr[0].address,locks[0].secret);
    secretReveal.sign(pk_addr[0].pk);

    channel.handleRevealSecret(secretReveal);

    assert.equals(myState.containsLock(testLocks[0]),true);
    assertStateBN(assert,myState,1,123,0,0,10,currentBlock);

    assert.equals(peerChannel.isOpen(), true);
    assert.equals(peerChannel.updatedProofBlock, null);
    assert.equals(peerChannel.issuedCloseBlock, null);
    assert.equals(peerChannel.closedBlock, null);

    //MAIN PART OF TEST
    var proof1 = peerChannel.onChannelClose(channel.channelAddress,currentBlock);
    assert.equals(peerChannel.updatedProofBlock, null);
    assert.equals(peerChannel.issuedCloseBlock,null, "issued close block");
    assert.equals(peerChannel.issuedTransferUpdateBlock,null, "issued close block");
    assert.equals(peerChannel.closedBlock.eq(new util.BN(6)),true, "blockchain closed this");
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);


    //trying to issue multiple inflight closes will error
    try{
    var proof = peerChannel.issueClose(currentBlock)
    }catch(err){
      assert.equal(err.message, "Channel Error: In Closing State or Is Closed");
    }
    currentBlock = currentBlock.add(new util.BN(1));

    var proof1 = peerChannel.issueTransferUpdate(currentBlock);
    assert.equals(peerChannel.updatedProofBlock, null);
    assert.equals(peerChannel.issuedCloseBlock,null, "can reissue close block after error");
    assert.equals(peerChannel.issuedTransferUpdateBlock.eq(new util.BN(7)),true, "issued transfer update");
    assert.equals(peerChannel.closedBlock.eq(new util.BN(6)),true);
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);

    
    //blockchain returns an error, oh i dunno lets say due to out of gax exception
    peerChannel.onTransferUpdatedError(peerChannel.address,currentBlock)
    assert.equals(peerChannel.updatedProofBlock, null);
    assert.equals(peerChannel.issuedCloseBlock,null, "can reissue close block after error");
    assert.equals(peerChannel.issuedTransferUpdateBlock,null, "issued transfer update");
    assert.equals(peerChannel.closedBlock.eq(new util.BN(6)),true);
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);


    currentBlock = currentBlock.add(new util.BN(1));
    var proof2 = peerChannel.issueTransferUpdate(currentBlock);
    assert.equals(peerChannel.updatedProofBlock, null);
    assert.equals(peerChannel.issuedCloseBlock,null, "can reissue close block after error");
    assert.equals(peerChannel.issuedTransferUpdateBlock.eq(new util.BN(8)),true, "issued transfer update");
    assert.equals(peerChannel.closedBlock.eq(new util.BN(6)),true);
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);

    currentBlock = currentBlock.add(new util.BN(1));
    peerChannel.onTransferUpdated(peerChannel.addresss, currentBlock);
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(9)),true);
    assert.equals(peerChannel.issuedCloseBlock,null, "can reissue close block after error");
    assert.equals(peerChannel.issuedTransferUpdateBlock.eq(new util.BN(8)),true, "issued transfer update");
    assert.equals(peerChannel.closedBlock.eq(new util.BN(6)),true);
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);

    
    var testMT = new merkleTree.MerkleTree(testLocks.slice(0,1).map(function (l)  {
      return l.getMessageHash();
    }));
    testMT.generateHashTree();
    
    assertProof(assert,proof1, new util.BN(1), channel.channelAddress, new util.BN(0), testMT.getRoot(), pk_addr[0].address )
    assertProof(assert,proof2, new util.BN(1), channel.channelAddress, new util.BN(0), testMT.getRoot(), pk_addr[0].address )
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(peerChannel.isOpen(),false, "channel still open after handleClose as expected until BC confirms");
    assert.end();
  })

//calling issueClose multiple times causes errors
//onBlock will case IssueSettle Event


  t.test('channel can transition through out-of-order blockChain close and settlement; settle can only be issued SETTLE_TIMEOUT even if handleSettle issued multipleTimes',function(assert){
    setup(assert);
    

    //revealTimeout = 15
    currentBlock = new util.BN(5);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);
    assertStateBN(assert,myState,0,123,0,0,0,currentBlock);

    assert.equals(channel.isOpen(), true);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_OPEN);
    assert.equals(channel.updatedProofBlock,null);

    assert.equals(peerChannel.isOpen(), true);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_OPEN);
    assert.equals(peerChannel.updatedProofBlock,null);
    
    //issue close to blockchain
    var proof = channel.issueClose(currentBlock);

    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_IS_CLOSING);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.updatedProofBlock, null);

    assert.equals(peerChannel.isOpen(), true);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_OPEN);
    assert.equals(peerChannel.updatedProofBlock, null);
    



    //peer receives close event from blockchain
    currentBlock  = currentBlock.add(new util.BN(3));
    
    peerChannel.onChannelClose(channel.address,currentBlock);

    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_IS_CLOSING);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.updatedProofBlock, null);
    
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(peerChannel.closedBlock.eq(new util.BN(8)),true);
    assert.equals(peerChannel.updatedProofBlock,null);

    //this should fail to set settled or issue a command, as SETTLE_TIMEOUT hasnt passed
    assert.equals(peerChannel.issueSettle(currentBlock), null);


    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_IS_CLOSING);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.updatedProofBlock, null);

    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(peerChannel.closedBlock.eq(new util.BN(8)),true);
    assert.equals(peerChannel.updatedProofBlock,null);
    

    currentBlock  = currentBlock.add(new util.BN(3));
    peerChannel.onTransferUpdated(peerChannel.address,currentBlock)


    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_IS_CLOSING);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.updatedProofBlock, null);

    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(peerChannel.closedBlock.eq(new util.BN(8)),true);
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(11)),true);

    //close initiating channel sees mined block; both would see the same close block
    currentBlock  = currentBlock.add(new util.BN(2));    
    channel.onChannelClose(channel.address,new util.BN(9));

    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.closedBlock.eq(new util.BN(9)),true);
    assert.equals(channel.updatedProofBlock.eq(new util.BN(9)),true);
    
    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(peerChannel.issuedCloseBlock,null);
    assert.equals(peerChannel.closedBlock.eq(new util.BN(8)),true);
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(11)), true);
    

   
    //this should fail to set settled or issue a command, as SETTLE_TIMEOUT hasnt passed
    currentBlock  = currentBlock.add(new util.BN(3));
    assert.equals(channel.canIssueSettle(currentBlock),false);
    assert.equals(peerChannel.canIssueSettle(currentBlock),false);
    var events = channel.onBlock(currentBlock);
    assert.equals(events.length, 0,"should not trigger issue settle event for internal handler");
    

    channel.issueSettle(currentBlock)

    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.issuedSettleBlock,null);
    assert.equals(channel.closedBlock.eq(new util.BN(9)),true);
    assert.equals(channel.updatedProofBlock.eq(new util.BN(9)),true);

    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(peerChannel.closedBlock.eq(new util.BN(8)),true);
    assert.equals(peerChannel.issuedSettleBlock,null);
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(11)), true);

    //SETTLE_TIMEOUT has passed from closedBlock
    currentBlock = SETTLE_TIMEOUT.add(new util.BN(10));
    assert.equals(channel.canIssueSettle(currentBlock),true);
    assert.equals(peerChannel.canIssueSettle(currentBlock),true);
    
    var events = channel.onBlock(currentBlock);
    assert.equals(events.length, 1);
    
    assert.equals(events[0][0], "GOT.issueSettle");
    assert.equals(events[0][1].compare(peerChannel.channelAddress),0)

    //channel can successfully send, so can peer
    channel.issueSettle(currentBlock);

    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_IS_SETTLING);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.issuedSettleBlock.eq(new util.BN(110)),true);
    assert.equals(channel.closedBlock.eq(new util.BN(9)),true);
    assert.equals(channel.updatedProofBlock.eq(new util.BN(9)),true);

    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(peerChannel.closedBlock.eq(new util.BN(8)),true);
    assert.equals(peerChannel.issuedSettleBlock,null);
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(11)), true);
    

    //channel can successfully send, so can peer
    currentBlock = currentBlock.add(new util.BN(12));
    
    peerChannel.issueSettle(currentBlock);

    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_IS_SETTLING);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.issuedSettleBlock.eq(new util.BN(110)),true);
    assert.equals(channel.closedBlock.eq(new util.BN(9)),true);
    assert.equals(channel.updatedProofBlock.eq(new util.BN(9)),true);

    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_IS_SETTLING);
    assert.equals(peerChannel.closedBlock.eq(new util.BN(8)),true);
    assert.equals(peerChannel.issuedSettleBlock.eq(new util.BN(122)),true);
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(11)), true);

    
    currentBlock = currentBlock.add(new util.BN(5));

    //simulate race condition: peerChannels tx fails bc channels request went first
    channel.onChannelSettled(currentBlock);
    peerChannel.onChannelSettledError(currentBlock);

    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_SETTLED);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.closedBlock.eq(new util.BN(9)),true);
    assert.equals(channel.issuedSettleBlock.eq(new util.BN(110)),true);
    assert.equals(channel.settledBlock.eq(new util.BN(127)),true);
    assert.equals(channel.updatedProofBlock.eq(new util.BN(9)),true);

    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_CLOSED);
    assert.equals(peerChannel.closedBlock.eq(new util.BN(8)),true);
    assert.equals(peerChannel.issuedSettleBlock,null);
    assert.equals(peerChannel.settledBlock,null,true);
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(11)), true);

    //peerChannel receives event from peer channel 
    currentBlock = currentBlock.add(new util.BN(5));
    peerChannel.onChannelSettled(currentBlock);

    assert.equals(channel.isOpen(), false);
    assert.equals(channel.state, channelLib.CHANNEL_STATE_SETTLED);
    assert.equals(channel.issuedCloseBlock.eq(new util.BN(5)),true);
    assert.equals(channel.closedBlock.eq(new util.BN(9)),true);
    assert.equals(channel.issuedSettleBlock.eq(new util.BN(110)),true);
    assert.equals(channel.settledBlock.eq(new util.BN(127)),true);
    assert.equals(channel.updatedProofBlock.eq(new util.BN(9)),true);

    assert.equals(peerChannel.isOpen(), false);
    assert.equals(peerChannel.state, channelLib.CHANNEL_STATE_SETTLED);
    assert.equals(peerChannel.closedBlock.eq(new util.BN(8)),true);
    assert.equals(peerChannel.issuedSettleBlock,null);
    assert.equals(peerChannel.settledBlock.eq(new util.BN(132)),true);
    assert.equals(peerChannel.updatedProofBlock.eq(new util.BN(11)), true);
    

    assert.end();

  });


  t.test('channel component test: mediated transfer can handle when lockedAmount transferred > remaining transferrable',function  (assert) {
    setup(assert);
    //NOTE: at a minimum the locks must be CURRENT_BLOCK+REVEAL_TIMEOUT in the future.
    //We are better off creating Locks with expiration set to currentBlock + settleTimeout and
    //not issuing the secret

    //revealTimeout = 15
    currentBlock = new util.BN(5);
    //create direct transfer from channel
    var msgID = new util.BN(0);
    var transferredAmount = new util.BN(10);
    //(msgID,hashLock,amount,expiration,target)
    testLocks[0].amount = new  util.BN(62)
    var mediatedtransfer = channel.createMediatedTransfer(
      msgID,
      testLocks[0].hashLock,
      testLocks[0].amount,
      testLocks[0].expiration, // currentBlock = 5
      pk_addr[1].address,//target
      pk_addr[0].address,//initiator
      currentBlock);

    //ensure the state wasnt updated when transfer was created
    assertStateBN(assert,myState,0,123,0,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.throws(function () {
      mediatedtransfer.from;
    }, "no signature to recover address from caught correctly");

    mediatedtransfer.sign(pk_addr[0].pk);

    //make sure mediated transfer was created properly
    assertMediatedTransfer(
      assert,mediatedtransfer,pk_addr[0].address,1,address,0,
      testLocks[0].getMessageHash(),pk_addr[1].address,pk_addr[1].address,pk_addr[0].address);

    //handle the signed transfer
    channel.handleTransfer(mediatedtransfer,currentBlock);

    //ensure that appropriate state values updated: nonce+1, transferredAmount but nothing else
    assertStateBN(assert,myState,1,123,0,62,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

       //lock right before expire (currentBlock + channel.REVEAL_TIMEOUT < expirtation ):: 5-1 + 15 < 20
    var transferrable = channel.transferrableFromTo(channel.myState,channel.peerState,currentBlock.sub( new util.BN(1)));
    assert.equals(transferrable.eq(new util.BN(61)),true,'correct transferrable amount from mystate');

    transferrable = channel.transferrableFromTo(channel.myState,channel.peerState,currentBlock);
    assert.equals(transferrable.eq(new util.BN(123)),true,'correct transferrable amount from mystate no block reveal');


    transferrable = channel.transferrableFromTo(channel.peerState,channel.myState);
    assert.equals(transferrable.eq(new util.BN(200)),true,'correct transferrable amount from peerstate');
    assert.equals(myState.containsLock(testLocks[0]),true);


    // console.log(channel.myState.pendingLocks);
    // console.log(util.sha3(locks[0].secret));
    currentBlock = currentBlock.add(new util.BN(1));
    var secretReveal = createRevealSecret(pk_addr[0].address,locks[0].secret);

    channel.handleRevealSecret(secretReveal);
    assert.equals(myState.containsLock(testLocks[0]),true);
    assertStateBN(assert,myState,1,123,0,0,62,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);


    currentBlock = currentBlock.add(new util.BN(1));
    var secretToProof = channel.createSecretToProof(msgID,locks[0].secret);
    secretToProof.sign(pk_addr[0].pk);
    channel.handleTransfer(secretToProof);
    assertStateBN(assert,myState,2,123,62,0,0,currentBlock);
    assertStateBN(assert,peerState,0,200,0,0,0,currentBlock);

    assert.end();
    teardown();
  })

});