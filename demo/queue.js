const path = require('path')
const Rx = require('rxjs')
const persist = require('node-persist')

global.fetch = require('node-fetch')

const SendQueue = require('../lib/index').SendQueue

persist.initSync({
  dir: path.join(__dirname, '/queue.dat/')
})
const queue = new SendQueue({
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

Rx.Observable.timer(0, 1000)
  .do(() => console.log('DEMO-SENDING'))
  .do(() =>
    queue.send({
      url: 'http://localhost:8123',
      headers: {},
      method: 'GET'
    }))
  .subscribe()
