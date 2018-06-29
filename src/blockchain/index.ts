import { fakeStorage } from '../utils'
import rpcCreate from './rpc'
import { Monitoring } from './monitoring'
import { createContractsProxy } from './contracts-proxy'

import { BlockchainServiceCreate, BlockchainServiceConfig, IBlockchainService } from './types'

export * from './types'

export const serviceCreate: BlockchainServiceCreate = config => {
  const rpc = rpcCreate(config.providerUrl)
  const monitoring = new Monitoring({
    rpc,
    channelManagerAddress: config.manager,
    tokenAddresses: [config.gotToken, config.hsToken],
    storage: fakeStorage()
  })

  const proxy = createContractsProxy({
    signatureCb: config.signatureCb,
    rpc: rpc,
    chainId: config.chainId,
    owner: config.owner
  })

  const txs = Object.assign(proxy.txFull.channel, proxy.txFull.manager, proxy.txFull.token)

  return Object.assign({
    config,
    rpc,
    monitoring,
    txs,
    contractsProxy: proxy
  }, txs)
}

export function BlockchainService (this: IBlockchainService, config: BlockchainServiceConfig) {
  this.config = config
  Object.assign(this, serviceCreate(config))
}
