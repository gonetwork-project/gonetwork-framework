import { fakeStorage } from '../utils'
import rpcCreate, { RPC } from './rpc'
import * as monitoring from './monitoring'
import { createContractsProxy, ContractsProxy, Txs } from './contracts-proxy'

const Monitoring = monitoring.Monitoring
const waitFor = monitoring.waitForValue

export {
  monitoring,
  waitFor,
  RPC,
  ContractsProxy
}

import * as E from 'eth-types'

export interface BlockchainServiceConfig {
  providerUrl: string
  monitoringInterval: number

  manager: E.Address
  gotToken: E.Address
  hsToken: E.Address

  chainId: E.ChainId

  // todo: Important discuss
  owner: E.Address
  signatureCb: E.SignatureCb
}

export interface IBlockchainService extends Txs {
  config: Readonly<BlockchainServiceConfig>
  monitoring: Readonly<monitoring.Monitoring>
  rpc: Readonly<RPC>
  contractsProxy: Readonly<ContractsProxy>
  txs: Txs
}

export type BlockchainServiceCreate = (cfg: BlockchainServiceConfig) => Readonly<IBlockchainService>

export const serviceCreate: BlockchainServiceCreate = config => {
  const rpc = rpcCreate(config.providerUrl)
  const monitoring = new Monitoring({
    rpc,
    channelManagerAddress: config.manager,
    tokenAddresses: [config.gotToken, config.hsToken],
    storage: fakeStorage(),
    logsInterval: config.monitoringInterval
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
