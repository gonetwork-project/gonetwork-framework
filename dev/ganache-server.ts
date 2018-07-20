import { exec } from 'child_process'
import { resolve } from 'path'

import * as ganache from 'ganache-core'
import { execIfScript } from './dev-utils'
import { Config } from './config/config'

export const serve = (c: Config) => {
  const options = {
    port: c.ethPort,
    hostname: c.hostname,

    blockTime: c.blockTime / 1000,

    mnemonic: 'dignity upset visa worry warrior donate record enforce time pledge ladder drop',
    default_balance_ether: 10000,
    gasPrice: 200,
    logger: console
  }
  const srv = new ganache.server(options)
  srv.listen(options.port, options.hostname, (err: any) => {
    if (err) {
      console.error(err)
      return
    }

    console.log(`Ganache listening on http://${options.hostname}:${options.port}`)
    exec(`node ${resolve(__dirname, '..', '..', 'lib/tests/init-contracts.js')}`)
  })

  return () => srv.close()
}

execIfScript(serve, !module.parent)
