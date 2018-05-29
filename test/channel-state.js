var test = require('tape')
const util = require('ethereumjs-util')

var merkleTree = require('../src/state-channel/merkletree')
var channelState = require('../src/state-channel/channel-state')
const message = require('../src/state-channel/message')

var privateKey = util.toBuffer('0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109')
var publicKey = util.privateToPublic(privateKey)
var address = util.pubToAddress(publicKey)

// var pk_addr = [{
//   pk: util.toBuffer('0xa63c8dec79b2c168b8b76f131df6b14a5e0a1ab0310e0ba652f39bca158884ba'),
//   address: util.toBuffer('0x6877cf5f9af67d622d6c665ea473e0b1a14f99d0')
// },
// {
//   pk: util.toBuffer('0x6f1cc905d0a87054c15f183eae89ccc8dc3a79702fdbb47ae337583d22df1a51'),
//   address: util.toBuffer('0x43068d574694419cb76360de33fbd177ecd9d3c6')
// },
// {
//   pk: util.toBuffer('0x8dffbd99f8a386c18922a014b5356344a4ac1dbcfe32ee285c3b23239caad10d'),
//   address: util.toBuffer('0xe2b7c4c2e89438c2889dcf4f5ea935044b2ba2b0')
// }]

function assertStateBN (assert, state, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount) {
  assert.equals(state.nonce.eq(new util.BN(nonce)), true)
  assert.equals(state.proof.transferredAmount.eq(new util.BN(transferredAmount)), true)
  assert.equals(state.lockedAmount().eq(new util.BN(lockedAmount)), true)
  assert.equals(state.unlockedAmount().eq(new util.BN(unlockedAmount)), true)
  assert.equals(state.depositBalance.eq(new util.BN(depositBalance)), true)
}

// function assertStateProof (assert, state, nonce, transferredAmount, hashLockRoot, channelAddress) {
//   assert.equals(state.proof.nonce.eq(new util.BN(nonce)), true)
//   assert.equals(state.proof.transferredAmount.eq(new util.BN(transferredAmount)), true)
//   assert.equals(state.proof.hashLockRoot.compare(util.toBuffer(hashLockRoot)), 0)
//   assert.equals(state.proof.channelAddress.compare(util.toBuffer(channelAddress)), 0)
// }

// function assertSignature (assert, state, r, s, v) {
//   assert.equals(state.proof.signature.r.compare(util.toBuffer(r)), 0)
//   assert.equals(state.proof.signature.s.compare(util.toBuffer(s)), 0)
//   assert.equals(state.proof.signature.v.compare(v), 0)
// }

function createTestLock (amount, expiration, secret) {
  return new message.Lock({
    amount: new util.BN(amount),
    expiration: new util.BN(expiration),
    hashLock: util.sha3(secret)
  })
}

function createMediatedTransfer (msgID, nonce, transferredAmount, channelAddress, locksRoot, to, target, initiator, lock) {
  return new message.MediatedTransfer({
    msgID: new util.BN(msgID),
    nonce: new util.BN(nonce),
    transferredAmount: new util.BN(transferredAmount),
    channelAddress: util.toBuffer(channelAddress),
    locksRoot: util.toBuffer(locksRoot),
    to: util.toBuffer(to),
    target: util.toBuffer(target),
    initiator: util.toBuffer(initiator),
    lock: lock
  })
}

function createRevealSecret (to, secret) {
  return new message.RevealSecret({ secret: util.toBuffer(secret), to: to })
}

function createSecretToProof (msgID, nonce, transferredAmount, channelAddress, locksRoot, to, secret) {
  return new message.SecretToProof({
    msgID: new util.BN(msgID),
    nonce: new util.BN(nonce),
    transferredAmount: new util.BN(transferredAmount),
    channelAddress: util.toBuffer(channelAddress),
    locksRoot: util.toBuffer(locksRoot), // locksRoot - sha3(secret)
    to: util.toBuffer(to),
    secret: util.toBuffer(secret)
  })
}

function createDirectTransfer (msgID, nonce, transferredAmount, channelAddress, locksRoot, to) {
  return new message.DirectTransfer({
    msgID: new util.BN(msgID),
    nonce: new util.BN(nonce),
    transferredAmount: new util.BN(transferredAmount),
    channelAddress: util.toBuffer(channelAddress),
    locksRoot: util.toBuffer(locksRoot), // locksRoot - sha3(secret)
    to: util.toBuffer(to)
  })
}

function computeMerkleTree (lockElements) {
  var mt = new merkleTree.MerkleTree(lockElements.map(
    function (l) {
      return l.getMessageHash()
    }))
  mt.generateHashTree()
  return mt
}

function printProof (myState) {
  console.log('R:' + myState.proof.signature.r.toString('hex'))
  console.log('S:' + myState.proof.signature.s.toString('hex'))
  console.log('V:' + myState.proof.signature.v)
  console.log('SEND TO SOLIDITY APPEND HASH:' + myState.proof.nonce.toString(10) + ',' +
    myState.proof.transferredAmount.toString(10) + ',' +
    '"' + util.addHexPrefix(myState.proof.channelAddress.toString('hex')) + '",' +
    '"' + util.addHexPrefix(myState.proof.locksRoot.toString('hex')) + '",' +
    '"' + util.addHexPrefix(myState.proof.messageHash.toString('hex')) + '"'
  )
  console.log('OUR HASH:' + myState.proof.getHash().toString('hex'))
}
test('channelState test', function (t) {
  // t.test('empty merkle tree',function (assert) {

  //   var mt = new merkleTree.MerkleTree([]);
  //   assert.equals(mt.getRoot().compare(Buffer.alloc(32)),0);
  //   assert.end()// body...
  // })

  t.test('ChannelState:mediatedTansfer+mediatedTansfer+RevealSecret+WrongRevealSecret+RevealSecret+SecretToProof', function (assert) {
    var myState = new channelState.ChannelState({ depositBalance: new util.BN(123) })
    assertStateBN(assert, myState, 0, 123, 0, 0, 0)
    assert.equals(myState.proof.locksRoot.compare(myState.merkleTree.getRoot()), 0, 'Initial locksRoot and merkleTree.getRoot match')

    var locks = [{ secret: util.toBuffer('SECRET1'), amount: 10, expiration: 20 },
    { secret: util.toBuffer('SECRET2'), amount: 20, expiration: 40 },
    { secret: util.toBuffer('SECRET3'), amount: 30, expiration: -20 }]

    var testLocks = locks.map(function (lock) {
      return createTestLock(lock.amount,
        lock.expiration,
        lock.secret)
    })

    console.log(testLocks)

    var testMT = computeMerkleTree(testLocks.slice(0, 1))
    var mediatedTansfer = createMediatedTransfer(1, 1, 50, address, testMT.getRoot(), address,
      address, address, testLocks[0])
    mediatedTansfer.sign(privateKey)

    var testMT2 = computeMerkleTree(testLocks.slice(0, 2))
    var mediatedTansfer2 = createMediatedTransfer(2, 2, 50, address, testMT2.getRoot(), address,
      address, address, testLocks[1])
    mediatedTansfer2.sign(privateKey)

    // (msgID,nonce,transferredAmount,channelAddress,locksRoot,to,secret)
    var testMT3 = computeMerkleTree(testLocks.slice(0, 1))
    var s2p = createSecretToProof(2, 3, testLocks[1].amount, address, testMT3.getRoot(), address,
      locks[1].secret)
    s2p.sign(privateKey)

    // (msgID,nonce,transferredAmount,channelAddress,locksRoot,to)
    var dt = createDirectTransfer(3, 4, 45, address, testMT3.getRoot(), address)
    var invalidDt = createDirectTransfer(3, 4, 45, address, testMT2.getRoot(), address)
    dt.sign(privateKey)

    var testMT4 = computeMerkleTree([testLocks[0], testLocks[2]])
    var mediatedTansfer3 = createMediatedTransfer(4, 5, 45, address, testMT4.getRoot(), address,
      address, address, testLocks[2])
    mediatedTansfer3.sign(privateKey)

    var revealSecret3 = createRevealSecret(address, locks[2].secret)
    revealSecret3.sign(privateKey)

    testMT4 = computeMerkleTree([testLocks[2]])
    var s2p2 = createSecretToProof(1, 6, new util.BN(55), address, testMT4.getRoot(), address,
      locks[0].secret)
    s2p2.sign(privateKey)

    var testMT5 = new merkleTree.MerkleTree([])
    var s2p3 = createSecretToProof(4, 7, new util.BN(85), address, testMT5.getRoot(), address,
      locks[2].secret)
    s2p3.sign(privateKey)

    myState.applyLockedTransfer(mediatedTansfer)
    console.log('APPLIED MEDIATED TRANSFER:' + JSON.stringify(myState))

    assert.equals(mediatedTansfer.from.compare(address), 0)
    console.log('LOCKED AMOUNT:' + myState.lockedAmount())

    assert.equals(myState.lockedAmount().eq(testLocks[0].amount), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(0)), true)

    var wrongRevealSecret = createRevealSecret(address, testLocks[1].secret)
    assert.throws(function () { myState.applyRevealSecret(wrongRevealSecret) }, 'Invalid Lock: uknown lock secret received')

    // send a secretToProof of a future lock
    assert.throws(function () {
      myState.applySecretToProof(s2p)
    }, 'Invalid Lock: uknown lock secret received')

    assert.equals(myState.lockedAmount().eq(testLocks[0].amount), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(0)), true)

    // send second lock transfer
    myState.applyLockedTransfer(mediatedTansfer2)
    assert.equals(myState.lockedAmount().eq(testLocks[0].amount.add(testLocks[1].amount)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(0)), true)

    var correctRevealSecret = createRevealSecret(address, locks[0].secret)
    myState.applyRevealSecret(correctRevealSecret)

    assert.equals(myState.lockedAmount().eq(new util.BN(20)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(10)), true)
    assert.equals(myState.nonce.eq(new util.BN(2)), true)

    var correctRevealSecret2 = createRevealSecret(address, locks[1].secret)
    myState.applyRevealSecret(correctRevealSecret2)

    assert.equals(myState.lockedAmount().eq(new util.BN(0)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(30)), true)
    assert.equals(myState.nonce.eq(new util.BN(2)), true)
    assert.equals(myState.proof.from.compare(address), 0)

    // lets unlock the second lock
    console.log(JSON.stringify(s2p))
    myState.applySecretToProof(s2p)

    assert.equals(myState.lockedAmount().eq(new util.BN(0)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(10)), true)
    assert.equals(myState.proof.transferredAmount.eq(new util.BN(20)), true)
    assert.equals(myState.proof.nonce.eq(new util.BN(3)), true)

    console.log('LOCKSROOT:' + myState.merkleTree.getRoot().toString('hex'))
    console.log('LOCKSROOT:' + myState.proof.locksRoot.toString('hex'))
    console.log('LOCKSROOT:' + dt.locksRoot.toString('hex'))
    assert.throws(function () { myState.applyDirectTransfer(invalidDt) }, 'Invalid hashLockRoot')
    assert.equals(myState.lockedAmount().eq(new util.BN(0)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(10)), true)
    assert.equals(myState.proof.transferredAmount.eq(new util.BN(20)), true)
    assert.equals(myState.proof.nonce.eq(new util.BN(3)), true)
    assert.equals(myState.proof.from.compare(address), 0)

    // now send proper locksroot
    myState.applyDirectTransfer(dt)

    assert.equals(myState.lockedAmount().eq(new util.BN(0)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(10)), true)
    assert.equals(myState.proof.transferredAmount.eq(new util.BN(45)), true)
    assert.equals(myState.proof.nonce.eq(new util.BN(4)), true)
    assert.equals(myState.proof.from.compare(address), 0)

    // send 3rd mediated transfer
    myState.applyLockedTransfer(mediatedTansfer3)

    assert.equals(myState.lockedAmount().eq(new util.BN(30)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(10)), true)
    assert.equals(myState.proof.transferredAmount.eq(new util.BN(45)), true)
    assert.equals(myState.proof.nonce.eq(new util.BN(5)), true)
    assert.equals(myState.proof.from.compare(address), 0)

    // unlock the last secret
    myState.applyRevealSecret(revealSecret3)
    assert.equals(myState.lockedAmount().eq(new util.BN(0)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(40)), true)
    assert.equals(myState.proof.transferredAmount.eq(new util.BN(45)), true)
    assert.equals(myState.proof.nonce.eq(new util.BN(5)), true)
    assert.equals(myState.proof.from.compare(address), 0)

    // secret to proof for lock 1
    myState.applySecretToProof(s2p2)
    assert.equals(myState.lockedAmount().eq(new util.BN(0)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(30)), true)
    assert.equals(myState.proof.transferredAmount.eq(new util.BN(55)), true)
    assert.equals(myState.proof.locksRoot.compare(testMT4.getRoot()), 0)
    assert.equals(myState.proof.nonce.eq(new util.BN(6)), true)
    assert.equals(myState.proof.from.compare(address), 0)
    printProof(myState)
    // validate appending elements from solidity
    //  function sh3(uint256 nonce,uint256 transfer_amount, address channel, bytes32 locksRoot,bytes32 hash)public constant returns(bytes32){
    //     return keccak256(nonce,transfer_amount,channel,locksRoot,hash);
    // }
    assert.equals(myState.proof.getHash().toString('hex'), '1d4c75aed8c5ca13d1816f2e20b290f829505ec83025e4d95b3da3d4a78cc04d')

    myState.applySecretToProof(s2p3)
    assert.equals(myState.lockedAmount().eq(new util.BN(0)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(0)), true)
    assert.equals(myState.proof.transferredAmount.eq(new util.BN(85)), true)
    assert.equals(myState.proof.locksRoot.compare(testMT5.getRoot()), 0)
    assert.equals(myState.proof.nonce.eq(new util.BN(7)), true)
    printProof(myState)

    assert.equals(myState.proof.from.compare(address), 0)
    assert.equals(myState.proof.getHash().toString('hex'), 'f49336ce292e81ab68429a2a5d12b7e7e41328d4119e6a3feab3283f363f919d')
    assert.equals(myState.proof.locksRoot.compare(myState.merkleTree.getRoot()), 0, 'Final locksRoot and merkleTree.getRoot match')

    assert.end()

    // var solidityHash = abi.soliditySHA3(
    //  [ "uint256", "uint256", "address","bytes32","bytes32" ],
    //  [myState.proof..nonce,
    //   myState.proof..transferredAmount,
    //   myState.proof..channelAddress,
    //   myState.proof..locksRoot,
    //   myState.proof.]);
    // return solidityHash;
    // var pk = util.ecrecover(buffer,myState.proof.signature.v,util.toBuffer(myState.proof.signature.r),
    //   util.toBuffer(myState.proof.signature.s));
    // var address = util.pubToAddress(pk);
    return address
  })

  t.test('test lockedAmount removes expired locks', function (assert) {
    var locks = [{ secret: util.toBuffer('SECRET1'), amount: 10, expiration: 20 },
    { secret: util.toBuffer('SECRET2'), amount: 20, expiration: 40 },
    { secret: util.toBuffer('SECRET3'), amount: 30, expiration: 80 }]

    var testLocks = locks.map(function (lock) {
      return createTestLock(lock.amount,
        lock.expiration,
        lock.secret)
    })
    var myState = new channelState.ChannelState({ depositBalance: new util.BN(123) })
    myState.pendingLocks = testLocks.slice(0, 2)
    console.log(testLocks)
    myState.openLocks = [testLocks[2]]
    // all pending locks valid
    assert.equals(myState.lockedAmount(new util.BN(0)).eq(new util.BN(30)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(30)), true)
    // firt lock expires
    assert.equals(myState.lockedAmount(new util.BN(21)).eq(new util.BN(20)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(30)), true)

    // second lock expires
    assert.equals(myState.lockedAmount(new util.BN(41)).eq(new util.BN(0)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(30)), true)

    // opened locks do not experience expiration
    assert.equals(myState.lockedAmount(new util.BN(91)).eq(new util.BN(0)), true)
    assert.equals(myState.unlockedAmount().eq(new util.BN(30)), true)
    assert.end()
  })
  t.test('register transfer to unknown channel', function (assert) {
    assert.end()
  })

  t.test('direct transfer invalid locksRoot', function (assert) {
    assert.end()
  })
  t.test('mediatedTansfer invalid locksRoot', function (assert) {
    assert.end()
  })

  t.test('mediatedTansfer register same lock multiple times', function (assert) {
    assert.end()
  })
})
