import * as T from '../types'

import * as abi from 'ethereumjs-abi'
import * as util from 'ethereumjs-util'
import { as } from './eth-utils'

export default class GenericLogDecoder {
  private eventMap: any

  constructor (contracts: any[]) {
    this.eventMap = GenericLogDecoder.generateEventMap(contracts)
  }

  static generateTopic (def: any) {
    return util.addHexPrefix(abi.eventID(def.name, def.inputs.map(y => y.type)).toString('hex'))
  }

  static generateEventMap (contracts: any[]) {
    let definitions = ([].concat(...contracts.map(y => y.abi)))
      .filter((y: any) => y.type === 'event')
      .reduce((r, x) => {
        let topic = GenericLogDecoder.generateTopic(x)
        r[topic] = x
        return r
      }, {})
    return definitions
  }

	/**
	 * @param {Object} log - the ith log entry object returned from eth_getLogs() RPC call
	 * @returns {Object} - parsed event object
	 */
  decode (log) {
    // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getfilterchanges

    if (this.eventMap.hasOwnProperty(log.topics[0])) {
      const eventDef = this.eventMap[log.topics[0]]
      const data = Buffer.concat(log.topics.slice(1).concat(log.data).map(y => util.toBuffer(y)))

      const result = abi.rawDecode(eventDef.inputs.map(x => x.type), data)
        .reduce((r, y, i) => {
          let t = eventDef.inputs[i]
          if (t.type === 'address') {
            y = util.toBuffer(util.addHexPrefix(y))
          }
          r[eventDef.inputs[i].name] = y
          return r
        }, {})
      result._type = eventDef.name
      result._contract = util.toBuffer(log.address)
      return result
    }
    // Throwing since we only want to decode known logs
    throw new Error('UNKNOWN_LOG')
  }
}
