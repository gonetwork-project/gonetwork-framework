
import '../observable-add'

import * as e2e from '../tests'

import * as E from 'eth-types'
import { SignatureCb } from './types'

import { as, CHAIN_ID } from '../utils/eth-utils'

// todo will break in a browser environment
(global as any).fetch = require('node-fetch')

type Env = 'infura' | 'local'

export type LocalConfig = ReturnType<typeof local>
export type InfuraConfig = LocalConfig & { nettingChannel: E.Address, txHash: string, txHashFake: string }

// mind that tests are specific for different environments - you may withe-list ones you want the tests run for
// eg. `GONET_TEST_ENV=local jest --watch` -- [DEFAULT] only local (you need local eth-node running on port 8545 - chainId 1337)
// `GONET_TEST_ENV=local,infura jest --watch` - both local and infura
const testEnvironments: Env[] = (process.env.GONET_TEST_ENV || 'local').split(',') as Env[]

const infuraAccounts = [
  // accounts used by Amit's in manual tests
  e2e.account('b507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42', 'f0c3043550e5259dc1c838d0ea600364d999ea15'),
  e2e.account('4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78', 'b0ae572146ab8b5990e069bff487ac25635dabe8'),
  e2e.account('a8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d', 'ff8a018d100ace078d214f02be8df9c6944e7a2b'),
  e2e.account('157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224', 'f77e9ef93380c70c938ca2e859baa88be650d87d'),
  // fresh accounts with some eth
  e2e.account('b2267a87f32cb5375341fddad567921db4fd3b8d6e6b752605e6fbd6b6afc0ca', 'ca4e935c9e4d942afd42f2c932a4ab9320eda68c'),
  e2e.account('c712c08b0c42c073f8c67cf5c0fa8c4cf5ffa89c0b33c2d4e53aa4fe969da887', 'f8e9b7b0f5936c0221b56f15ea2182d796d09e63')
]

export const isInEnv = (e: Env) => testEnvironments.includes(e)

export const infura: () => InfuraConfig = () => ({
  run: null as any as number, // run should not be needed for infura so it will throw when used
  providerUrl: 'https://ropsten.infura.io',
  mqttUrl: 'mqtt://localhost:1883',
  chainId: CHAIN_ID.ROPSTEN as E.ChainId,

  accounts: infuraAccounts,
  signatureCb: ((cb) => cb(infuraAccounts[0].privateKey)) as SignatureCb,
  owner: infuraAccounts[0].address,

  monitoringInterval: 2 * 1000,

  manager: as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex')),
  gotToken: as.Address(new Buffer('a28a7a43bc389064ab5d16c0338968482b4e02bd', 'hex')),
  hsToken: as.Address(new Buffer('de8a6a2445c793db9af9ab6e6eaacf880859df01', 'hex')),

  nettingChannel: as.Address(new Buffer('335648c615c692c25d8d9de5e6068d876b88e5ee', 'hex')),

  txHash: '0x57f8edeca8ca78d7d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12',
  txHashFake: '0x57f8edeca8ca78d8d2a1be8a7a37614e024e14120a03d4ec86088e651c7b7a12'
})

export const local = () => {
  const [contracts, run] = e2e.readFromDisk()

  return {
    run,
    ...contracts,
    providerUrl: 'http://localhost:8546',
    mqttUrl: 'mqtt://localhost:1883',
    chainId: CHAIN_ID.GETH_PRIVATE_CHAINS as E.ChainId,

    accounts: e2e.accounts,
    signatureCb: ((cb) => cb(e2e.accounts[0].privateKey)) as SignatureCb,
    owner: e2e.accounts[0].address,

    monitoringInterval: 0.5 * 1000
  }
}
