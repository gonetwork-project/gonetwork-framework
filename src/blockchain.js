/*
* @Author: amitshah
* @Date:   2018-04-17 22:26:10
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-21 19:49:14
*/
const EthereumTx = require("ethereumjs-tx");
const abi = require("ethereumjs-abi");
const util = require("ethereumjs-util");

const ChannelManagerContract = require("../smart-contracts/build/contracts/ChannelManagerContract.json");
const NettingChannelContract = require('../smart-contracts/build/contracts/NettingChannelContract.json');
const HumanStandardTokenContract = require("../smart-contracts/build/contracts/HumanStandardToken.json");
const DEBUG = false;

const ChannelManagerContractAbi = ChannelManagerContract.abi.reduce(function(r, i){
	r[i.name] = i;
	return r;
}, {});

const NettingChannelContractAbi = NettingChannelContract.abi.reduce(function(r, i){
	r[i.name] = i;
	return r;
}, {});

const HumanStandardTokenAbi = HumanStandardTokenContract.abi.reduce(function(r, i){
	r[i.name] = i;
	return r;
}, {});


function decode(input,data){
	return abi.rawDecode(input,data);
}

function decodeOpenLock(encodedOpenLock){
	return encodedOpenLock.slice(0,96);
}

/* This service generates signed raw data that can be sent to any geth gateway. */
class BlockchainService{

	constructor(chainID,signatureCallback){
		this.chainID = chainID;
		//the signature callback receives the sign function, it can handle what to do before
		this.signatureCallback = signatureCallback;
	}

	
	//These are the call functions
	//we coulda abstract this more, but hey  
	getTransactionCount(ethAddress){
		return {"jsonrpc":"2.0","method":"eth_getTransactionCount","params":[util.addHexPrefix(ethAddress.toString('hex')),"latest"],"id":1};
	}

	getBalance(address){
		return {"jsonrpc":"2.0","method":"eth_getBalance","params":[util.addHexPrefix(ethAddress.toString('hex')),"latest"],"id":1};
	}

	getTokenBalance(tokenAddress,ethAddress){
		return this.ethCall([this._create(HumanStandardToken.abi.nettingContractsByAddress,
			null,
			null,
			null, 
			tokenAddress,
			null,
			[ethAddress],
			true)]);
	}


	getAddressAndBalance(channelAddress){
		return this.ethCall([this._create(NettingChannelContractAbi.addressAndBalance,
			null,
			null,
			null,
			channelAddress,
			null,
			[],
			true)]);
	}

	getNettingContractsByAddress(channelManagerAddress,nodeAddress){
		return this.ethCall([this._create(ChannelManagerContractAbi.nettingContractsByAddress,
			null,
			null,
			null,//compiled gas limit * 20% 
			channelManagerAddress,
			null,
			[nodeAddress],
			true)]);//this is a call, we dont need a sig
		//curl -X POST --data '{"jsonrpc":"2.0","method":"eth_call","params":[{see above}],"id":1}'

	
	}



	//these are transactions i.e. require signature callback
	transferToken(nonce,gasPrice,tokenAddress,to,amount){
		return this._create(HumanStandardTokenAbi.transfer,
			nonce,
			gasPrice,
			220000,//compiled gas limit * 20% 
			tokenAddress,
			null,
			[to,amount]);
	}

	approve(nonce,gasPrice,tokenAddress,spender,amount){
		return this._create(HumanStandardTokenAbi.approve,
			nonce,
			gasPrice,
			220000,//compiled gas limit * 20% 
			tokenAddress,
			null,
			[spender,amount]);
	}	


	newChannel(nonce,gasPrice,channelAddress,partnerAddress,timeout){
		
		return this._create(ChannelManagerContractAbi.newChannel,
			nonce,
			gasPrice,
			2200000,//compiled gas limit * 20% 
			channelAddress,
			null,
			[partnerAddress,timeout]);
		}	

	
	

	deposit(nonce,gasPrice,nettingChannelAddress,amount){
		return this._create(NettingChannelContractAbi.deposit,
			nonce,
			gasPrice,
			90000,//compiled gas limit * 20% 
			nettingChannelAddress,
			null,
			[amount]);
	}

	close(nonce,gasPrice,nettingChannelAddress,proof){

		return this._create(NettingChannelContractAbi.close,
			nonce,
			gasPrice,
			2400000,//compiled gas limit * 20% 
			nettingChannelAddress,
			null,
			[proof.nonce, proof.transferredAmount, proof.locksRoot, proof.messageHash,this.solidityPackSignature(proof.signature)]);
	}
	updateTransfer(nonce,gasPrice,nettingChannelAddress,proof){
		return this._create(NettingChannelContractAbi.updateTransfer,
			nonce,
			gasPrice,
			2400000,//compiled gas limit * 20% 
			nettingChannelAddress,
			null,
			[proof.nonce, proof.transferredAmount, proof.locksRoot, proof.messageHash,this.solidityPackSignature(proof.signature)]);
	}

	withdrawLock(nonce,gasPrice,nettingChannelAddress, encodedOpenLock, merkleProof,secret){
		var encodedLock = decodeOpenLock(encodedOpenLock);
		var merkleProofBytes = util.toBuffer("0x"+merkleProof.reduce(function(sum,proof){ sum+=proof.toString('hex'); return sum;},""));
		return this._create(NettingChannelContractAbi.withdraw,
			nonce,
			gasPrice,
			2400000,//compiled gas limit * 20% 
			nettingChannelAddress,
			null,
			[encodedLock, merkleProofBytes,secret]);	
	}

	settle(nonce,gasPrice,nettingChannelAddress){
		return this._create(NettingChannelContractAbi.settle,
			nonce,
			gasPrice,
			1200000,//compiled gas limit * 20% 
			nettingChannelAddress,
			null,
			[]);
	}

	solidityPackSignature(signature){
		var packed =  abi.solidityPack(['bytes32','bytes32','uint8'], [signature.r, signature.s, signature.v]);
		if(DEBUG){
			console.log("PACK SIGNATURE:"+packed.toString('hex'));
		}
		if(packed.length !== 65){
			throw new Error("Incompatible Signature!");
		};
		return packed;
	}


	_create(functionRef,nonce,gasPrice,gasLimit,to,value,params,noSignature){
		var inputs = functionRef.inputs.map(function(i) {
			return i.type;
		});
		
		var methodSignature = abi.methodID(functionRef.name, inputs );
		var paramsEncoded = "";
		if(params.length > 0){
		 	paramsEncoded= abi.rawEncode(inputs, params);
		}
		var inputs = functionRef.inputs.map(function(i) {
			return i.type;
		});
		var data = util.toBuffer("0x"+methodSignature.toString('hex') + 
			paramsEncoded.toString('hex'));
		if(DEBUG){
			console.info(functionRef.name + " encoded data:"+data.toString('hex'));
		}
		
		var txParams = {
		  nonce: nonce,
		  gasPrice: gasPrice, 
		  gasLimit: gasLimit,
		  data: data,
		  chainId: this.chainId
		}
		if(to){
			txParams.to = to;
		}
		if(value){
			txParams.value = value;
		}
		var tx = new EthereumTx(txParams)
		
		if(!noSignature){
			this.signatureCallback(function(privateKey){
				tx.sign(privateKey)
			});
		}
		return tx;	
	}

	
	//params should be an array
	ethCall(params,blockQuantity){
		if(!blockQuantity){
			blockQuantity = "latest";
		}
		params.push(blockQuantity);
		var result =  {
			"jsonrpc":"2.0",
			"method":"eth_call",
			"params":params,
			"id": this._getRandomInt()
		}
		return result;
		
	}

	ethSendRawTransaction(tx){
		var result = 
			{"jsonrpc":"2.0","method":"eth_sendRawTransactions","params":[util.addHexPrefix(tx.serialize().toString('hex'))],"id":1};
		return result;
		
	}

	_getRandomInt() {
  		return Math.floor(Math.random() * Math.floor(1000000000));
	}
}


module.exports={
	BlockchainService,decode
}


