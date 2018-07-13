/*
* @Author: amitshah
* @Date:   2018-04-09 12:58:48
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-18 00:54:30
*/
var test = require('tape')
var util = require('ethereumjs-util')

var message = require('../lib/state-channel/message')

var privateKey = util.toBuffer('0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109')
var publicKey = util.privateToPublic(privateKey)
var address = util.pubToAddress(publicKey)
// var channelAddress = address.toString('hex')

test('test messages', function (t) {
  var proofMessage = new message.ProofMessage({ channelAddress: address })
  proofMessage.getMessageHash = function () {
    return message.EMPTY_32BYTE_BUFFER
  }
  var hash = proofMessage.getHash()
  console.log(proofMessage.locksRoot.toString('hex'))
  console.log(proofMessage.channelAddress.toString('hex'))

  proofMessage.sign(privateKey)

  console.log('"' + util.addHexPrefix(hash.toString('hex')) + '",' + proofMessage.signature.v + ',"' + util.addHexPrefix(proofMessage.signature.r.toString('hex')) + '","' +
    util.addHexPrefix(proofMessage.signature.s.toString('hex')) + '"')

  t.test('hash equal to solidity packing', function (assert) {
    /*
    function hashTest(uint256 nonce ,uint256 transferredAmount, address channel,bytes32 locksRoot, bytes32 hash) constant returns(bytes32){
        return sha3(nonce,transferredAmount,channel,locksRoot,hash);
    }

  */
    assert.equals(hash.compare(util.toBuffer('0x85c40f612a577599364576fca83b64dabc9ed0e8549379bc7b75facab3d55e7a')), 0)
    assert.end()
  })

  t.test('signature recovorable via solidity', function (assert) {
    /*
    function verifyMessage(bytes32 _message, uint8 _v, bytes32 _r, bytes32 _s) public constant returns (address)  {
      bytes memory prefix = "\x19Ethereum Signed Message:\n32";
      bytes32 prefixedHash = sha3(prefix, _message);
      address signer = ecrecover(prefixedHash, _v, _r, _s);
      return signer;
    }
    */
    assert.equals(proofMessage.signature.v, 27)
    assert.equals(util.addHexPrefix(proofMessage.signature.r.toString('hex')), '0x849949170a38fe5100c8e59e64787df9a90507d82e25793a6419b5f69e627c94')
    assert.equals(util.addHexPrefix(proofMessage.signature.s.toString('hex')), '0x23358f9edad2cbbec9dad2737adcdaa60c3044ddfeb020bae0648d64fc1ae836')
    assert.end()
  })

  t.test('recover address from signature in javascript', function (assert) {
    assert.equals(proofMessage.from.compare(address), 0)
    assert.end()
  })

  t.test('can serialize and deserialise message proof', function (assert) {
    var serialized = JSON.stringify(proofMessage)
    var recoveredProofMessage = new message.ProofMessage(JSON.parse(serialized, message.jsonReviver))


    recoveredProofMessage.getMessageHash = function () {
      return message.EMPTY_32BYTE_BUFFER
    }
    assert.equals(recoveredProofMessage.signature.v, 27)
    assert.equals(util.addHexPrefix(recoveredProofMessage.signature.r.toString('hex')), '0x849949170a38fe5100c8e59e64787df9a90507d82e25793a6419b5f69e627c94')
    assert.equals(util.addHexPrefix(recoveredProofMessage.signature.s.toString('hex')), '0x23358f9edad2cbbec9dad2737adcdaa60c3044ddfeb020bae0648d64fc1ae836')
    assert.equals(recoveredProofMessage.from.compare(address), 0)
    assert.end()
  })

  t.test('unsigned message should throw error when recovering from', function (assert) {
    var serialized = JSON.stringify(proofMessage)
    var recoveredProofMessage = new message.ProofMessage(JSON.parse(serialized, message.jsonReviver))

    console.log(JSON.stringify(recoveredProofMessage))

    recoveredProofMessage.getMessageHash = function () {
      return message.EMPTY_32BYTE_BUFFER
    }
    recoveredProofMessage.signature = null
    assert.throws(function () {
      recoveredProofMessage.from // eslint-disable-line
    }, 'no signature to recover address from', 'Should throw no signature error')

    assert.end()
  })

  t.test('test LockedTransfer', function (assert) {
    var secret = util.toBuffer('0x849949170a38fe5100c8e59e64787df9a90507d82e25793a6419b5f69e627c94')
    var lockedTransfer = new message.LockedTransfer({
      nonce: new util.BN(1),
      msgID: new util.BN(17),
      transferredAmount: new util.BN(1200),
      locksRoot: util.toBuffer('0x23358f9edad2cbbec9dad2737adcdaa60c3044ddfeb020bae0648d64fc1ae836'),
      channelAddress: address,
      lock: {
        amount: new util.BN(50),
        expiration: new util.BN(1200),
        hashLock: util.sha3(secret)
      }
    })
    assert.throws(function () {
      lockedTransfer.from // eslint-disable-line
    }, 'no signature to recover address from', 'Should throw no signature error')
    lockedTransfer.sign(privateKey)

    assert.equals(lockedTransfer.from.compare(address), 0)
    var serialized = JSON.stringify(lockedTransfer)

    var recoverdLockTransfer = new message.LockedTransfer(JSON.parse(serialized, message.jsonReviver))
    assert.equals(recoverdLockTransfer.nonce.eq(new util.BN(1)), true)
    assert.equals(recoverdLockTransfer.msgID.eq(new util.BN(17)), true)
    assert.equals(recoverdLockTransfer.lock.amount.eq(new util.BN(50)), true)
    assert.equals(recoverdLockTransfer.lock.expiration.eq(new util.BN(1200)), true)
    assert.equals(recoverdLockTransfer.lock.hashLock.compare(util.sha3(secret)), 0)
    assert.equals(lockedTransfer.signature.r.compare(recoverdLockTransfer.signature.r), 0)
    assert.equals(lockedTransfer.signature.s.compare(recoverdLockTransfer.signature.s), 0)
    assert.equals(lockedTransfer.signature.v, recoverdLockTransfer.signature.v)
    assert.equals(recoverdLockTransfer.from.compare(lockedTransfer.from), 0)
    assert.equals(recoverdLockTransfer.from.compare(address), 0)

    recoverdLockTransfer.lock.amount = recoverdLockTransfer.lock.amount.add(new util.BN(10))
    assert.equals(recoverdLockTransfer.lock.amount.eq(new util.BN(60)), true)

    assert.end()
  })

  t.test('can encode lock', function (assert) {
    var lock = new message.Lock({
      amount: new util.BN(10),
      expiration: new util.BN(20),
      hashLock: util.sha3(util.toBuffer('SECRET1'))
    })

    assert.equals(lock.encode().toString('hex'), '000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000014b8c5926ff513010d19bc9c549d21e8514c5577ef228eff65e3b6bc29a0e25ad2')
    assert.end()
  })
})
