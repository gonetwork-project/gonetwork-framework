import { Engine } from '../state-channel'
import { BlockchainService, serviceCreate } from '../blockchain'
import { P2P } from '../p2p/p2p'

import { fakeStorage, CHAIN_ID } from '../utils'
import { Payload } from '../p2p/p2p-types'
import { readFromDisk as c } from './init-contracts'

import * as cfgBase from './config'

export const setupClient = (accountIndex: number, config?: Partial<typeof cfgBase>) => {
  const cfg = Object.assign({}, cfgBase, config)
  const account = cfg.accounts[accountIndex]
  if (!account) throw new Error('NO ACCOUNT FOUND')

  const p2p = new P2P({
    mqttUrl: cfg.mqttUrl,
    address: account.addressStr,
    storage: fakeStorage()
  })

  const [contracts, run] = c()

  const blockchain = serviceCreate({
    ...contracts,
    chainId: CHAIN_ID.GETH_PRIVATE_CHAINS,
    owner: account.address,
    signatureCb: (cb) => cb(account.privateKey),
    providerUrl: cfg.rpcUrl,
    monitoringInterval: cfg.monitoringInterval
  })

  // seems that ganache-cli always return empty array if address set
  // the other problem seems to be that fromBlock and toBlock are ignored
  // todo: investigate it further
  const getLogs = blockchain.rpc.getLogs;
  (blockchain.rpc.getLogs as any) = (ps) => {
    return getLogs({ fromBlock: ps.fromBlock, toBlock: ps.toBlock })
      .then(logs => {
        console.log('LOGS-COUNT', accountIndex, logs.length)
        return logs
      })
  }

  const engine = new Engine({
    address: account.address,
    sign: (msg) => msg.sign(account.privateKey),
    send: (to, msg) => p2p.send(to.toString('hex'), msg as Payload),
    blockchain: blockchain
  })

  return { run, contracts, p2p, engine, blockchain, owner: account, txs: blockchain.txs }
}

export type Client = ReturnType<typeof setupClient>
