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
		var txParams = {
		  nonce: nonce,
		  gasPrice: gasPrice, 
		  gasLimit: gasLimit,
		 
		  data: util.toBuffer("0x"+methodSignature.toString('hex') + 
			paramsEncoded.toString('hex')),
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
			900000,//compiled gas limit * 20% 
			nettingChannelAddress,
			null,
			[]);
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

	updateTransfer(){


	}

	

	solidityPackSignature(signature){
		var packed =  abi.solidityPack(['bytes32','bytes32','uint8'], signature.r, signature.s, signature.v);
		assert(packed.length == 65);

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


	
}

var pk1=util.toBuffer("0xb507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42");
var pk2 =util.toBuffer("0x4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78");
var pk3=util.toBuffer("0xa8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d");
var pk4=util.toBuffer("0x157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224");

 var acct1 = "0xf0c3043550e5259dc1c838d0ea600364d999ea15";
    var acct2 = "0xb0ae572146ab8b5990e069bff487ac25635dabe8";
    var acct3 = "0xff8a018d100ace078d214f02be8df9c6944e7a2b";
    var acct4 = "0xf77e9ef93380c70c938ca2e859baa88be650d87d";

var bc = new BlockchainService(0,function(cb) {
	cb(pk1);
})

var tx = bc.newChannel(8,1,"0x05e1b1806579881cfd417e1716f23b1900568346", acct4,150);

//console.log(tx);

// console.log('web3.eth.sendTransaction({to:"0xe706eb3754781662b9e372f5f0a23ffb41d0d946",from:web3.eth.accounts[0],data:');
// console.log(tx.raw[4].toString('hex'));
// console.log(',gas:2200000})');
console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");
// console.log(tx.verifySignature());
// console.log(tx.serialize().toString('hex'));

tx = bc.approve(9,1, "0x9c1af2395beb97375eaee816e355863ec925bc2e","0x8bf6a4702d37b7055bc5495ac302fe77dae5243b",500);
console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");



tx = bc.deposit(10,1,"0x8bf6a4702d37b7055bc5495ac302fe77dae5243b",27);
console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");

tx = bc.close(11,1,"0x8bf6a4702d37b7055bc5495ac302fe77dae5243b");
console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");

tx = bc.settle(13,1,"0x8bf6a4702d37b7055bc5495ac302fe77dae5243b");
console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");

