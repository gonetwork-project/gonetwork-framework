import * as path from 'path'
import * as fs from 'fs'

import * as E from 'eth-types'

import { as, util } from '../utils'

export type Account = {
  privateKey: E.PrivateKey,
  privateKeyStr: string,
  address: E.Address,
  addressStr: string
}

export const pks: string[] = [
  '6c7cfe3c8c47dc2ea38e2634f8a99ecea87b9609e888be36a2d7ee076d28bdce',
  'd365947df31e3f828e7572bcdbd50554a9043c30b785a0f8e5811c6bf93f628c'

  // '4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78',
  // 'b507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42',
  // 'a8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d',
  // '157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224'
]

export const accounts: Account[] = pks.map(pk => ({
  privateKeyStr: `0x${pk}`,
  privateKey: as.PrivateKey(util.toBuffer(pk)),
  address: as.Address(util.privateToAddress((Buffer as any).from(pk, 'hex')) as any),
  addressStr: util.addHexPrefix(util.privateToAddress((Buffer as any).from(pk, 'hex')).toString('hex'))
}))

// console.log(accounts)

export const tmpDir = path.resolve(__dirname, '..', '..', 'temp')
export const contractAddressesPath = path.resolve(tmpDir, 'contract-addresses.json')

export const migrationDir = path.resolve(__dirname, '..', '..', 'smart-contracts')
export const migrationBuildDir = path.resolve(migrationDir, 'build')

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir)
}
