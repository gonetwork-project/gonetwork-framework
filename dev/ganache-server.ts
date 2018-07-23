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
    default_balance_ether: 1000000,
    gasPrice: 200,
    logger: console
  }
  const srv = new server(options)
  srv.listen(options.port, options.hostname, (err: any) => {
    if (err) {
      console.error(err)
      return
    }

    console.log(`Ganache listening on http://${options.hostname}:${options.port}`)
  })

  return () => srv.close()
}

execIfScript(serve, !module.parent)
