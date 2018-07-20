import '../observable-add'
// todo will break in a browser environment
(global as any).fetch = require('node-fetch')

import { as } from '../utils'
import { MonitoringConfig } from '../blockchain'

export const mqttUrl = 'ws://localhost:1884'
export const rpcUrl = 'http://localhost:8546'
// export const mqttUrl = 'ws://192.168.1.48:1884'
// export const rpcUrl = 'http://192.168.1.48:8546'

export const monitoringConfig: Partial<MonitoringConfig> = {
  logsInterval: 0.025 * 1000,
  startBlock: 'latest'
}

export const settleTimeout = as.BlockNumber(6)
export const revealTimeout = as.BlockNumber(3)
