import * as http from 'http'
import * as qs from 'querystring'
import { exec } from 'child_process'

import * as qr from 'qrcode'
import * as wallet from 'ethereumjs-wallet'
import * as Web3 from 'Web3'

import { execIfScript } from './dev-utils'
import { Config } from './config'

(global as any).fetch = require('node-fetch')

const etherAccount = '0x7582C707b9990a5BB3Ca23f8F7b61B6209829A6e'

const headersFn = (other?: http.OutgoingHttpHeaders) => Object.assign({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*'
}, other)

const response = (res: http.ServerResponse, body?: string, status = 200, headers: http.OutgoingHttpHeaders = headersFn()) => {
  res.writeHead(status, headers)
  res.end(body)
}

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

const account = (ethUrl: string, w3: any) => {
  const wl = wallet.generate()
  const pk = `0x${wl.getPrivateKey().toString('hex')}`
  return ethRequest(ethUrl, 'personal_importRawKey', [pk, ''])
    .then(address => ({ privateKey: pk, address }))
    .then(acc => ethRequest(ethUrl, 'personal_unlockAccount', [acc.address, '', '0xFFFFFFFFF'])
      .then(() => w3.eth.sendTransaction({ from: etherAccount, to: acc.address, value: (Web3 as any).utils.toWei('1000', 'ether') }))
      .then(() => acc))
}

export const serve = (c: Config) => {
  const host = `http://${c.hostname}:${c.coordinatorPort}`
  const ethUrl = `http://${c.hostname}:${c.ethPort}`
  const w3 = new (Web3 as any)(ethUrl)

  qr.toString(JSON.stringify(c), { type: 'terminal' }, (_: any, s: string) =>
    console.log(s))

  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      response(res)
      return
    }

    const url = (req.url || '').substring(1).split('?')
    const [command, params] = [url[0], qs.parse(url[1])]

    console.log('REQ', command, params)

    switch (command) {
      case 'favicon.ico':
        return response(res)
      case 'account': {
        return account(ethUrl, w3)
          .then(acc => response(res, JSON.stringify(acc)))
          .catch(e => response(res, e, 400))
      }
      case 'account-with-contracts': {
        return account(ethUrl, w3)
          .then(acc => {
            console.log(`node ${__dirname}/scripts/deploy-contracts.js ${ethUrl} ${acc.address.substring(2)}`)
            exec(`node ${__dirname}/scripts/deploy-contracts.js ${ethUrl} ${acc.address.substring(2)}`, (e, r) => {
              if (e) return Promise.reject(e)
              console.log(acc, r)
              response(res, JSON.stringify(acc))
            })
          })
          .catch(e => {
            console.log('ERROR', e)
            response(res, e.stack, 400)
          })
      }

      default:
        response(res, '', 400)
    }
  })

  server.listen(c.coordinatorPort, c.hostname, () => console.log(`Coordinator listening on: ${host}`))

  return () => server.close()
}

execIfScript(serve, !module.parent)
