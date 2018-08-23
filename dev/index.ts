import { serve as mqtt } from './mqtt-nano'
import { serve as ganache } from './ganache-server'

import { execIfScript } from './utils'
import { Config } from './config'

export * from './utils'

export {
  mqtt,
  ganache,
  Config
}

const serve = (c: Config) => {
  const toDispose = [mqtt(c), ganache(c)]
  return () => toDispose.forEach(d => d())
}
execIfScript(serve, !module.parent)
