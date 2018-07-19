const path = require('path')
const Rx = require('rxjs')
const readline = require('readline')
const persist = require('node-persist')

const Communication = require('../lib').P2P
const fakeStorage = require('../lib').fakeStorage

const cfg = require('../config/demo.default')

const address = process.argv[2]

if (!address) {
  console.error('Please provide address as the argument.')
  process.exit(1)
}

const msgWaitingForAck = []

persist.initSync({
  dir: path.join(__dirname, '/storage.dat/', address)
})
const comm = new Communication({
  mqttUrl: cfg.MQTT_URL,
  address: address,
  storage: fakeStorage()
  // storage: {
  //   getItem: (id) => persist.get(id),
  //   setItem: (id, item) => persist.set(id, item),
  //   getAllKeys: () => Promise.resolve(persist.keys()),

  //   multiGet: (keys) => Promise.all(keys.map(k =>
  //     persist.get(k).then(v => ([k, v])))),
  //   multiSet: (xs) => Promise.all(
  //     xs.map(x => persist.setItem(x[0], x[1]))
  //   ).then(() => true).catch(() => false)
  // }
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

const status = Rx.Observable
  .fromEvent(comm, 'status-changed')
  .startWith(comm.status)

const handlers = [
  ['send', '[address] [text]',
    (address, message) => comm.send(address, message)
      .then(m => console.log('[MESSAGE SUBMITTED]', m))
  ],
  ['dispose', '', () => comm.dispose()
    .then(() => {
      console.log('[DIPSPOSED]')
      rl.close()
      process.exit(0)
    })
  ]
]

const handleLine = l => {
  const split = l.split(' ')
  const cmd = split.shift()
  const i = handlers.find(x => x[0] === cmd)
  if (!i) {
    console.log('[UNKOWN COMMAND]', l)
  } else {
    i[2](...split)
  }
}

const info = () => {
  console.log('[COMMANDS]')
  handlers.forEach(x => console.log('  ', x[0], x[1]))
  rl.prompt('> ')
}

status
  .do(x => console.log('[STATUS]', x))
  .filter(x => x === 'connected')
  .do(info)
  .switchMap(() =>
    Rx.Observable.merge(
      Rx.Observable.fromEvent(rl, 'line').do(handleLine),
      Rx.Observable.fromEvent(comm, 'message-received')
        .do(m => msgWaitingForAck.push(m))
        .do(m => console.log('[MESSAGE RECEIVED]\n', m)),
      Rx.Observable.fromEvent(comm, 'message-sent')
        .do(m => console.log('[MESSAGE DELIVERED ACK]\n', m.id))

    ))
  .do(() => rl.prompt('> '))
  .subscribe()
