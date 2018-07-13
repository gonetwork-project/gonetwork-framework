import * as util from 'ethereumjs-util'

import { channel, message, merkletree } from '..'
import { BlockNumber, Address } from 'eth-types'

import { setup, pkAddr, channelAddress, TestEventBus } from './engine-setup'
import { assertChannelState, assertProof, assert } from './engine-assert'
import { add1, as } from '../../utils'

describe('test engine - mediated transfer', () => {
  test('component test: #1) e2e engine mediated transfer #2)engine 1 responds with transferUpdate when it receives a channelClose event as it did not issue close',
    (done) => {
      let { engine, engine2, currentBlock, sendQueue, mockBlockChain, blockchainQueue } = setup()

      currentBlock = add1(currentBlock)

      assert.equal(sendQueue.length, 0, 'send mediated transfer')

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
      assertChannelState(
        engine, channelAddress,
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      let mediatedTransfer = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

      engine2.onMessage(mediatedTransfer as any)
      assert.equal(sendQueue.length, 2, 'requestSecret in send queu')

      assertChannelState(
        engine, channelAddress,
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
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
      engine.onMessage(revealSecretTarget)

      // TEST #1 states should be synced
      assertChannelState(
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)

      assert.equal(sendQueue.length, 5, 'reveal secret in send queue from target -> initiator')
      let secretToProof = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
      assert.equal(secretToProof instanceof message.SecretToProof, true, 'secretToProof generated by initiator')
      engine2.onMessage(secretToProof)

      assertChannelState(
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
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
      assertProof(blockchainQueue[0], as.Nonce(2), channelAddress, as.Wei(50), message.EMPTY_32BYTE_BUFFER, engine.address)
      assert.equal(mockBlockChain.cmdQueue.length, 1)
      assert.equal(mockBlockChain.cmdQueue[0], 'closeChannel')

      currentBlock = add1(currentBlock)

      engine.onChannelClose(channelAddress, engine2.address)
        .then(() => {
          engine.withdrawPeerOpenLocks(channelAddress)
          assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_CLOSED)
          assert.equal(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
          assert.equal(blockchainQueue.length, 2, 'engine(2) did not send any transfers to engine(1) so no close proof needed by engine(1)')
          assert.equal(mockBlockChain.cmdQueue.length, 2)
          assert.equal(mockBlockChain.cmdQueue[0], 'closeChannel')
          assert.equal(mockBlockChain.cmdQueue[1], 'updateTransfer')
          done()
        })
    })

  function assertState (state, expectedState) {
    assert.equal(state.__machina__['mediated-transfer'].state, expectedState)
  }

  test('lock expires on engine handleBlock', (done) => {
    let { engine, engine2, currentBlock } = setup()

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
      assertChannelState(
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)
    })
    testEventBus.on('afterReceiving-5', function () {
      // One Secret Completed, Second Secret will timeout before reveal sent
      assertChannelState(
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

      testEventBus.on('beforeReceiving-8', function (msg) {
        // before we apply the reveal secret, we are going to move this ahead and expire the transfer, this should not
        // cause any blockchain events and further processing just moves one without failing
        assert.equal(msg.from.compare(engine2.address), 0)
        // we dont want to send this message, but instead we want to
        // cause the lock to timeout

        assertState(engine.messageState['1'].state, 'awaitRevealSecret')
        engine.onBlock(currentBlock.add(new util.BN(1)) as BlockNumber)
        assertState(engine.messageState['1'].state, 'expiredTransfer')
        done()
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

  test('multiple unopened locks expire on engine handleBlock', (done) => {
    let { engine, engine2, currentBlock, blockchainQueue } = setup()

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
      assertChannelState(
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)
    })
    testEventBus.on('afterReceiving-5', function () {
      // One Secret Completed, Second Secret will timeout before reveal sent

      assertChannelState(
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
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

        assertState(engine.messageState['1'].state, 'awaitRevealSecret')
        assertState(engine.messageState['2'].state, 'awaitRevealSecret')
        engine.onBlock(currentBlock.add(new util.BN(1)) as BlockNumber)
        assert.equal(blockchainQueue.length, 0)

        assertState(engine.messageState['1'].state, 'expiredTransfer')
        assertState(engine.messageState['2'].state, 'awaitRevealSecret')

        assert.equal(blockchainQueue.length, 0)

        engine.onBlock(currentBlock.add(new util.BN(5)) as BlockNumber)
        assertState(engine.messageState['1'].state, 'expiredTransfer')
        assertState(engine.messageState['2'].state, 'expiredTransfer')
        assert.equal(blockchainQueue.length, 0, 'No Blockchain Messages generated as none of the locks are open')
        done()
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

  test('should emit GOT.closeChannel if a lock is open and the currentBlock <= lock.expiration + reveal_timeout', (done) => {
    let { engine, engine2, currentBlock, mockBlockChain, blockchainQueue } = setup()

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
      assertChannelState(
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)
    })
    testEventBus.on('afterReceiving-5', function () {
      // One Secret Completed, Second Secret will timeout before reveal sent
      assertChannelState(
        engine, channelAddress,
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

      assertChannelState(
        engine2, channelAddress,
        new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
        new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

      testEventBus.on('afterReceiving-8', function (msg) {
        // engine.onMessage(msg);
        assertChannelState(
          engine, channelAddress,
          new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
          new util.BN(1), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(120), currentBlock)

        assertChannelState(
          engine2, channelAddress,
          new util.BN(1), new util.BN(327), new util.BN(0), new util.BN(120), new util.BN(0),
          new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

        assert.equal(msg.from.compare(engine2.address), 0)
        // ==================================CORE OF THE TEST
        // aftwer we apply the reveal secret, we are going to move currentBlock ahead and expire the transfer, this should
        // cause any blockchain events and further processing just moves one without failing
        // cause the lock to timeout

        assert.equal(blockchainQueue.length, 0)
        assertState(engine.messageState['1'].state, 'awaitSecretToProof')

        engine.onBlock(currentBlock.add(new util.BN(1)) as BlockNumber)
        assert.equal(blockchainQueue.length, 1)
        assertState(engine.messageState['1'].state, 'completedTransfer')

        assert.equal(mockBlockChain.cmdQueue[0], 'closeChannel', 'first command should be close channel')

        assertProof(blockchainQueue[0], as.Nonce(1), channelAddress, as.Wei(0),
          engine.channels[channelAddress.toString('hex')].peerState.proof.locksRoot, engine2.address)

        // now we have to manually execute withdrawLocks onchain
        engine.withdrawPeerOpenLocks(channelAddress)
        assert.equal(mockBlockChain.cmdQueue[1], 'withdrawPeerOpenLocks', 'next we withdraw open locks')

        assert.equal(blockchainQueue.length, 2, 'only a single lock proof is needed')
        // Assert the withdraw proof

        // arguments: channelAddress, encodedLock, merkleProof,secret,
        let proofArgs = blockchainQueue[1]

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
        expect(function () {
          try {
            engine.onMessage(msg)
          } catch (err) {
            assert.equal(err.message, 'Invalid transfer: cannot update a closing channel')
            throw new Error()
          }
        }).toThrow()
        done()
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
    (done) => {
      let acct1 = pkAddr[0].address
      let acct4 = pkAddr[1].address

      let { engine, engine2, currentBlock, sendQueue } = setup(false)

      engine.onChannelNewBalance(channelAddress, acct1, new util.BN(27))
      engine2.onChannelNewBalance(channelAddress, acct1, new util.BN(27))

      currentBlock = add1(currentBlock)

      // START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)

      // to,target,amount,expiration,secret,hashLock
      let secretHashPair = message.GenerateRandomSecretHashPair()

      engine.sendMediatedTransfer(
        acct4,
        acct4,
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
      engine.onMessage(revealSecretTarget as any)

      let secretToProof = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
      engine2.onMessage(secretToProof as any)

      sendQueue.splice(0)

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        acct1,
        acct1,
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
      sendQueue.splice(0)

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        acct1,
        acct1,
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

      sendQueue.splice(0)

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        acct1,
        acct1,
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

      sendQueue.splice(0)

      secretHashPair = message.GenerateRandomSecretHashPair()

      engine2.sendMediatedTransfer(
        acct1,
        acct1,
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

      assert.equal(channelOne.transferrableFromTo(channelOne.peerState, channelOne.myState, currentBlock).eq(new util.BN(1)), true)
      channelOne = engine2.channels[channelAddress.toString('hex')]
      assert.equal(channelOne.transferrableFromTo(channelOne.myState, channelOne.peerState, currentBlock).eq(new util.BN(1)), true)
      done()
    })

  test('should fail and revert channel state to open when close channel errors out', (done) => {
    let { engine, engine2, currentBlock, mockBlockChain, sendQueue } = setup()

    currentBlock = add1(currentBlock)

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
    assertChannelState(
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    let mediatedTransfer = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])

    engine2.onMessage(mediatedTransfer as any)
    assert.equal(sendQueue.length, 2, 'requestSecret in send queue')

    assertChannelState(
      engine, channelAddress,
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(50), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(
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
    engine.onMessage(revealSecretTarget)

    assertChannelState(
      engine, channelAddress,
      new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(1), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(50), currentBlock)

    assert.equal(sendQueue.length, 5, 'reveal secret in send queue from target -> initiator')
    let secretToProof = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
    assert.equal(secretToProof instanceof message.SecretToProof, true, 'secretToProof generated by initiator')
    engine2.onMessage(secretToProof)

    // final states synchronized
    assertChannelState(
      engine, channelAddress,
      new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)

    assertChannelState(
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(2), new util.BN(501), new util.BN(50), new util.BN(0), new util.BN(0), currentBlock)

    // MAIN PART OF TEST
    assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
    assert.equal(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN);

    (mockBlockChain as any).close = function ({ to }: { to: Address }) {
      assert.equal(engine2.channels[to.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
      this.cmdQueue.push('closeChannel')
      let self = this
      let args = arguments

      return new Promise(function (resolve, reject) {
        self.blockchainQueue.push(args)
        setTimeout(function () {
          reject('CLOSE_FAIL')
        }, 1)
      })
    }

    // REVERT
    engine2.closeChannel(channelAddress)
      // .then(function () {
      // assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
      // })
      .catch(err => {
        expect(err).toBe('CLOSE_FAIL')
        done()
      })
  })
})
