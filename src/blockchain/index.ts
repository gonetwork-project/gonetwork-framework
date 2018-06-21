import { fakeStorage } from './blockchain-utils'
import rpcCreate from './rpc'
import { Monitoring } from './monitoring'

import { ServiceCreate } from './types'

export const serviceCreate: ServiceCreate = cfg => {
  const rpc = rpcCreate(cfg.providerUrl)
  const monitoring = new Monitoring({
    rpc,
    channelManagerAddress: cfg.manager,
    tokenAddresses: [cfg.token, cfg.hsToken],
    storage: fakeStorage()
  })

  return Object.assign({}, rpc, monitoring)
}
