import * as fs from 'fs'
import * as path from 'path'

import { Observable } from 'rxjs'

type AbiIO = {
  name: string
  type: string
}

type AbiEvent = {
  type: 'event'
  name: string
  inputs: (AbiIO & { indexed: boolean })[]
  anonymous: boolean
}

type AbiFunction = {
  type?: 'function' | 'constructor' | 'fallback' // default function
  name: string
  inputs: AbiIO[]
  outputs?: AbiIO[]
  constant: boolean
  payable: boolean
}

const $ = Observable

const DEFAULT_ROOT = path.join(__dirname, '..', 'smart-contracts', 'build')
const contractsDir = path.join(DEFAULT_ROOT, 'contracts')
const outDir = path.join(DEFAULT_ROOT, 'types')

const log = console.log.bind(console)

const CONTRACT_NAMES = [
  'HumanStandardToken', 'ChannelManagerContract', 'NettingChannelContract'
]

const readContracts = (p) =>
  CONTRACT_NAMES.map(c => ([c, require(`${p}/${c}.json`)]))

const reduceIO = (ios: AbiIO[]) =>
  ios.reduce((acc, io) => {
    acc[io.name] = io.type
    return acc
  }, {})

const handleEvents = (evs: AbiEvent[]) => {
  const i = evs.reduce((acc, e) => {
    acc.types.push(e.name)
    acc.args[e.name] = reduceIO(e.inputs)
    return acc
  }, { types: [], args: {} } as { types: string[], args: object })

  return [
    `export type Events = ${i.types.map(t => `'${t}'`).join(' | ')}`,
    `export type EventsToArgs = ${JSON.stringify(i.args, null, 2).replace(/[\"\,]/g, '')}`
  ].join('\n\n')
}

const handleFunctions = () => {
  return 'Functions'
}

const handleConstructor = () => ''

const handleFallback = () => ''

const handlers: {
  [k: string]: (p: any) => string
} = {
  event_: handleEvents,
  constructor_: handleConstructor,
  function_: handleFunctions,
  fallback_: handleFallback
}

const handleContract = (outDir: string) => ([n, c]: [string, any]): Observable<any> =>
  $.from(c.abi)
    .groupBy((e: any) => e.type + '_') // constructor is a special js word
    .mergeMap(g =>
      g.toArray()
        .map(x => handlers[g.key](x))
        .do(x => g.key === 'function_' && log(g.key, x))
    )
      .do(gen => fs.writeFileSync(`${outDir}/${n}.ts`, gen, 'utf8'))

$.from(readContracts(contractsDir))
  .mergeMap(handleContract(outDir))
  .do(log)
  .subscribe()
