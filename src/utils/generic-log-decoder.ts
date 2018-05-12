import * as T from '../types'

const abi = require('ethereumjs-abi')
const util = require('ethereumjs-util')

export default class GenericLogDecoder implements T.LogDecoder {
  private eventMap: any

  constructor (contracts: any[]) {
    this.eventMap = GenericLogDecoder.generateEventMap(contracts)
  }

  static normalizeName (name) {
    return name.replace(/^_/, '')
  }
  static generateTopic (def: any) {
    return util.addHexPrefix(abi.eventID(def.name, def.inputs.map(y => y.type)).toString('hex'))
  }

  static generateEventMap (contracts: any[]) {
    // console.log(contracts.map(y => { return y.abi }))
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
    // console.log('EV', this.eventMap)
    let result = {}
    if (this.eventMap.hasOwnProperty(log.topics[0])) {

      let eventDef = this.eventMap[log.topics[0]]

      let data = Buffer.concat(log.topics.slice(1).concat(log.data).map(y => new util.toBuffer(y)))

      result = abi.rawDecode(eventDef.inputs.map(x => x.type), data)
        .reduce((r, y, i) => {
          let t = eventDef.inputs[i]
          if (t.type === 'address') {
            y = util.toBuffer(util.addHexPrefix(y))
          }
          r[GenericLogDecoder.normalizeName(eventDef.inputs[i].name)] = y
          return r
        }, {});
      (result as any)._type = eventDef.name
    }
    return result as any
  }
}
