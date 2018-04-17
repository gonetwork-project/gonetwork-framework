const EthereumTx = require("ethereumjs-tx");
const abi = require("ethereumjs-abi");
const util = require("ethereumjs-util");

const ChannelManagerContract = require("../smart-contracts/build/contracts/ChannelManagerContract.json");
const NettingChannelContract = require('../smart-contracts/build/contracts/NettingChannelContract.json');
const HumanStandardTokenContract = require("../smart-contracts/build/contracts/HumanStandardToken.json");

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
class BlockchainService{

	constructor(chainID,signatureCallback){
		this.chainID = chainID;
		//the signature callback receives the sign function, it can handle what to do before
		//and after
		this.signatureCallback = signatureCallback;
		this.gasPrice = '0x09184e72a000';
		this.gasLimit = '0x2710';
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

		console.log("DATA:"+data.toString('hex'));
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


	// uint256 nonce,
 //        uint256 transferred_amount,
 //        bytes32 locksroot,
 //        bytes32 extra_hash,
 //        bytes signature
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

	withdrawLock(nonce,gasPrice,openLock, merkleProof,secret){
		return this._create(NettingChannelContractAbi.updateTransfer,
			nonce,
			gasPrice,
			2400000,//compiled gas limit * 20% 
			nettingChannelAddress,
			null,
			[openLock.encode(), merkleProof,secret]);	
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

	solidityPackLocks(){

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

	//stateChannel.message.Proof
	mapProofToSolidity(proof){

	}

	
}


module.exports={
	BlockchainService,decode
}


