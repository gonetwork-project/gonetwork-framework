import { Engine } from '../state-channel'
import { BlockchainService } from '../blockchain'
import { P2P } from '../p2p/p2p'

import * as cfg from './config'

import { fakeStorage, CHAIN_ID } from '../utils'
import { Address } from 'eth-types'

export type ContractAddress = {
  manager: Address, hsToken: Address, gotToken: Address
}

export const setupClient = (accountIndex: number, contracts: ContractAddress) => {
  const account = cfg.accounts[accountIndex]
  if (!account) throw new Error('NO ACCOUNT FOUND')

  const p2p = new P2P({
    mqttUrl: cfg.mqttUrl,
    address: account.addressStr,
    storage: fakeStorage()
  })

  const blockchain = new BlockchainService({
    ...contracts,
    chainId: CHAIN_ID.GETH_PRIVATE_CHAINS,
    owner: account.address,
    signatureCb: (cb) => cb(account.privateKey),
    providerUrl: cfg.rpcUrl
  })

  const engine = new Engine(account.address, (msg) => msg.sign(account.privateKey), blockchain)

}
