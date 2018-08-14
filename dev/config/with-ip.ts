import { localIP } from '../dev-utils'
import { Config } from '.'

const hostname = localIP()

if (!hostname) {
  console.error('Cannot detect IP. Please create new config. Names starting with `_` are ignored by git.')
  process.exit(1)
}

export const config = {
  hostname,
  autoSetup: true,
  blockTime: 1000
} as Partial<Config>
