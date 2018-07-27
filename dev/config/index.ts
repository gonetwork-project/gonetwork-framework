// this is very minimal - only what we needed right now
export type Config = {
  hostname: string
  mqttPort: number
  ethPort: number
  coordinatorPort: number
  blockTime: number // in Milliseconds, ganache-core allows undefined as well, but we do not use it

  withContracts: boolean
}

// it is used for tests running on local machine
const defaultConfig: Readonly<Config> = {
  hostname: 'localhost',
  mqttPort: 1884,
  ethPort: 8546,
  coordinatorPort: 5215,
  blockTime: 50,
  withContracts: false
}

const withDefault: (c?: Partial<Config>) => Config = c =>
  Object.assign({}, defaultConfig, c)

export const config = (name?: string) =>
  withDefault(name && require(`./${name}`).config)

export const configFromArgv = () => config(process.argv[2])

const balance = '0xFFF FFF FFF FFF FFF FFF FFF FFF FFF'.replace(/ /g, '')
export const accounts = [
  ['6c7cfe3c8c47dc2ea38e2634f8a99ecea87b9609e888be36a2d7ee076d28bdce', '7582C707b9990a5BB3Ca23f8F7b61B6209829A6e'],
  ['d365947df31e3f828e7572bcdbd50554a9043c30b785a0f8e5811c6bf93f628c', 'cF0eD51326d08281D46F1c3475c8d720Cc2680d2']
].map(([pk, address]) => ({
  privateKey: new Buffer(pk, 'hex'),
  address: new Buffer(address, 'hex'),
  // ganache
  secretKey: `0x${pk}`,
  balance
}))
