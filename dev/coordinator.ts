import * as http from 'http'
import * as qs from 'querystring'
import * as util from 'util'
import * as cp from 'child_process'

import * as qr from 'qrcode'
import * as wallet from 'ethereumjs-wallet'
import * as Web3 from 'Web3'

import { execIfScript } from './dev-utils'
import { Config, accounts } from './config'

(global as any).fetch = require('node-fetch')

const [etherAccount, contractsAccount] = accounts

const exec = util.promisify(cp.exec)

const headersFn = (other?: http.OutgoingHttpHeaders) => Object.assign({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*'
}, other)

let id = 0
const ethRequest = (ethUrl: string, method: string, params = null as any) => fetch(ethUrl, {
  method: 'POST',
  headers: {
    contentType: 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: ++id,
    method: method,
    params
  })
})
  .then(res => res.status === 200 ?
    res.json().then((r: any) => {
      if (r.error) {
        return Promise.reject(r)
      }
      return r.result
    }) : Promise.reject(res))

const account = (ethUrl: string, w3: any, acc: any) => {
  if (acc) {
    return Promise.resolve(acc)
  }
  const wl = wallet.generate()
  const pk = `0x${wl.getPrivateKey().toString('hex')}`
  return ethRequest(ethUrl, 'personal_importRawKey', [pk, ''])
    .then(address => ({ privateKey: pk, address }))
    .then(acc => ethRequest(ethUrl, 'personal_unlockAccount', [acc.address, '', '0xFFFFFFFFF'])
      .then(() => w3.eth.sendTransaction({ from: `0x${etherAccount.address.toString('hex')}`, to: acc.address, value: (Web3 as any).utils.toWei('10000', 'ether') }))
      .then(() => acc))
}

export const serve = (cfg: Config) => {
  // there is no persistence right now, so on new start new clients need to re-initialize
  const runId = `run_${Date.now()}`

  const startAccounts = accounts.slice(2)
    .map(acc => ({
      privateKey: acc.secretKey,
      address: acc.address.toString('hex')
    }))
  const accountsPool = startAccounts.slice(0)

  const urls = {
    coordinator: `http://${cfg.hostname}:${cfg.coordinatorPort}`,
    eth: `http://${cfg.hostname}:${cfg.ethPort}`,
    mqtt: `ws://${cfg.hostname}:${cfg.mqttPort}`
  }

  const config = Object.assign({ urls, runId }, cfg)
  const qrConfig = {
    gonetworkServer: {
      protocol: 'http:',
      hostname: cfg.hostname,
      port: cfg.coordinatorPort
    }
  }

  const w3 = new (Web3 as any)(urls.eth)

  const defaultContracts = cfg.autoSetup ?
    exec(`node ${__dirname}/scripts/deploy-contracts.js ${urls.eth} ${contractsAccount.address.toString('hex')}`)
      .then(r => JSON.parse(r.stdout)) : Promise.resolve(null)

  defaultContracts.then((c) => {
    if (c) {
      console.log('\ncontracts deployed')
      console.log(Object.keys(c).map(k => `${k}: ${c[k]}`).join('\n'))
    }
    console.log(`\nurl: ${urls.coordinator} -- scan for quick simulator setup:\n`)
    qr.toString(JSON.stringify(qrConfig), { type: 'terminal' }, (_: any, s: string) =>
      console.log(s))
  })

  const server = http.createServer((req, res) => {
    const response = (body?: string, status = 200, headers: http.OutgoingHttpHeaders = headersFn()) => {
      res.writeHead(status, headers)
      res.end(body, () => req.connection.destroy())
    }

    if (req.method === 'OPTIONS') {
      response()
      return
    }

    const url = (req.url || '').substring(1).split('?')
    const [command, params] = [url[0], qs.parse(url[1])]

    if (command !== 'run_id') {
      console.log('REQ', command, params)
    }

    switch (command) {
      case 'favicon.ico':
        return response()
      case 'config':
        return response(JSON.stringify(config))
      case 'contracts_account':
        return defaultContracts
          .then(cs => response(JSON.stringify({
            privateKey: contractsAccount.privateKey.toString('hex'),
            contracts: cs
          })))
      case 'start_accounts':
        return response(JSON.stringify(startAccounts))
      case 'account':
        return account(urls.eth, w3, accountsPool.pop())
          .then(acc => response(JSON.stringify(acc)))
          .catch(e => response(e, 400))
      case 'run_id':
        return response(JSON.stringify(runId))
      case 'restart':
        setTimeout(() => {
          console.log('...restarting...')
          process.kill(process.pid, 'SIGUSR2')
        }, 10)
        return response('1')

      default:
        response('', 400)
    }
  })

  server.listen(cfg.coordinatorPort, cfg.hostname,
    (err: any) => {
      if (err) {
        console.error(err)
        process.exit(1)
      }
      console.log(`Coordinator listening on: ${urls.coordinator}, runId: ${runId}`)
    })

  return () => {
    // console.warn('<<<CLOSING>>>')
    server.close(() => console.log('<<<CLOSED>>>', runId))
  }
}

execIfScript(serve, !module.parent)
