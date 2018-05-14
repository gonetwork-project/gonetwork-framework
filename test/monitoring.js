const Rx = require('rxjs')
const fs = require('fs')

const persist = require('node-persist')
global.fetch = require('node-fetch')

const Monitoring = require('../lib/index').Monitoring
const infuraMonitoring = require('../lib/index').infuraMonitoring

const persistentPath = __dirname + '/temp/infura.dat'

// todo: make config configurable
let cfg = require('./config/ropsten.monitoring')

const deleteFolderRecursive = path => {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

deleteFolderRecursive(persistentPath)


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

Rx.Observable.fromEvent(monitoring, 'ChannelNew')
  .take(10)
  .map(ev => ev.netting_channel.toString('hex'))
  .map(add => `0x${add}`)
  .concatMap(add =>
    Rx.Observable.timer(2500)
      .mapTo(add)
      .do(monitoring.subscribeAddress)
  )
  .subscribe()
