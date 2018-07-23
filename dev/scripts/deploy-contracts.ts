import * as fs from 'fs'
import * as path from 'path'
const Web3 = require('web3')
const Contract = require('truffle-contract')

const contractsDir = path.resolve(__dirname, '..', '..', 'smart-contracts')
const buildDir = path.resolve(contractsDir, 'build', 'contracts')

const readContracts = (provider: any, account: any) => fs.readdirSync(buildDir)
  .reduce((result, build) => {
    const json = JSON.parse(fs.readFileSync(path.resolve(buildDir, build)).toString())
    const ct = Contract(json)
    ct.setProvider(provider)
    // https://github.com/trufflesuite/truffle-contract/issues/57
    if (typeof ct.currentProvider.sendAsync !== 'function') {
      ct.currentProvider.sendAsync = function () {
        return ct.currentProvider.send.apply(ct.currentProvider, arguments)
      }
    }

    ct.defaults({
      from: account,
      gas: 3500000,
      gasPrice: 1000000000
    })

    ct.setNetwork(1337)
    result[build.split('.')[0]] = ct
    return result
  }, {} as any)

const deploy = async (ethUrl = 'http://localhost:8546', account = '7582C707b9990a5BB3Ca23f8F7b61B6209829A6e') => {
  const provider = new Web3.providers.HttpProvider(ethUrl)
  const contracts = readContracts(provider, account)

  const standardToken = await contracts['StandardToken'].new()
  contracts['HumanStandardToken'].link('StandardToken', standardToken.address)

  const gotToken = await contracts['HumanStandardToken'].new(100000000, 'GoNetwork', 1, '$GOT')
  const testToken = await contracts['HumanStandardToken'].new(500000000, 'NotToken', 1, '$NOT')

  contracts['NettingChannelLibrary'].link('StandardToken', standardToken.address)
  const nettingChannelLibrary = await contracts['NettingChannelLibrary'].new()

  contracts['NettingChannelContract'].link('NettingChannelLibrary', nettingChannelLibrary.address)
  contracts['ChannelManagerLibrary'].link('NettingChannelLibrary', nettingChannelLibrary.address)
  const channelManagerLibrary = await contracts['ChannelManagerLibrary'].new()

  contracts['ChannelManagerContract'].link('ChannelManagerLibrary', channelManagerLibrary.address)
  const manager = await contracts['ChannelManagerContract'].new(gotToken.address, testToken.address)

  return {
    gotToken: gotToken.address.toString('hex'),
    testToken: testToken.address.toString('hex'),
    manager: manager.address.toString('hex')
  }
}

if (!module.parent) {
  const [hostname, account] = process.argv.slice(2)

  deploy(hostname, account)
    .then(r => console.log(JSON.stringify(r)))
} else {
  console.error('Only intended to be run as a script.')
  process.exit(1)
}
