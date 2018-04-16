const EthereumTx = require("ethereumjs-tx");
const abi = require("ethereumjs-abi");
const util = require("ethereumjs-util");

const ChannelManagerContract = require("../smart-contracts/build/contracts/ChannelManagerContract.json");

const ChannelManagerContractAbi = ChannelManagerContract.abi.reduce(function(r, i){
	r[i.name] = i;
	return r;
}, {});

console.log(ChannelManagerContractAbi.newChannel);
var inputs = ChannelManagerContractAbi.newChannel.inputs.map(function(i) {
	return i.type;
});



//0x
//methodID: f26c6aed
//0000000000000000000000005ac5c77f01a11511f9734110c25710ae855f251
//00000000000000000000000000000000000000000000000000000000000000096

//console.log(methodSignature.toString('hex') + params.toString('hex'));

class BlockchainService{

	constructor(chainID,signatureCallback){
		this.chainID = chainID;
		//the signature callback receives the sign function, it can handle what to do before
		//and after
		this.signatureCallback = signatureCallback;
		this.gasPrice = '0x09184e72a000';
		this.gasLimit = '0x2710';
	}


	newChannel(myAddress,partnerAddress){
		//var encoded = abi.encode(tokenAbi, "balanceOf(uint256 address)", [ "0x0000000000000000000000000000000000000000" ])
		var methodSignature = abi.methodID(ChannelManagerContractAbi.newChannel.name, inputs);
		var params = abi.rawEncode(inputs, ["0x4aa327e830c8eec7727076712270f2766d4f6b59", 0x96])
		console.log(methodSignature);
		return this.createAndSignTransaction(35,10,2200000,"0xe706eb3754781662b9e372f5f0a23ffb41d0d946",0,
			util.toBuffer("0x"+methodSignature.toString('hex') + 
			params.toString('hex')));
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


	createData(method,parameters){
		abi.methodID()
	}
	
}


var bc = new BlockchainService(0,function(cb) {
	cb(util.toBuffer("0x1d11a4283dfbf28f9c9691badb26ccf11a7984d88b28291bcaadab4199017b5b"));
})

var tx = bc.newChannel();

console.log(tx);

console.log('web3.eth.sendTransaction({to:"0xe706eb3754781662b9e372f5f0a23ffb41d0d946",from:web3.eth.accounts[0],data:');
console.log(tx.raw[4].toString('hex'));
console.log(',gas:2200000})');
console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");
console.log(tx.verifySignature());
console.log(tx.serialize().toString('hex'));