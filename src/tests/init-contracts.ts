import * as pr from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

import { as } from '../utils'
import { Address } from 'eth-types'

import * as cfg from './config'

export type ContractAddresses = {
  manager: Address, hsToken: Address, gotToken: Address
}

const toAdd = (s: string) => as.Address(new Buffer(s.substring(2), 'hex'))

// https://github.com/trufflesuite/ganache-cli
// for now running this command manually
const ganacheCli = [
  'ganache-cli',
  `-b 1`, // blockTime in seconds for automatic mining. Default is 0 and no auto-mining.
  // cfg.accounts.map((a, i) => `--unlock ${i} --account="${a.privateKeyStr},${defaultEther}"`).join(' ')
  `-m "${cfg.mnemonic}"`
].join(' ')

const noEthNode = (msg, err) => {
//  console.log(err)
  console.error(msg)
  console.log('You can start ganache-core server with: yarn compile && node lib/tests/ganache-core.js')
  console.log('IF ETH NODE IS RUNNING IT REQUIRES MORE INVESTIGATION\n')
  // console.log('EXAMPLE OF GANACHE CLI COMMAND - make sure it is running:\n')
  // console.log(ganacheCli)
  process.exit(1)
}

const gen = () => {
  console.log('CONTRACTS NOT FOUND - DEPLOYING')
  let c
  try {
    c = pr.execSync('truffle migrate --reset', {
      cwd: cfg.migrationDir
    })
  } catch (err) {
    const io: string = err.output
      .filter(Boolean)
      .map(o => o.toString())
      .join('')
    if (io.includes('SyntaxError: Unexpected end of JSON input')) {
      console.log('SMART-CONTRACTS COMPILATION MESSED UP')
      console.log('REMOVING: ', cfg.migrationBuildDir)
      const cmd = `rm -rf ${cfg.migrationBuildDir}`
      try {
        pr.execSync(cmd)
      } catch (err) {
        console.log(`${cmd} FAILED. Please remove manually and retry.`)
      }
      return gen()
    } else {
      noEthNode('CONTRACT DEPLOYMENT FAILED', io)
    }
  }

  try {
    console.log('CONTRACTS DEPLOYED')

    // todo: figure out what would be the best
    const cmd = `git co "${cfg.migrationBuildDir}"`
    try {
      pr.execSync(cmd)
    } catch (err) {
      console.log(`${cmd} FAILED. Contract deployment modified ${cfg.migrationBuildDir}. Please do not commit it to repo.`)
    }

    const res = c.toString().split('\n').filter(l => l.indexOf('__GONETWORK_RESULT__') >= 0)

    if (res.length !== 1) {
      throw new Error('SOMETHING VERY WRONG - EXPECTED JUST SINGLE RESULT FROM DEPLOYMENT')
    }

    const r = JSON.parse(res[0])
    r.run = 1
    // r.privateKeys = cfg.pks
    delete r['__GONETWORK_RESULT__']
    fs.writeFileSync(cfg.contractAddressesPath, JSON.stringify(r, null, 4), 'utf8')
    return r
  } catch (err) {
    console.error(err)
    console.error('CONTRACTS DEPLOYED BUT UNKNOWN ERROR')
    process.exit(1)
  }
}

export const init: () => {
  testToken: string, gotToken: string, manager: string, run: number
} = () => {
  let i
  if (fs.existsSync(cfg.contractAddressesPath)) {
    i = JSON.parse(fs.readFileSync(cfg.contractAddressesPath, 'utf8'))
  }

  // 9 - number of other accounts
  if (i && (i.run < 9)) {
    // console.log(i)
    try {
      const r = pr.execSync(`curl --data-binary '{"jsonrpc":"2.0","id":"curltext","method":"eth_getTransactionCount","params":["${i.manager}"]}' -H 'content-type:text/plain;' localhost:8546`)
      const s = JSON.parse(r.toString())

      if (!s.result || s.result === '0x0') {
        return gen()
      } else {
        i.run += 1
        fs.writeFileSync(cfg.contractAddressesPath, JSON.stringify(i, null, 4), 'utf8')
        return i
      }

    } catch (err) {
      noEthNode('REACHING ETH NODE FAILED', err)
    }
  } else {
    return gen()
  }
}

export const readFromDisk = () => {
  const add = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'temp', 'contract-addresses.json'), 'utf8'))

  return [{
    manager: toAdd(add.manager),
    gotToken: toAdd(add.gotToken),
    hsToken: toAdd(add.testToken)
  }, add.run] as [ContractAddresses, number]
}

if (!module.parent) {
  init()
}
