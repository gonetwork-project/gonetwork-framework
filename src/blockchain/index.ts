import { fakeStorage } from '../utils'
import rpcCreate from './rpc'
import { Monitoring } from './monitoring'
import { createContractsProxy } from './contracts-proxy'

import { P2P } from '../p2p/p2p'

import { ServiceCreate } from './types'

export const serviceCreate: ServiceCreate = config => {
  const rpc = rpcCreate(config.providerUrl)
  const p2p = new P2P({
    address: 'abc', // fixme
    mqttUrl: config.mqttUrl,
    storage: fakeStorage()
  })
  const monitoring = new Monitoring({
    rpc,
    channelManagerAddress: config.manager,
    tokenAddresses: [config.gotToken, config.hsToken],
    storage: fakeStorage()
  })

  return {
    config,
    p2p,
    rpc,
    monitoring,
    contractsProxy: createContractsProxy({
      signatureCb: config.signatureCb,
      rpc: rpc,
      chainId: config.chainId
    })
  }
}
