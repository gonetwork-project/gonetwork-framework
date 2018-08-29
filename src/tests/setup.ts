import { Engine } from '../state-channel'
import { serviceCreate, setWaitForDefault } from '../blockchain'
import { P2P } from '../p2p/p2p'
import { serialize } from '../state-channel/message'
import { fakeStorage, CHAIN_ID } from '../utils'
import { Payload } from '../p2p/p2p-types'
import { fromDisk as c, accounts } from './addresses'

import * as cfgBase from './config'
import { Millisecond, Second } from '../types'

export const wait = (ms: Millisecond) => new Promise(resolve => setTimeout(resolve, ms))
export const minutes = n => n * 60 * 1000

// TODO: not ideal mechanism - for test we increase block mining frequency
setWaitForDefault({ timeout: 3000, interval: 25 })

export const setupClient = (accountIndex: number, config?: Partial<typeof cfgBase>) => {
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
    send: (to, msg) => {
      console.log('SENDING', msg.classType)
      return p2p.send(to.toString('hex'), serialize(msg) as Payload)
        .then(v => {
          console.log('SENT', v)
          return v
        })
    },
    blockchain: blockchain,
    settleTimeout: cfg.settleTimeout,
    revealTimeout: cfg.revealTimeout
  })

  return { run, contracts, p2p, engine, blockchain, owner: account, txs: blockchain.txs }
}

export type Client = ReturnType<typeof setupClient>

export const evmIncreaseTime = (n: Second) => null
