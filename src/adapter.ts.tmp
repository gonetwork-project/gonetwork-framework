/*
* @Author: amitshah
* @Date:   2018-04-20 19:45:55
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-22 03:29:13
*/


const blockchainService = require('./blockchainService');
const http = require("http");


class InfuraProvider extends blockchainService.BlockchainService{



	constructor(myAddress,chainID, signatureCallback){
		super(chainID,signatureCallback)
		this.blockchainService = blockchainService;
		this.nonce = await this.getTransactionCount(myAddress);

	}

	handle(params, success,error){
	
	}
}

module.exports ={
	Adapter
}