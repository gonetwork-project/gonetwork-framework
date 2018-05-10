import * as T from '../types'
/* tslint:disable*/

const ChannelManagerContract = require('../../smart-contracts/build/contracts/ChannelManagerContract.json')
const NettingChannelContract = require('../../smart-contracts/build/contracts/NettingChannelContract.json')
const HumanStandardTokenContract = require('../../smart-contracts/build/contracts/HumanStandardToken.json')
const abi = require('ethereumjs-abi');
const util = require('ethereumjs-util');

export class LogDecoder implements T.LogDecoder {
	
	constructor (contracts:Object[]) {
		this.EventMap= LogDecoder.GenerateEventMap (contracts || [ChannelManagerContract,NettingChannelContract,HumanStandardTokenContract]);
	}

	decode(log){
		let result = [];
		if(this.EventMap.hasOwnProperty(log.topics[0])){
			let eventDef = this.EventMap[log.topics[0]]
			//Indexed events are in the topics 
			console.log(eventDef.inputs.map(y=>y.type));
			let data = Buffer.concat(log.topics.slice(1,).concat(log.data).map(y=> new util.toBuffer(y)));
			console.log(data);
			result = abi.rawDecode(eventDef.inputs.map(x=>x.type),data);
		}
		console.log(result);
		
	}

	static GenerateTopic (def:Object){
		return util.addHexPrefix(abi.eventID(def.name, def.inputs.map(y=>y.type)).toString('hex'));
	}

	static GenerateEventMap (contracts: Object[ ]){
	let definitions = ([].concat(...contracts.map(y => {return y.abi}))).filter(y=>y.type=='event').reduce((r,x)=>{
		var topic = LogDecoder.GenerateTopic(x);
		r[topic] = x;
		return r;
	},{});
	return definitions;
}
}

