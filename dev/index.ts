import { serve as mqtt } from './mqtt-nano'
import { serve as ganache } from './ganache-server'
import { execIfScript } from './dev-utils'
import { config, Config } from './config/config'

const serve = (c: Config) => {
  const toDispose = [mqtt(c), ganache(c)]
  return () => toDispose.forEach(d => d())
}

execIfScript(serve, !module.parent)
