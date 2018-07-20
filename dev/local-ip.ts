import * as os from 'os'
const ifaces = os.networkInterfaces()

// very simple mechanism to get address of ip in local network
// based on: https://stackoverflow.com/questions/15496156/regex-to-match-anything/41841338

export const customStartWith = /^(192\.168)|(10.0)/
export const ip = (startWith = customStartWith): string | null =>
  Object.keys(ifaces)
    .map(name => ifaces[name])
    .map(iface => iface.find(a => a.family === 'IPv4'
      && startWith.test(a.address)))
    .filter(Boolean)
    .map(a => a.address)
    .find(() => true)
