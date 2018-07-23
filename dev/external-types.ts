declare module 'ganache-core' {
  export const provider: any
  export const server: any
}

declare module 'truffle-contract' {
  const e: any
  export = e
}

declare module 'ws' {
  const e: any
  export = e
}

declare module 'websocket-stream' {
  const e: any
  export = e
}

declare module 'mqtt-connection' {
  const e: any
  export = e
}

declare module 'qrcode' {
  const e: any
  export = e
}

declare module 'ethereumjs-wallet' {
  export const generate: () => {
    getPrivateKey: () => Buffer
    getPublicKey: () => Buffer
    getAddress: () => Buffer
  }
}
