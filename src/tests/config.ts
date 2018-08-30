import '../observable-add'
// todo will break in a browser environment
(global as any).fetch = require('node-fetch')

import { as } from '../utils'
import { MonitoringConfig } from '../blockchain'

export const mqttUrl = 'ws://localhost:1884'
export const ethUrl = 'http://localhost:8546'

export const monitoringConfig: Partial<MonitoringConfig> = {
  logsInterval: 25,
  startBlock: 'latest'
}

export const settleTimeout = as.BlockNumber(10)
export const revealTimeout = as.BlockNumber(5)
