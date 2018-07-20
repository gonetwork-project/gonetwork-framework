import * as ch from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

export const tmpDir = path.resolve(__dirname, '..', '..', 'temp')
export const contractAddressesPath = path.resolve(tmpDir, 'contract-addresses.json')
export const migrationDir = path.resolve(__dirname, '..', '..', 'smart-contracts')
export const migrationBuildDir = path.resolve(migrationDir, 'build')

const ethUrl = process.argv[2] || 'http://localhost:8546'

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir)
}

const noEthNode = (msg: string, err: any) => {
  console.error(msg)
  console.log('IF ETH NODE IS RUNNING IT REQUIRES MORE INVESTIGATION\n')
  process.exit(1)
}

const gen = (): any => {
  console.log('CONTRACTS NOT FOUND - DEPLOYING')
  let c: Buffer
  try {
    c = ch.execSync('truffle migrate --reset', {
      cwd: migrationDir
    })
  } catch (err) {
    const io: string = err.output
      .filter(Boolean)
      .map((o: Buffer) => o.toString())
      .join('')
    if (io.includes('SyntaxError: Unexpected end of JSON input')) {
      console.log('SMART-CONTRACTS COMPILATION MESSED UP')
      console.log('REMOVING: ', migrationBuildDir)
      const cmd = `rm -rf ${migrationBuildDir}`
      try {
        ch.execSync(cmd)
      } catch (err) {
        console.log(`${cmd} FAILED. Please remove manually and retry.`)
      }
      return gen()
    } else {
      noEthNode('CONTRACT DEPLOYMENT FAILED', io)
    }
  }

  try {
    // console.log('CONTRACTS DEPLOYED')

    // todo: figure out what would be the best
    const cmd = `git co "${migrationBuildDir}"`
    try {
      ch.execSync(cmd)
    } catch (err) {
      console.log(`${cmd} FAILED. Contract deployment modified ${migrationBuildDir}. Please do not commit it to repo.`)
    }

    const res = c!.toString().split('\n').filter(l => l.indexOf('__GONETWORK_RESULT__') >= 0)

    if (res.length !== 1) {
      throw new Error('SOMETHING VERY WRONG - EXPECTED JUST SINGLE RESULT FROM DEPLOYMENT')
    }

    const r = JSON.parse(res[0])
    r.run = 1
    // r.privateKeys = pks
    delete r['__GONETWORK_RESULT__']
    fs.writeFileSync(contractAddressesPath, JSON.stringify(r, null, 4), 'utf8')
    return r
  } catch (err) {
    console.error(err)
    console.error('CONTRACTS DEPLOYED BUT UNKNOWN ERROR')
    process.exit(1)
  }
}

export const deploy: () => {
  testToken: string, gotToken: string, manager: string, run: number
} = () => {
  let i
  if (fs.existsSync(contractAddressesPath)) {
    i = JSON.parse(fs.readFileSync(contractAddressesPath, 'utf8'))
  }

  // 9 - number of other accounts
  if (i && (i.run < 9)) {
    // console.log(i)
    try {
      const r = ch.execSync(`curl --data-binary '{"jsonrpc":"2.0","id":"curltext","method":"eth_getTransactionCount","params":["${i.manager}"]}' -H 'content-type:text/plain;' ${ethUrl}`, { stdio: 'pipe' })
      const s = JSON.parse(r.toString())

      if (!s.result || s.result === '0x0') {
        return gen()
      } else {
        i.run += 1
        fs.writeFileSync(contractAddressesPath, JSON.stringify(i, null, 4), 'utf8')
        return i
      }

    } catch (err) {
      noEthNode('REACHING ETH NODE FAILED', err)
    }
  } else {
    return gen()
  }
}

if (!module.parent) {
  deploy()
}
