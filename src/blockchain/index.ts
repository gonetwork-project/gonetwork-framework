import { fakeStorage } from '../utils'
import rpcCreate from './rpc'
import { Monitoring } from './monitoring'

import { ServiceCreate } from './types'

export const serviceCreate: ServiceCreate = cfg => {
  const rpc = rpcCreate(cfg.providerUrl)
  const monitoring = new Monitoring({
    rpc,
    channelManagerAddress: cfg.manager,
    tokenAddresses: [cfg.gotToken, cfg.hsToken],
    storage: fakeStorage()
  })

  return Object.assign({}, rpc, monitoring)
}
