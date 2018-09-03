import { Observable } from 'rxjs'

import { Engine } from '../state-channel'
import { serviceCreate, setWaitForDefault } from '../blockchain'
import { P2P } from '../p2p/p2p'
import { serialize, deserializeAndDecode, MessageType, SignedMessage } from '../state-channel/message'
import { fakeStorage, CHAIN_ID } from '../utils'
import { Payload } from '../p2p/p2p-types'
import { fromDisk as c, accounts } from './addresses'

import * as cfgBase from './config'
import { Millisecond, Second } from '../types'
import { Address } from 'eth-types'

export const wait = (ms: Millisecond) => new Promise(resolve => setTimeout(resolve, ms))
export const minutes = n => n * 60 * 1000

// TODO: not ideal mechanism - for test we increase block mining frequency
setWaitForDefault({ timeout: 3000, interval: 25 })

export const createSendFn = (ignore: (MessageType[] | '*') = []) => (p2p: P2P, from: Address) => (to: Address, msg: SignedMessage) => {
  if (ignore === '*' || ignore.indexOf(msg.classType) > -1) {
    console.log('MSG-IGNORED', from.toString('hex'), '-->', to.toString('hex'), msg.classType)
    return Promise.resolve(true)
  }
  // console.log('SENDING', account.addressStr, msg.classType, (new Error()).stack!.split('\n')[3])
  // console.log('SENDING', account.addressStr, to.toString('hex'), msg.classType, (new Error()).stack!.split('\n').filter(r => r.includes('/frame/src')).join('\n'))
  return p2p.send(to.toString('hex'), serialize(msg) as Payload)
    .then(v => {
      return v
    })
}

export const setupClient = (accountIndex: number, send = createSendFn([]), config?: Partial<typeof cfgBase>) => {
  const cfg = Object.assign({}, cfgBase, config)
  const account = accounts[accountIndex]
  if (!account) throw new Error('NO ACCOUNT FOUND')

  const p2p = new P2P({
    mqttUrl: cfg.mqttUrl,
    address: account.addressStr,
    storage: fakeStorage()
  })

  const { contracts, run } = c()

  const blockchain = serviceCreate({
    ...contracts,
    chainId: CHAIN_ID.GETH_PRIVATE_CHAINS,
    owner: account.address,
    signatureCb: (cb) => cb(account.privateKey),
    providerUrl: cfg.ethUrl,
    monitoringConfig: cfg.monitoringConfig
  })

  const engine = new Engine({
    address: account.address,
    sign: (msg) => msg.sign(account.privateKey),
    send: send(p2p, account.address),
    blockchain: blockchain,
    settleTimeout: cfg.settleTimeout,
    revealTimeout: cfg.revealTimeout
  })

  const client = { config: cfg, run, contracts, p2p, engine, blockchain, owner: account, txs: blockchain.txs, dispose: () => undefined }
  const sub = Observable.merge(
    client.blockchain.monitoring.blockNumbers()
      .do(bn => client.engine.onBlock(bn)),
    client.blockchain.monitoring.protocolErrors()
      .do(errs => console.warn(`Client-${accountIndex} PROTOCOL-ERRORS ${errs.length}`))
      .do(errs => console.warn(...errs.map(e => e.stack!.split('\n')).map(e => e[0] + '\n' + e[1])))
  ).subscribe()

  // client.blockchain.monitoring.on('*', msg => console.log('C1 <--   ', msg))
  // client.p2p.on('message-received', msg => console.log('C1 <--   ', (deserializeAndDecode(msg) as any).classType))

  client.blockchain.monitoring.on('*', client.engine.onBlockchainEvent)
  client.p2p.on('message-received', msg => client.engine.onMessage(deserializeAndDecode(msg) as any))

  client.dispose = () => {
    sub.unsubscribe()
    client.blockchain.monitoring.dispose()
    client.p2p.dispose()
    return undefined
  }

  return client
}

export type Client = ReturnType<typeof setupClient>
