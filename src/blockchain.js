const EthereumTx = require("ethereumjs-tx");
const abi = require("ethereumjs-abi");


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

	}




	createAndSignTransaction(nonce,gasPrice,gasLimit,to,value,data){
		const txParams = {
		  nonce: nonce,
		  gasPrice: gasPrice, 
		  gasLimit: gasLimit,
		  to: to, 
		  value: value, 
		  data: data,
		  // EIP 155 chainId - mainnet: 1, ropsten: 3
		  chainId: this.chainID
		}

		var tx = new EthereumTx(txParams)
		this.signatureCallback(function(privateKey){
			tx.sign(privateKey)
		});
		//keccak256(tx.serialize()) will get you the txHash
		return tx;	
	}
	
}