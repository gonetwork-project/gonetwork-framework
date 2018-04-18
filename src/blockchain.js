/*
* @Author: amitshah
* @Date:   2018-04-17 22:26:10
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-18 01:12:06
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

class BlockchainService{

	constructor(chainID,signatureCallback){
		this.chainID = chainID;
		//the signature callback receives the sign function, it can handle what to do before
		//and after
		this.signatureCallback = signatureCallback;
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

	approve(nonce,gasPrice,tokenAddress,spender,amount){
		return this._create(HumanStandardTokenAbi.approve,
			nonce,
			gasPrice,
			220000,//compiled gas limit * 20% 
			tokenAddress,
			null,
			[spender,amount]);
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

	_create(functionRef,nonce,gasPrice,gasLimit,to,value,params){
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
		this.signatureCallback(function(privateKey){
			tx.sign(privateKey)
		});
		return tx;	
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

		console.log("PACK SIGNATURE:"+packed.toString('hex'));
		debugger;
		if(packed.length !== 65){
			throw new Error("Incompatible Signature!");
		};
		return packed;
	}

	createAndSignTransaction(nonce,gasPrice,gasLimit,to,value,data){

		const txParams = {
		  nonce: nonce,
		  gasPrice: gasPrice, 
		  gasLimit: gasLimit,
		  to: to, 
		  value: value, 
		  data: data,
		  //gas:22000000,
		  // EIP 155 chainId - mainnet: 1, ropsten: 3
		  chainId: 0
		}

		console.log(util.addHexPrefix(data));
		var tx = new EthereumTx(txParams)
		this.signatureCallback(function(privateKey){
			tx.sign(privateKey)
		});
		//tx.gas = 22000000;

		//keccak256(tx.serialize()) will get you the txHash
		return tx;	
	}

	
}


module.exports={
	BlockchainService,decode
}


