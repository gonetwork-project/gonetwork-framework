import * as G from 'ganache-core'
import * as cfg from './config'

export const serve = (c: Partial<{ blockTime: number, port: number }> = {}) => {
  const options = {
    port: c.port || 8546,
    hostname: 'localhost',
    mnemonic: cfg.mnemonic,
    default_balance_ether: 10000,
    blockTime: c.blockTime || 2 || 0.05, // todo: support via param
    gasPrice: 200,
    logger: console,
    unlocked_accounts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    secure: false,
    network_id: '*'
  }
  const srv = new G.server(options)
  srv.listen(options.port, options.hostname, (err) => {
    if (err) {
      console.error(err)
      return
    }
    console.log(`ganache server listening on ${options.hostname}:${options.port}`)
  })

  process.on('uncaughtException', function (e) {
    console.log(e.stack)
    process.exit(1)
  })

  // See http://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
  if (process.platform === 'win32') {
    require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })
      .on('SIGINT', function () {
        process.emit('SIGINT')
      })
  }

  process.on('SIGINT', function () {
    // graceful shutdown
    srv.close(function (err) {
      if (err) {
        console.log(err.stack || err)
      }
      process.exit()
    })
  })

  return () => srv.close()
}

if (!module.parent) {
  serve()
}
