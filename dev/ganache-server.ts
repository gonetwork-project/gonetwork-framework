import { exec } from 'child_process'
import { resolve } from 'path'

import { server } from 'ganache-core'
import { execIfScript } from './dev-utils'
import { Config } from './config'

export const serve = (c: Config) => {
  const options = {
    port: c.ethPort,
    hostname: c.hostname,

    blockTime: c.blockTime / 1000,

    locked: false,
    mnemonic: 'dignity upset visa worry warrior donate record enforce time pledge ladder drop',
    default_balance_ether: 10000,
    gasPrice: 200,
    logger: console
  }
  const srv = new server(options)
  srv.listen(options.port, options.hostname, (err: any) => {
    if (err) {
      console.error(err)
      return
    }

    const host = `${options.hostname}:${options.port}`

    console.log(`Ganache listening on http://${host}`)
  })

  return () => srv.close()
}

execIfScript(serve, !module.parent)
