import { server } from 'ganache-core'
import memdown from 'memdown'

import { execIfScript } from './dev-utils'
import { Config } from './config'

export const serve = (c: Config) => {
  const balance = '0xFFF FFF FFF FFF FFF FFF'.replace(/ /g, '')
  const options = {
    port: c.ethPort,
    hostname: c.hostname,

    blockTime: c.blockTime / 1000,

    db: (memdown as any)(), // todo: allow other options then in-memory, but make sure we do no run out of disk space
    locked: false,
    // mnemonic: 'dignity upset visa worry warrior donate record enforce time pledge ladder drop',
    accounts: [
      '0x6c7cfe3c8c47dc2ea38e2634f8a99ecea87b9609e888be36a2d7ee076d28bdce', // 7582C707b9990a5BB3Ca23f8F7b61B6209829A6e
      '0xd365947df31e3f828e7572bcdbd50554a9043c30b785a0f8e5811c6bf93f628c'  // cF0eD51326d08281D46F1c3475c8d720Cc2680d2
    ].map(pk => ({ secretKey: pk, balance })),
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
