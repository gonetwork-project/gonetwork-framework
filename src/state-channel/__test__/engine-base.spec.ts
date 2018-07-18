import { channel, message } from '..'

import { setup, createEngine, pkAddr, MockBlockchain, channelAddress } from './engine-setup'
import { assertChannelState, assert } from './engine-assert'
import { add1, BN } from '../../utils'

describe('test engine - base', () => {
  test('can initialize engine', () => {
    let engine = createEngine(0)
    // assert engine parameters
    assert.equal(engine.currentBlock.eq(new BN(0)), true, 'currentBlock initialized correctly')
    assert.equal(engine.msgID.eq(new BN(0)), true, 'msgID initialized correctly')
    assert.equal(engine.address.compare(pkAddr[0].address), 0, 'ethereum address set correctly')
  })

  test(`component test: create new channel with 0x ${pkAddr[1].address.toString('hex')}, depositBalance 501,327`,
    () => {
      let currentBlock = new BN(0)
      let engine = createEngine(0);
      (engine as any).blockchain = new MockBlockchain([]) as any
      engine.newChannel(pkAddr[1].address)

      assert.equal(engine.pendingChannels.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
      try {
        engine.newChannel(pkAddr[1].address)
      } catch (err) {
        assert.equal(err.message, 'Invalid Channel: cannot create new channel as channel already exists with peer', 'can handle multiple calls to create new channel')
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
          new BN(0))
      } catch (err) {
        assert.equal(err.message, 'Invalid Channel: cannot add new channel as it already exists', 'can handle duplicate calls to onChannelNew')
      }

      assert.equal(engine.pendingChannels.hasOwnProperty(pkAddr[1].address.toString('hex')), false)
      assert.equal(engine.channels.hasOwnProperty(channelAddress.toString('hex')), true)
      assert.equal(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)

      engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new BN(327))
      engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new BN(501))

      assertChannelState(
        engine, channelAddress, new BN(0), new BN(501), new BN(0), new BN(0), new BN(0),
        new BN(0), new BN(327), new BN(0), new BN(0), new BN(0), currentBlock)

      // try an out of order deposit
      try {
        engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new BN(320))
      } catch (err) {
        assert.equal(err.message, 'Invalid Deposit Amount: deposit must be monotonically increasing')
      }
      assertChannelState(
        engine, channelAddress, new BN(0), new BN(501), new BN(0), new BN(0), new BN(0),
        new BN(0), new BN(327), new BN(0), new BN(0), new BN(0), currentBlock)
    })

  test('component test: e2e engine direct transfer', function () {
    let { engine, engine2, currentBlock, sendQueue } = setup()

    currentBlock = add1(currentBlock)

    // START  A DIRECT TRANSFER FROM ENGINE(0) to ENGINE(1)

    assert.equal(sendQueue.length, 0, 'send direct transfer')
    engine.sendDirectTransfer(pkAddr[1].address, new BN(50))
    // sent but not prcessed yet by engine(1) as expected
    assertChannelState(
      engine, channelAddress,
      new BN(1), new BN(501), new BN(50), new BN(0), new BN(0),
      new BN(0), new BN(327), new BN(0), new BN(0), new BN(0), currentBlock)
    assertChannelState(
      engine2, channelAddress,
      new BN(0), new BN(327), new BN(0), new BN(0), new BN(0),
      new BN(0), new BN(501), new BN(0), new BN(0), new BN(0), currentBlock)

    assert.equal(sendQueue.length, 1, 'send direct transfer')

    let msg = message.deserializeAndDecode(sendQueue[sendQueue.length - 1]) as any
    assert.equal(msg.to.compare(engine2.address), 0, 'send direct has correct address')
    engine2.onMessage(msg)
    assertChannelState(
      engine, channelAddress,
      new BN(1), new BN(501), new BN(50), new BN(0), new BN(0),
      new BN(0), new BN(327), new BN(0), new BN(0), new BN(0), currentBlock)
    assertChannelState(
      engine2, channelAddress,
      new BN(0), new BN(327), new BN(0), new BN(0), new BN(0),
      new BN(1), new BN(501), new BN(50), new BN(0), new BN(0), currentBlock)

    engine2.sendDirectTransfer(pkAddr[0].address, new BN(377))
    msg = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
    assert.equal(sendQueue.length, 2)
    engine.onMessage(msg)

    assertChannelState(
      engine, channelAddress,
      new BN(1), new BN(501), new BN(50), new BN(0), new BN(0),
      new BN(1), new BN(327), new BN(377), new BN(0), new BN(0), currentBlock)
    assertChannelState(
      engine2, channelAddress,
      new BN(1), new BN(327), new BN(377), new BN(0), new BN(0),
      new BN(1), new BN(501), new BN(50), new BN(0), new BN(0), currentBlock)

    // engine2 has no more money left!
    expect(function () {
      try {
        engine2.sendDirectTransfer(pkAddr[0].address, new BN(377))
      } catch (err) {
        assert.equal(err.message, 'Insufficient funds: direct transfer cannot be completed:377 - 377 > 0')
        throw new Error()
      }
    }).toThrow()

    assertChannelState(
      engine, channelAddress,
      new BN(1), new BN(501), new BN(50), new BN(0), new BN(0),
      new BN(1), new BN(327), new BN(377), new BN(0), new BN(0), currentBlock)
    assertChannelState(
      engine2, channelAddress,
      new BN(1), new BN(327), new BN(377), new BN(0), new BN(0),
      new BN(1), new BN(501), new BN(50), new BN(0), new BN(0), currentBlock)

    // now engine(0) tries to send more money then it has
    expect(function () {
      try {
        engine.sendDirectTransfer(pkAddr[1].address, new BN(879))
      } catch (err) {
        assert.equal(err.message, 'Insufficient funds: direct transfer cannot be completed:879 - 50 > 828')
        throw new Error()
      }
    }).toThrow()

    assertChannelState(
      engine, channelAddress,
      new BN(1), new BN(501), new BN(50), new BN(0), new BN(0),
      new BN(1), new BN(327), new BN(377), new BN(0), new BN(0), currentBlock)
    assertChannelState(
      engine2, channelAddress,
      new BN(1), new BN(327), new BN(377), new BN(0), new BN(0),
      new BN(1), new BN(501), new BN(50), new BN(0), new BN(0), currentBlock)

    engine.sendDirectTransfer(pkAddr[1].address, new BN(828))
    msg = message.deserializeAndDecode(sendQueue[sendQueue.length - 1])
    assert.equal(sendQueue.length, 3)
    engine2.onMessage(msg)

    assertChannelState(
      engine, channelAddress,
      new BN(2), new BN(501), new BN(828), new BN(0), new BN(0),
      new BN(1), new BN(327), new BN(377), new BN(0), new BN(0), currentBlock)
    assertChannelState(
      engine2, channelAddress,
      new BN(1), new BN(327), new BN(377), new BN(0), new BN(0),
      new BN(2), new BN(501), new BN(828), new BN(0), new BN(0), currentBlock)

    engine.closeChannel(channelAddress)
    // console.log(engine.channels[channelAddress.toString('hex')].state)
    assert.equal(engine.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_IS_CLOSING)
    assert.equal(engine2.channels[channelAddress.toString('hex')].state, channel.CHANNEL_STATE_OPEN)
  })
})
