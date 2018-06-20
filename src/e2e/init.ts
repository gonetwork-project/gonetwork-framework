import * as pr from 'child_process'
import * as fs from 'fs'

import * as cfg from './config'

const defaultEther = '10000000000000000000000000'

// https://github.com/trufflesuite/ganache-cli
// for now running this command manually
const ganacheCli = [
  'ganache-cli',
  `-b 5`, // blockTime in seconds for automatic mining. Default is 0 and no auto-mining.
  cfg.accounts.map((a, i) => `--unlock ${i} --account="${a.privateKeyStr},${defaultEther}"`).join(' ')
].join(' ')

const gen = () => {
  try {
    const c = pr.execSync('truffle migrate --reset', {
      cwd: cfg.migrationDir
    })
    console.log('CONTRACTS DEPLOYED')
    const res = c.toString().split('\n').filter(l => l.indexOf('__GONETWORK_RESULT__') >= 0)

    if (res.length !== 1) {
      throw new Error('SOMETHING VERY WRONG - EXPECTED JUST SINGLE RESULT FROM DEPLOYMENT')
    }

    fs.writeFileSync(cfg.contractAddressesPath, res[0], 'utf8')
    return JSON.parse(res[0])
  } catch (err) {
    console.error('CANNOT DEPLOY CONTRACTS')
    console.error(err)
    process.exit(1)
  }
}

export const init: () => {
  testToken: string, gotToken: string, manager: string
} = () => {
  if (fs.existsSync(cfg.contractAddressesPath)) {
    const i = JSON.parse(fs.readFileSync(cfg.contractAddressesPath, 'utf8'))
    console.log(i)
    try {
      const r = pr.execSync(`curl --data-binary '{"jsonrpc":"2.0","id":"curltext","method":"eth_getTransactionCount","params":["${i.manager}"]}' -H 'content-type:text/plain;' localhost:8545`)
      const s = JSON.parse(r.toString())

      if (!s.result || s.result === '0x0') {
        return gen()
      } else {
        return i
      }

    } catch (err) {
      console.error('\nREACHING ETH NODE FAILED')
      console.log('IF ETH NODE IS RUNNING IT REQUIRES MORE INVESTIGATION\n')
      console.log('EXAMPLE OF GANACHE CLI COMMAND - make sure it is running:\n', ganacheCli, '\n')
      process.exit(1)
    }
  } else {
    return gen()
  }
}
