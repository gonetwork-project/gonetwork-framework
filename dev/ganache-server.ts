import { server } from 'ganache-core'
import memdown from 'memdown'

import { execIfScript } from './utils'
import { Config, accounts } from './config'

export const serve = (c: Config) => {

  const options = {
    port: c.ethPort,
    hostname: c.hostname,

    blockTime: c.blockTime / 1000,

    db: (memdown as any)(), // todo: allow other options then in-memory, but make sure we do no run out of disk space
    locked: false,
    // mnemonic: 'dignity upset visa worry warrior donate record enforce time pledge ladder drop',
    accounts,
    gasPrice: 200
    // logger: console
  }
  const srv = new server(options)
  srv.listen(options.port, options.hostname, (err: any) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }

    console.log(`Ganache listening on http://${options.hostname}:${options.port}`)
  })

  return () => srv.close()
}

execIfScript(serve, !module.parent)
