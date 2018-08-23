import * as os from 'os'
import { Config, config } from './config'

// very simple mechanism to get address of ip in local network
// based on: https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
export const customStartWith = /^(192\.168)|(10.0)/
export const localIP = (startWith = customStartWith, ifaces = os.networkInterfaces()) =>
  Object.keys(ifaces)
    .map(name => ifaces[name])
    .map(iface => iface.find(a => a.family === 'IPv4'
      && startWith.test(a.address)))
    .filter(Boolean)
    .map(a => (a as os.NetworkInterfaceInfoIPv4).address)[0] as string | undefined

// running
const removeExitListeners = () => {
  process.removeAllListeners('SIGINT')
  process.removeAllListeners('uncaughtException')
}

export const autoDispose = (dispose: () => void) => {
  process.on('SIGINT', () => {
    dispose()
    process.exit()
  })

  process.on('uncaughtException', function (e) {
    console.log(e.stack)
    process.exit(1)
  })

  return () => {
    removeExitListeners()
    dispose()
  }
}

export const execIfScript = <T = Readonly<Config>>(serve: (c: T) => () => void, isScript: boolean) => {
  if (isScript) {
    let dispose = autoDispose(serve(config as any))

    process.on('SIGUSR2', () => {
      dispose()
      dispose = autoDispose(serve(config as any))
    })
  }
}
