import { serve as mqtt } from './mqtt-nano'
import { serve as ganache } from './ganache-server'
import { serve as coordinator } from './coordinator'

import { execIfScript } from './dev-utils'
import { Config } from './config'

const serve = (c: Config) => {
  const toDispose = [mqtt(c), ganache(c), coordinator(c)]
  return () => toDispose.forEach(d => d())
}

execIfScript(serve, !module.parent)
