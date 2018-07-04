import { fakeStorage } from '../utils'
import rpcCreate, { RPC } from './rpc'
import { Monitoring, MonitoringConfig, waitForValue, setWaitForDefault } from './monitoring'
import { createContractsProxy, ContractsProxy, Txs } from './contracts-proxy'

export {
  Monitoring,
  MonitoringConfig,
  waitForValue,
  setWaitForDefault,
  RPC,
  ContractsProxy
}

import * as E from 'eth-types'

export interface BlockchainServiceConfig {
  providerUrl: string

  monitoringConfig?: Partial<MonitoringConfig>

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
  monitoring: Readonly<Monitoring>
  rpc: Readonly<RPC>
  contractsProxy: Readonly<ContractsProxy>
  txs: Txs
}

export type BlockchainServiceCreate = (cfg: BlockchainServiceConfig) => Readonly<IBlockchainService>

export const serviceCreate: BlockchainServiceCreate = config => {
  const rpc = rpcCreate(config.providerUrl)
  const monitoring = new Monitoring(Object.assign({
    rpc,
    channelManagerAddress: config.manager,
    tokenAddresses: [config.gotToken, config.hsToken],
    storage: fakeStorage(),
    logsInterval: 5000,
    startBlock: 'latest'
  } as MonitoringConfig, config.monitoringConfig))

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
