global.fetch = require('node-fetch')

const monitoringUtils = require('../lib/utils/monitoring-utils')
const infuraMonitoring = require('../lib/index').infuraMonitoring

// todo: make config configurable
let cfg = require('./config/ropsten.monitoring')

const infura = infuraMonitoring(cfg.NETWORK)

monitoringUtils.monitorChanges({
  action: () => infura.blockNumber(),
  onChanged: (n) => console.log('NEW_BLOCK_NUMBER:', n)
})
