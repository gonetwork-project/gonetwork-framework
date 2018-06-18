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

const DEFAULT_ROOT = path.join(__dirname, '..')
const contractsDir = path.join(DEFAULT_ROOT, 'smart-contracts', 'build', 'contracts')
const outDir = path.join(DEFAULT_ROOT, 'src', 'types', '__GEN__')

const log = console.log.bind(console)

const CONTRACT_NAMES = [
  'HumanStandardToken', 'ChannelManagerContract', 'NettingChannelContract'
]

const SHORT_NAMES: { [k: string]: string } = {
  HumanStandardToken: 'Token',
  ChannelManagerContract: 'Manager',
  NettingChannelContract: 'Channel'
}

const ACHTUNG = '// \u26A0 !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND \u26A0\n'
const IMPORTS = [
  `import { BN } from 'bn.js'`,
  `import { Address } from 'eth-types'`
].join('\n')

const readContracts = (p: string) =>
  CONTRACT_NAMES.map(c => ([c, require(`${p}/${c}.json`)]))

const abiTypesToTs: { [k: string]: string } = {
  address: 'Address',
  'address[]': 'Address[]',
  uint256: 'BN',
  bytes32: 'Buffer',
  bytes: 'Buffer',
  bool: 'boolean',
  string: 'string'
}

const reduceIO = (ios?: AbiIO[]) =>
  ios && ios.reduce((acc, io, idx) => {
    acc[io.name || `anon_${idx}`] = abiTypesToTs[io.type]
    return acc
  }, {} as { [k: string]: string })

const handleEvents = (evs: AbiEvent[], shortName: string) => {
  const i = evs.reduce((acc, e) => {
    acc.types.push(e.name)
    // todo: check if _types needed at all
    acc.args[e.name] = Object.assign({ _type: `'${e.name}'` }, reduceIO(e.inputs))
    return acc
  }, { types: [], args: {} } as { types: string[], args: { [k: string]: object } })

  return [
    `export type ${shortName}Events = ${i.types.map(t => `'${t}'`).join(' | ')}`,
    `export type ${shortName}EventsToArgs = ${JSON.stringify(i.args, null, 2).replace(/[\"\,]/g, '')}`
  ].join('\n\n')
}

const reduceFunctions = (fns: AbiFunction[]) =>
  fns.reduce((acc, f) => {
    const params = f.inputs.length > 0 && reduceIO(f.inputs)
    const out = f.outputs!.length > 0 && reduceIO(f.outputs)
    acc.inOut[f.name] = [params || 'null', out || 'void']
    acc.order[f.name] = f.inputs.map(x => `'${x.name}'`)
    acc.types[f.name] = f.inputs.map(x => `'${x.type}'`)
    return acc
  }, { inOut: {}, order: {}, types: {} })

const handleFunctions = (fns: AbiFunction[], shortName: string) => {
  // const p = reduceFunctions(fns.filter(fn => fn.payable))
  const c = reduceFunctions(fns.filter(fn => fn.constant))
  const o = reduceFunctions(fns.filter(fn => !(fn.constant || fn.payable)))

  return [
    // `export type ${shortName}PayIO = ${JSON.stringify(p.inOut, null, 2).replace(/[\"]/g, '')}`,
    // `export const ${shortName}PayOrdIO = ${JSON.stringify(p.order, null, 2).replace(/[\"]/g, '')}`,
    `export type ${shortName}IO = ${JSON.stringify(o.inOut, null, 2).replace(/[\"]/g, '')}`,
    `export const ${shortName}OrdIO = ${JSON.stringify(o.order, null, 2).replace(/[\"]/g, '')}`,
    `export const ${shortName}TypesIO = ${JSON.stringify(o.types, null, 2).replace(/[\"]/g, '')}`,
    `export type ${shortName}ConstIO = ${JSON.stringify(c.inOut, null, 2).replace(/[\"]/g, '')}`,
    `export const ${shortName}ConstOrdIO = ${JSON.stringify(c.order, null, 2).replace(/[\"]/g, '')}`,
    `export const ${shortName}ConstTypesIO = ${JSON.stringify(c.types, null, 2).replace(/[\"]/g, '')}`
  ].join('\n\n')
}

const handleConstructor = (fns: AbiFunction[], shortName: string) => {
  if (fns.length !== 1) throw new Error('EXACTLY_ONE_EXPECTED')
  const c = fns[0]
  const ins = JSON.stringify(reduceIO(c.inputs), null, 2).replace(/[\"\,]/g, '')
  return `export interface ${shortName}ConstructorParams ${ins}`

}

const handleFallback = () => ''

const handlers: {
  [k: string]: (p: any, shortName: string) => string
} = {
  event_: handleEvents,
  constructor_: handleConstructor,
  function_: handleFunctions,
  fallback_: handleFallback
}

const handleContract = (outDir: string) => ([n, c]: [string, any]) =>
  $.from(c.abi)
    .groupBy((e: any) => e.type + '_') // constructor is a special js word
    .mergeMap(g =>
      g.toArray()
        .map(x => handlers[g.key](x, SHORT_NAMES[n]))
    )
    .toArray()
    .map(gs => [IMPORTS].concat(gs).filter(Boolean))
    .map(gs => gs.join(`\n\n${ACHTUNG}\n`) + `\n\n${ACHTUNG}`)
    .do(gen => fs.writeFileSync(`${outDir}/${n}.ts`, gen, 'utf8'))

$.from(readContracts(contractsDir))
  .mergeMap(handleContract(outDir) as any)
  .subscribe()
