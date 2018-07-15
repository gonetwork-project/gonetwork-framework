import * as util from 'ethereumjs-util'

import { Engine, channel, message, merkletree } from '..'
import { Address, PrivateKey, BlockNumber } from 'eth-types'
import { assert, assertChannelState } from './engine-assert'

const privateKey = util.toBuffer('0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109') as PrivateKey
const publicKey = util.privateToPublic(privateKey)
export const channelAddress = util.pubToAddress(publicKey) as Address
const events = require('events')

// setup global public/private key pairs
export const pkAddr = [
  {
    pk: util.toBuffer('0xa63c8dec79b2c168b8b76f131df6b14a5e0a1ab0310e0ba652f39bca158884ba') as PrivateKey,
    address: util.toBuffer('0x6877cf5f9af67d622d6c665ea473e0b1a14f99d0') as Address
  },
  {
    pk: util.toBuffer('0x6f1cc905d0a87054c15f183eae89ccc8dc3a79702fdbb47ae337583d22df1a51') as PrivateKey,
    address: util.toBuffer('0x43068d574694419cb76360de33fbd177ecd9d3c6') as Address
  },
  {
    pk: util.toBuffer('0x8dffbd99f8a386c18922a014b5356344a4ac1dbcfe32ee285c3b23239caad10d') as PrivateKey,
    address: util.toBuffer('0xe2b7c4c2e89438c2889dcf4f5ea935044b2ba2b0') as Address
  }
]

export const mockSendFn = (sendQueue: any[]) => (msg: any) => {
  sendQueue.push(message.serialize(msg))
  return Promise.resolve(true)
}

export class TestEventBus extends events.EventEmitter {
  byPass: boolean
  constructor () {
    super()
    this.engine = {}
    this.on('send', this.onReceive)
    this.msgCount = 0
    this.byPass = false
  }

  addEngine (engine) {
    this.engine[engine.address.toString('hex')] = engine

    const self = this
    engine.send = function (msg) {
      const emitter = self
      setTimeout(function () {
        emitter.emit('beforeSending-' + emitter.msgCount, msg)
        if (!self.byPass) {
          emitter.emit('send', message.serialize(msg))
        }
        emitter.emit('afterSending-' + emitter.msgCount, msg)
      }, 100)
    }
  }

  onReceive (packet) {
    this.msgCount++
    const msg = message.deserializeAndDecode(packet)
    this.emit('beforeReceiving-' + this.msgCount, msg)
    if (!this.byPass) {
      this.engine[(msg as any).to.toString('hex')].onMessage(msg)
    }
    this.emit('afterReceiving-' + this.msgCount, msg)
  }
}

export class MockBlockchain {
  cmdQueue = [] as any[]
  config = {}

  monitoring = {
    subscribeAddress: () => Promise.resolve(true)
  }
  rpc: any
  contractsProxy: any
  txs: any

  constructor (readonly blockchainQueue: any[]) { }

  handle (msg) {
    this.blockchainQueue.push(msg)
  }

  close (channelAddress, proof) {
    this.cmdQueue.push('closeChannel')
    const self = this
    const args = arguments
    return new Promise(function (resolve, reject) {
      self.blockchainQueue.push(args)
    })
  }

  updateTransfer (channelAddress, proof, success, error) {
    this.cmdQueue.push('updateTransfer')
    const self = this
    const args = arguments
    return new Promise(function (resolve, reject) {
      self.blockchainQueue.push(args)
      resolve(args)
    })
  }

  withdraw (channelAddress, encodedLock, merkleProof, secret) {
    this.cmdQueue.push('withdrawPeerOpenLocks')
    let self = this
    let args = arguments
    return new Promise(function (resolve, reject) {
      self.blockchainQueue.push(args)
      resolve(1000)
    })
  }

  newChannel (peerAddress, settleTimeout) {
    return new Promise((resolve, reject) => {
      this.cmdQueue.push('newChannel')
      // this.cmdQueue.push([peerAddress,settleTimeout]);
      resolve(channelAddress)
    })
  }

  settle (channelAddress) {
    this.cmdQueue.push('settle')
    let args = arguments
    return new Promise(function (resolve, reject) {
      resolve(args)
    })
  }
}

export function createEngine (pkIndex, blockchainService?) {
  let e = new Engine({
    address: pkAddr[pkIndex].address as Address,
    sign: function (msg) {
      // console.log('SIGNING MESSAGE')
      msg.sign(pkAddr[pkIndex].pk as PrivateKey)
    },
    blockchain: blockchainService,
    send: () => Promise.resolve(true) // not used in tests
  })
  return e
}

export const setup = (withTransactions = true) => {
  let sendQueue = [] as any[]
  let blockchainQueue = [] as any[]
  let currentBlock = new util.BN(0) as BlockNumber
  let engine = createEngine(0)
  let engine2 = createEngine(1)

  // SETUP AND DEPOSIT FOR ENGINES
  engine.send = mockSendFn(sendQueue)
  engine2.send = mockSendFn(sendQueue)

  let mockBlockChain = new MockBlockchain(blockchainQueue);
  (engine as any).blockchain = mockBlockChain as any
  (engine2 as any).blockchain = mockBlockChain as any

  engine.onChannelNew(channelAddress,
    pkAddr[0].address,
    pkAddr[1].address,
    channel.SETTLE_TIMEOUT)
  engine2.onChannelNew(channelAddress,
    pkAddr[0].address,
    pkAddr[1].address,
    channel.SETTLE_TIMEOUT)

  if (withTransactions) {
    engine.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine2.onChannelNewBalance(channelAddress, pkAddr[0].address, new util.BN(501))
    engine.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))
    engine2.onChannelNewBalance(channelAddress, pkAddr[1].address, new util.BN(327))

    assertChannelState(
      engine, channelAddress,
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
    assert.equal(engine.channelByPeer.hasOwnProperty(pkAddr[1].address.toString('hex')), true)
    assertChannelState(
      engine2, channelAddress,
      new util.BN(0), new util.BN(327), new util.BN(0), new util.BN(0), new util.BN(0),
      new util.BN(0), new util.BN(501), new util.BN(0), new util.BN(0), new util.BN(0), currentBlock)
  }

  return { engine, engine2, sendQueue, blockchainQueue, mockBlockChain, currentBlock }
}
