const Rx = require('rxjs')
const fs = require('fs')

const persist = require('node-persist')
global.fetch = require('node-fetch')

const Monitoring = require('../lib/index').Monitoring
const infuraMonitoring = require('../lib/index').infuraMonitoring

const persistentPath = __dirname + '/temp/infura.dat'

// todo: make config configurable
let cfg = require('./config/ropsten.monitoring')

try {
  fs.rmdirSync(persistentPath)
} catch (err) { }

persist.initSync({
  dir: __dirname + '/temp/infura.dat'
})

console.log('CONFIG', cfg)

const monitoring = new Monitoring(
  Object.assign(
    infuraMonitoring(cfg.NETWORK, cfg.TOKEN),
    {
      channelManagerAddress: cfg.CHANNEL_MANAGER_ADDRESS,
      tokenAddresses: cfg.TOKEN_ADDRESSES,

      storage: {
        getItem: (id) => persist.get(id),
        setItem: (id, item) => persist.set(id, item),
        getAllKeys: () => Promise.resolve(persist.keys()),

        multiGet: (keys) => Promise.all(keys.map(k =>
          persist.get(k).then(v => ([k, v])))),
        multiSet: (xs) => Promise.all(
          xs.map(x => persist.setItem(x[0], x[1]))
        ).then(() => true).catch(() => false)
      }
    })
)

// monitoring.subscribeChannel('0x4C519D78A78DBF096A2bB567DEda72Be4ea05d5d')
//   .catch(err => console.log('ERR',))

// monitoring.transactionReceipt('0x6b9171e0a25bd22f5bd96196c27121915326400f3746bd32c1c6fca07d609683')
//   .then(tx => console.log('TX', tx))

// monitoring.transactionReceipt('0x57f8edeca8ca78d7d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12')
//   .then(tx => console.log('TX', tx))