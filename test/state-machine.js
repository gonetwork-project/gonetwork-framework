var test = require('tape')
var util = require('ethereumjs-util')

var stateMachine = require('../src/state-channel/state-machine')
var message = require('../src/state-channel/message')
var channel = require('../src/state-channel/channel')

var privateKey = util.toBuffer('0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109')
var publicKey = util.privateToPublic(privateKey)
var address = util.pubToAddress(publicKey)
// var channelAddress = address.toString('hex')

function createMediatedTransfer (msgID, nonce, transferredAmount, channelAddress, locksRoot, to, target, initiator, lock, expiration) {
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

function assertState (assert, state, expectedState) {
  assert.equal(state.__machina__['mediated-transfer'].state, expectedState)
}

let pkAddr = [{
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

let initiatorEvents
let targetEvents
let serialEvents
let secret = 'SECRET'
let currentBlock = new util.BN(1231231)
let initiator = pkAddr[0]
let target = pkAddr[1]
let mediatedTransferState

let assertEmit

test('test stateMachine transfers', function (t) {
  initiatorEvents = []
  targetEvents = []
  serialEvents = []

  var Target = null
  var Initiator = null
  function setup (assert) {
    assertEmit = function (event) {
      assert.equal(serialEvents[serialEvents.length - 1], event, true)
    }

    initiatorEvents = []
    targetEvents = []
    serialEvents = []

    pkAddr = [{
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

    // create a mediated transfer state object
    secret = 'SECRET'
    currentBlock = new util.BN(1231231)
    initiator = pkAddr[0]
    target = pkAddr[1]
    mediatedTransferState = Object.assign({ secret: secret }, createMediatedTransfer(new util.BN(123),
      new util.BN(10),
      new util.BN(0),
      address,
      util.sha3(secret),
      target.address, // to
      target.address, // target
      initiator.address, // initiator
      {
        amount: new util.BN(100),
        expiration: currentBlock.add(channel.SETTLE_TIMEOUT),
        hashLock: util.sha3(secret)
      }))

    Initiator = stateMachine.InitiatorFactory()
    Target = stateMachine.TargetFactory()

    Initiator.on('*', function (event, state) {
      if (event.startsWith('GOT.')) {
        serialEvents.push(event)
      }
      initiatorEvents.push(state)
    })
    Target.on('*', function (event, state) {
      if (event.startsWith('GOT.')) {
        serialEvents.push(event)
      }

      targetEvents.push(state)
    })
  }

  t.test('test full state machine lifecyle between initiator and target', function (assert) {
    setup(assert)

    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')
    assertEmit('GOT.sendMediatedTransfer')
    // send a mediated transfer

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[initiatorEvents.length - 1].client)
    mediatedTransfer.sign(initiator.pk)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    Target.handle(receivedMT, 'init', currentBlock)
    assertState(assert, receivedMT, 'awaitRevealSecret')
    assertEmit('GOT.sendRequestSecret')

    var requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)

    var receivedRS = new message.RequestSecret(JSON.parse(JSON.stringify(requestSecret), message.JSON_REVIVER_FUNC))
    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', receivedRS)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    assertEmit('GOT.sendRevealSecret')

    var revealSecret = createRevealSecret(initiatorEvents[initiatorEvents.length - 1].client.target, initiatorEvents[initiatorEvents.length - 1].client.secret)
    try {
      Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    } catch (err) {
      assert.equals(err.message, 'no signature to recover address from', 'state should not move ahead incase secret is learned through blockchain or leak')
    }
    assertState(assert, receivedMT, 'awaitRevealSecret')

    revealSecret.sign(initiator.pk)
    Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    assertState(assert, receivedMT, 'awaitSecretToProof')
    assertEmit('GOT.sendRevealSecret')

    var targetRS = createRevealSecret(targetEvents[targetEvents.length - 1].client.from, targetEvents[targetEvents.length - 1].client.secret)
    try {
      Initiator.handle(mediatedTransferState, 'receiveRevealSecret', targetRS)
    } catch (err) {
      assert.equals(err.message, 'no signature to recover address from', 'state should not move ahead incase revealSecret is not sent by to')
    }
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    targetRS.sign(target.pk)
    Initiator.handle(mediatedTransferState, 'receiveRevealSecret', targetRS)
    assertState(assert, mediatedTransferState, 'completedTransfer')
    assertState(assert, receivedMT, 'awaitSecretToProof')
    assertEmit('GOT.sendSecretToProof')

    var secretToProof = createSecretToProof(initiatorEvents[initiatorEvents.length - 1].msgID,
      initiatorEvents[initiatorEvents.length - 1].nonce,
      initiatorEvents[initiatorEvents.length - 1].transferredAmount,
      initiatorEvents[initiatorEvents.length - 1].channelAddress,
      initiatorEvents[initiatorEvents.length - 1].locksRoot,
      initiatorEvents[initiatorEvents.length - 1].to,
      initiatorEvents[initiatorEvents.length - 1].secret)
    secretToProof.sign(initiator.pk)

    var receivedSTP = new message.SecretToProof(JSON.parse(JSON.stringify(secretToProof), message.JSON_REVIVER_FUNC))
    Target.handle(receivedMT, 'receiveSecretToProof', receivedSTP)
    assertState(assert, receivedMT, 'completedTransfer')

    assert.end()
    // body...
  })

  t.test('initiator: invalid secret request should not move state ahead', function (assert) {
    setup(assert)

    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')
    assertEmit('GOT.sendMediatedTransfer')
    // send a mediated transfer

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[initiatorEvents.length - 1].client)
    mediatedTransfer.sign(initiator.pk)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    Target.handle(receivedMT, 'init', currentBlock)
    assertState(assert, receivedMT, 'awaitRevealSecret')
    assertEmit('GOT.sendRequestSecret')

    // invalid hashLock
    var requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: util.sha3('SECRET2'),
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)

    var receivedRS = new message.RequestSecret(JSON.parse(JSON.stringify(requestSecret), message.JSON_REVIVER_FUNC))
    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', receivedRS)
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')

    // //invalid amount
    // requestSecret =  new message.RequestSecret({to:targetEvents[targetEvents.length-1].client.from,
    //   msgID: targetEvents[targetEvents.length-1].client.msgID,
    //   hashLock:targetEvents[targetEvents.length-1].client.lock.hashLock,
    //   amount:new util.BN(123123123123)});
    // requestSecret.sign(target.pk);

    // receivedRS = new message.RequestSecret(JSON.parse(JSON.stringify(requestSecret),message.JSON_REVIVER_FUNC));
    // Initiator.handle(mediatedTransferState,'receiveRequestSecret',receivedRS);
    // assertState(assert,mediatedTransferState, 'awaitRequestSecret');

    // invalid msgID
    requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: new util.BN(3),
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)
    receivedRS = new message.RequestSecret(JSON.parse(JSON.stringify(requestSecret), message.JSON_REVIVER_FUNC))
    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', receivedRS)
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')

    // invalid signature
    requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(pkAddr[2].pk)
    receivedRS = new message.RequestSecret(JSON.parse(JSON.stringify(requestSecret), message.JSON_REVIVER_FUNC))
    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', receivedRS)
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')

    assert.end()
  })

  t.test('target: invalid secret reveal from Initiator should not move state ahead', function (assert) {
    setup(assert)

    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')
    assertEmit('GOT.sendMediatedTransfer')
    // send a mediated transfer

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[initiatorEvents.length - 1].client)
    mediatedTransfer.sign(initiator.pk)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    Target.handle(receivedMT, 'init', currentBlock)
    assertState(assert, receivedMT, 'awaitRevealSecret')
    assertEmit('GOT.sendRequestSecret')

    var requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)

    var receivedRS = new message.RequestSecret(JSON.parse(JSON.stringify(requestSecret), message.JSON_REVIVER_FUNC))
    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', receivedRS)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    assertEmit('GOT.sendRevealSecret')

    // improperly signed reveal secret
    var revealSecret = createRevealSecret(initiatorEvents[initiatorEvents.length - 1].client.target, initiatorEvents[initiatorEvents.length - 1].client.secret)
    revealSecret.sign(pkAddr[2].pk)
    Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    assertState(assert, receivedMT, 'awaitRevealSecret')

    // imporper secret
    revealSecret = createRevealSecret(initiatorEvents[initiatorEvents.length - 1].client.target, 'SECRET2')
    revealSecret.sign(initiator.pk)
    Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    assertState(assert, receivedMT, 'awaitRevealSecret')

    assert.end()
  })

  t.test('initiator: invalid  secret reveal from Target should keep same state', function (assert) {
    setup(assert)

    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')
    assertEmit('GOT.sendMediatedTransfer')
    // send a mediated transfer

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[initiatorEvents.length - 1].client)
    mediatedTransfer.sign(initiator.pk)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    Target.handle(receivedMT, 'init', currentBlock)
    assertState(assert, receivedMT, 'awaitRevealSecret')
    assertEmit('GOT.sendRequestSecret')

    var requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)

    var receivedRS = new message.RequestSecret(JSON.parse(JSON.stringify(requestSecret), message.JSON_REVIVER_FUNC))
    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', receivedRS)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    assertEmit('GOT.sendRevealSecret')

    var revealSecret = createRevealSecret(initiatorEvents[initiatorEvents.length - 1].client.target, initiatorEvents[initiatorEvents.length - 1].client.secret)
    try {
      Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    } catch (err) {
      assert.equals(err.message, 'no signature to recover address from', 'state should not move ahead incase secret is learned through blockchain or leak')
    }
    assertState(assert, receivedMT, 'awaitRevealSecret')

    revealSecret.sign(initiator.pk)
    Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    assertState(assert, receivedMT, 'awaitSecretToProof')
    assertEmit('GOT.sendRevealSecret')

    // invalid signature
    var targetRS = createRevealSecret(targetEvents[targetEvents.length - 1].client.from, targetEvents[targetEvents.length - 1].client.secret)
    targetRS.sign(pkAddr[2].pk)
    Initiator.handle(mediatedTransferState, 'receiveRevealSecret', targetRS)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')

    // invalid secret
    targetRS = createRevealSecret(targetEvents[targetEvents.length - 1].client.from, 'SECRET2')
    targetRS.sign(target.pk)
    Initiator.handle(mediatedTransferState, 'receiveRevealSecret', targetRS)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')

    assert.end()
  })

  t.test('target: invalid secretToProof should not move state ahead', function (assert) {
    setup(assert)

    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')
    assertEmit('GOT.sendMediatedTransfer')
    // send a mediated transfer

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[initiatorEvents.length - 1].client)
    mediatedTransfer.sign(initiator.pk)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    Target.handle(receivedMT, 'init', currentBlock)
    assertState(assert, receivedMT, 'awaitRevealSecret')
    assertEmit('GOT.sendRequestSecret')

    var requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)

    var receivedRS = new message.RequestSecret(JSON.parse(JSON.stringify(requestSecret), message.JSON_REVIVER_FUNC))
    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', receivedRS)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    assertEmit('GOT.sendRevealSecret')

    var revealSecret = createRevealSecret(initiatorEvents[initiatorEvents.length - 1].client.target, initiatorEvents[initiatorEvents.length - 1].client.secret)
    try {
      Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    } catch (err) {
      assert.equals(err.message, 'no signature to recover address from', 'state should not move ahead incase secret is learned through blockchain or leak')
    }
    assertState(assert, receivedMT, 'awaitRevealSecret')

    revealSecret.sign(initiator.pk)
    Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    assertState(assert, receivedMT, 'awaitSecretToProof')
    assertEmit('GOT.sendRevealSecret')

    var targetRS = createRevealSecret(targetEvents[targetEvents.length - 1].client.from, targetEvents[targetEvents.length - 1].client.secret)
    try {
      Initiator.handle(mediatedTransferState, 'receiveRevealSecret', targetRS)
    } catch (err) {
      assert.equals(err.message, 'no signature to recover address from', 'state should not move ahead incase revealSecret is not sent by to')
    }
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    targetRS.sign(target.pk)
    Initiator.handle(mediatedTransferState, 'receiveRevealSecret', targetRS)
    assertState(assert, mediatedTransferState, 'completedTransfer')
    assertState(assert, receivedMT, 'awaitSecretToProof')
    assertEmit('GOT.sendSecretToProof')

    var secretToProof = createSecretToProof(initiatorEvents[initiatorEvents.length - 1].msgID,
      initiatorEvents[initiatorEvents.length - 1].nonce,
      initiatorEvents[initiatorEvents.length - 1].transferredAmount,
      initiatorEvents[initiatorEvents.length - 1].channelAddress,
      initiatorEvents[initiatorEvents.length - 1].locksRoot,
      initiatorEvents[initiatorEvents.length - 1].to,
      initiatorEvents[initiatorEvents.length - 1].secret)
    secretToProof.sign(pkAddr[2].pk)

    var receivedSTP = new message.SecretToProof(JSON.parse(JSON.stringify(secretToProof), message.JSON_REVIVER_FUNC))
    Target.handle(receivedMT, 'receiveSecretToProof', receivedSTP)
    assertState(assert, receivedMT, 'awaitSecretToProof')

    assert.end()
    // body...
  })

  t.test('target: handle not safe to request secret beacuase lock is expired should move state to expiredTransfer', function (assert) {
    setup(assert)

    // create a mediated transfer state object
    mediatedTransferState = Object.assign({ secret: secret }, createMediatedTransfer(new util.BN(123),
      new util.BN(10),
      new util.BN(0),
      address,
      util.sha3(secret),
      address,
      address,
      address, {
        amount: new util.BN(100),
        expiration: currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(2)),
        hashLock: util.sha3(secret)
      }))

    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[0].client)
    mediatedTransfer.sign(privateKey)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    // current block moved ahead, should not accept mediated transfer
    Target.handle(receivedMT, 'init', currentBlock.add(new util.BN(2)))

    assertEmit('GOT.sendMediatedTransfer')
    assert.equals(serialEvents.length, 1, true)
    assertState(assert, receivedMT, 'expiredTransfer')
    assert.end()
  })

  t.test('target: handle block that expires lock when waiting for secret reveal should expire transfer', function (assert) {
    setup(assert)
    // create a mediated transfer that expires in REVEAL_TIMEOUT + 1

    var newExpiration = currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(5))
    mediatedTransferState = Object.assign({ secret: secret }, createMediatedTransfer(new util.BN(123),
      new util.BN(10),
      new util.BN(0),
      address,
      util.sha3(secret),
      target.address, // to
      target.address, // target
      initiator.address, // initiator
      {
        amount: new util.BN(100),
        expiration: newExpiration,
        hashLock: util.sha3(secret)
      }))
    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')
    assertEmit('GOT.sendMediatedTransfer')
    // send a mediated transfer

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[initiatorEvents.length - 1].client)
    mediatedTransfer.sign(initiator.pk)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    Target.handle(receivedMT, 'init', currentBlock.add(new util.BN(4)))
    assertState(assert, receivedMT, 'awaitRevealSecret')
    assertEmit('GOT.sendRequestSecret')

    var requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)

    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', requestSecret)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    assertEmit('GOT.sendRevealSecret')

    assert.equals(serialEvents.length, 3, true)

    Target.handle(receivedMT, 'handleBlock', currentBlock.add(new util.BN(5)))
    assertState(assert, receivedMT, 'expiredTransfer')

    var revealSecret = createRevealSecret(initiatorEvents[initiatorEvents.length - 1].client.target, initiatorEvents[initiatorEvents.length - 1].client.secret)
    revealSecret.sign(initiator.pk)
    Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    assertState(assert, receivedMT, 'expiredTransfer')
    assertEmit('GOT.sendRevealSecret')
    assert.equals(serialEvents.length, 3, true)

    assert.end()
  })

  t.test('target: handle block that DOES NOT expires lock when waiting for secret reveal should NOT expire transfer', function (assert) {
    setup(assert)

    var newExpiration = currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(3))
    mediatedTransferState = Object.assign({ secret: secret }, createMediatedTransfer(new util.BN(123),
      new util.BN(10),
      new util.BN(0),
      address,
      util.sha3(secret),
      target.address, // to
      target.address, // target
      initiator.address, // initiator
      {
        amount: new util.BN(100),
        expiration: newExpiration,
        hashLock: util.sha3(secret)
      }))
    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')
    assertEmit('GOT.sendMediatedTransfer')
    // send a mediated transfer

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[initiatorEvents.length - 1].client)
    mediatedTransfer.sign(initiator.pk)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    Target.handle(receivedMT, 'init', currentBlock.add(new util.BN(1)))
    assertState(assert, receivedMT, 'awaitRevealSecret')
    assertEmit('GOT.sendRequestSecret')

    var requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)

    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', requestSecret)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    assertEmit('GOT.sendRevealSecret')
    assert.equals(serialEvents.length, 3, true)

    Target.handle(receivedMT, 'handleBlock', currentBlock.add(new util.BN(2)))
    assertState(assert, receivedMT, 'awaitRevealSecret')

    var revealSecret = createRevealSecret(initiatorEvents[initiatorEvents.length - 1].client.target, initiatorEvents[initiatorEvents.length - 1].client.secret)
    revealSecret.sign(initiator.pk)
    Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    assertState(assert, receivedMT, 'awaitSecretToProof')
    assertEmit('GOT.sendRevealSecret')
    assert.equals(serialEvents.length, 4, true)

    assert.end()
  })

  t.test('target: handleBlock during awaitSecretToProof that doesnt timeout should stay in awaitSecretToProof', function (assert) {
    setup(assert)

    var newExpiration = currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(4))
    mediatedTransferState = Object.assign({ secret: secret }, createMediatedTransfer(new util.BN(123),
      new util.BN(10),
      new util.BN(0),
      address,
      util.sha3(secret),
      target.address, // to
      target.address, // target
      initiator.address, // initiator
      {
        amount: new util.BN(100),
        expiration: newExpiration,
        hashLock: util.sha3(secret)
      }))
    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')
    assertEmit('GOT.sendMediatedTransfer')
    // send a mediated transfer

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[initiatorEvents.length - 1].client)
    mediatedTransfer.sign(initiator.pk)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    Target.handle(receivedMT, 'init', currentBlock.add(new util.BN(1)))
    assertState(assert, receivedMT, 'awaitRevealSecret')
    assertEmit('GOT.sendRequestSecret')

    var requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)

    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', requestSecret)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    assertEmit('GOT.sendRevealSecret')
    assert.equals(serialEvents.length, 3, true)

    Target.handle(receivedMT, 'handleBlock', currentBlock.add(new util.BN(2)))
    assertState(assert, receivedMT, 'awaitRevealSecret')

    var revealSecret = createRevealSecret(initiatorEvents[initiatorEvents.length - 1].client.target, initiatorEvents[initiatorEvents.length - 1].client.secret)
    revealSecret.sign(initiator.pk)
    Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    assertState(assert, receivedMT, 'awaitSecretToProof')
    assertEmit('GOT.sendRevealSecret')
    assert.equals(serialEvents.length, 4, true)

    Target.handle(receivedMT, 'handleBlock', currentBlock.add(new util.BN(3)))
    assertState(assert, receivedMT, 'awaitSecretToProof')
    assertEmit('GOT.sendRevealSecret')
    assert.equals(serialEvents.length, 4, true)
    assert.end()
  })

  t.test('target: handleBlock during awaitSecretToProof causing timeout should initiate a close channel and move to completedTransfer', function (assert) {
    setup(assert)

    var newExpiration = currentBlock.add(channel.REVEAL_TIMEOUT).add(new util.BN(3))
    mediatedTransferState = Object.assign({ secret: secret }, createMediatedTransfer(new util.BN(123),
      new util.BN(10),
      new util.BN(0),
      address,
      util.sha3(secret),
      target.address, // to
      target.address, // target
      initiator.address, // initiator
      {
        amount: new util.BN(100),
        expiration: newExpiration,
        hashLock: util.sha3(secret)
      }))
    Initiator.handle(mediatedTransferState, 'init')
    assertState(assert, mediatedTransferState, 'awaitRequestSecret')
    assertEmit('GOT.sendMediatedTransfer')
    // send a mediated transfer

    var mediatedTransfer = new message.MediatedTransfer(initiatorEvents[initiatorEvents.length - 1].client)
    mediatedTransfer.sign(initiator.pk)
    var receivedMT = new message.MediatedTransfer(JSON.parse(JSON.stringify(mediatedTransfer), message.JSON_REVIVER_FUNC))

    Target.handle(receivedMT, 'init', currentBlock.add(new util.BN(1)))
    assertState(assert, receivedMT, 'awaitRevealSecret')
    assertEmit('GOT.sendRequestSecret')

    var requestSecret = new message.RequestSecret({
      to: targetEvents[targetEvents.length - 1].client.from,
      msgID: targetEvents[targetEvents.length - 1].client.msgID,
      hashLock: targetEvents[targetEvents.length - 1].client.lock.hashLock,
      amount: targetEvents[targetEvents.length - 1].client.lock.amount
    })
    requestSecret.sign(target.pk)

    Initiator.handle(mediatedTransferState, 'receiveRequestSecret', requestSecret)
    assertState(assert, mediatedTransferState, 'awaitRevealSecret')
    assertEmit('GOT.sendRevealSecret')
    assert.equals(serialEvents.length, 3, true)

    Target.handle(receivedMT, 'handleBlock', currentBlock.add(new util.BN(2)))
    assertState(assert, receivedMT, 'awaitRevealSecret')

    var revealSecret = createRevealSecret(initiatorEvents[initiatorEvents.length - 1].client.target, initiatorEvents[initiatorEvents.length - 1].client.secret)
    revealSecret.sign(initiator.pk)
    Target.handle(receivedMT, 'receiveRevealSecret', revealSecret)
    assertState(assert, receivedMT, 'awaitSecretToProof')
    assertEmit('GOT.sendRevealSecret')
    assert.equals(serialEvents.length, 4, true)

    Target.handle(receivedMT, 'handleBlock', currentBlock.add(new util.BN(3)))
    assertState(assert, receivedMT, 'completedTransfer')
    assertEmit('GOT.closeChannel')
    assert.equals(serialEvents.length, 5, true)
    assert.end()
  })
})
