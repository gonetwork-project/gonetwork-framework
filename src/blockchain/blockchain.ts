/*
* @Author: amitshah
* @Date:   2018-04-17 22:26:32
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-27 03:06:55
*/

import * as EthereumTx from 'ethereumjs-tx'
import * as abi from 'ethereumjs-abi'
import * as util from 'ethereumjs-util'
import fetch from 'node-fetch'

// todo - add proper types
const ChannelManagerContract = require('../../smart-contracts/build/contracts/ChannelManagerContract.json')
const NettingChannelContract = require('../../smart-contracts/build/contracts/NettingChannelContract.json')
const HumanStandardTokenContract = require('../../smart-contracts/build/contracts/HumanStandardToken.json')

import * as T from '../types'

// todo - inject it somehow or remove
const DEBUG = false

const ChannelManagerContractAbi = ChannelManagerContract.abi.reduce(function (r, i) {
  r[i.name] = i
  return r
}, {})

const NettingChannelContractAbi = NettingChannelContract.abi.reduce(function (r, i) {
  r[i.name] = i
  return r
}, {})

const HumanStandardTokenAbi = HumanStandardTokenContract.abi.reduce(function (r, i) {
  r[i.name] = i
  return r
}, {})



/*** Class that provides a lightweight minimalist means to interact with the blockchain using promises */
export class BlockchainService implements T.BlockchainService {

  chainId: T.ChainId
  signatureCallback: any

  constructor (chainID, signatureCallback,providerUrl) {
    this.chainId = chainID
    this.providerUrl = providerUrl;
    // the signature callback receives the sign function, it can handle what to do before
    this.signatureCallback = signatureCallback
  }

  getBlockNumber(){
    return this.fetchSimple('eth_blockNumber', [ 'latest']);        
  }

  // These are the call functions
  // we coulda abstract this more, but hey
  getTransactionCount (a: Buffer) {
    return this.fetchSimple('eth_getTransactionCount', [util.addHexPrefix(a.toString('hex')), 'latest']);
  }

  getBalance (a: Buffer) {
    return this.fetchSimple('eth_getBalance', [util.addHexPrefix(a.toString('hex')), 'latest']);
  }

  fetchSimple(method:string, params:string[]){
    var randomInt = this._getRandomInt();
    return fetch(this.providerUrl,
      {
        "method": 'POST',
        "headers": {
          "contentType": 'application/json'
        },
        "body": JSON.stringify({
          'jsonrpc': '2.0', 
          'method': method, 
          'params': params,
          'id':randomInt
        })
          
      })
    .then(res=> {
      if(res.status !== 200) throw new Error();
       return res.json()
     });
    
  }

  getTokenBalance(tokenAddress: Buffer, from: Buffer,  nodeAddress: Buffer) {
      return this.fetchAndDecodeCall(HumanStandardTokenAbi.balanceOf,
        tokenAddress.toString('hex'),
         from.toString('hex'),
        [util.addHexPrefix(nodeAddress.toString('hex'))]);
  }

  getAddressAndBalance (channelAddress:Buffer, from:Buffer) {
    return this.fetchAndDecodeCall(NettingChannelContractAbi.addressAndBalance,
      channelAddress.toString("hex"),
      from.toString("hex"),[]);
  }

  getNettingContractsByAddress (channelManagerAddress:Buffer, from:Buffer, nodeAddress:Buffer) {
    return this.fetchAndDecodeCall(ChannelManagerContractAbi.nettingContractsByAddress,
      channelManagerAddress.toString("hex"),
      from.toString("hex"),[util.addHexPrefix(nodeAddress.toString("hex"))]);
  }

  getClosingAddress(nettingChannelAddress:Buffer, from:Buffer){
     return this.fetchAndDecodeCall(NettingChannelContractAbi.closingAddress,
      nettingChannelAddress.toString("hex"),
      from.toString("hex"),[]);
  }

  fetchAndDecodeCall(functionRef,to:string,from:string,data:any[]){
    return fetch(this.providerUrl,
      {
        "method": 'POST',
        "headers": {
          "contentType": 'application/json'
        },
        "body": JSON.stringify(
          this.ethCall([this._createCall(functionRef, 
            util.addHexPrefix(to), 
            util.addHexPrefix(from), 
            data)])
          )
      })
    .then(result => result.status === 200 ?
            result.json()
              .then(r => {
                return  this._decode(functionRef,r.result);
              })
            : new Error());
  }

  fetchAndDecodeTx(functionRef,nonce:BN,gasPrice:BN,gasLimit:BN,to:Buffer,value:BN,params:any[]){
    return fetch(this.providerUrl,
      {
        "method": 'POST',
        "headers": {
          "contentType": 'application/json'
        },
        //_create (functionRef, nonce, gasPrice, gasLimit, to, value, params) {
        "body": JSON.stringify(
          this.ethSendRawTransaction(this._create(functionRef, 
            nonce,gasPrice,gasLimit,to,value,params))
          )
      })
    .then(res=> {
      if(res.status !== 200) throw new Error("NEW MESSAGE");
       return res.json()
     });
  }
  // these are transactions i.e. require signature callback
  transferToken (nonce, gasPrice, tokenAddress, to, amount) {
    return this.fetchAndDecodeTx(HumanStandardTokenAbi.transfer,
      nonce,
      gasPrice,
      220000, // compiled gas limit * 20%
      tokenAddress,
      null,
      [to, amount])
  }

  approve (nonce, gasPrice, tokenAddress, spender, amount) {
    return this.fetchAndDecodeTx(HumanStandardTokenAbi.approve,
      nonce,
      gasPrice,
      220000, // compiled gas limit * 20%
      tokenAddress,
      null,
      [spender, amount]);
  }

  newChannel (nonce, gasPrice, channelAddress, partnerAddress, timeout) {

    return this.fetchAndDecodeTx(ChannelManagerContractAbi.newChannel,
      nonce,
      gasPrice,
      2200000,// compiled gas limit * 20%
      channelAddress,
      null,
      [partnerAddress, timeout])
  }

  deposit (nonce, gasPrice, nettingChannelAddress, amount) {
    return this.fetchAndDecodeTx(NettingChannelContractAbi.deposit,
      nonce,
      gasPrice,
      90000,// compiled gas limit * 20%
      nettingChannelAddress,
      null,
      [amount])
  }

  close (nonce, gasPrice, nettingChannelAddress, proof) {
    return this.fetchAndDecodeTx(NettingChannelContractAbi.close,
      nonce,
      gasPrice,
      2400000,// compiled gas limit * 20%
      nettingChannelAddress,
      null,
      [proof.nonce, proof.transferredAmount, proof.locksRoot, proof.messageHash, this.solidityPackSignature(proof.signature)]);
  }

  updateTransfer (nonce, gasPrice, nettingChannelAddress, proof) {
    return this.fetchAndDecodeTx(NettingChannelContractAbi.updateTransfer,
      nonce,
      gasPrice,
      2400000,// compiled gas limit * 20%
      nettingChannelAddress,
      null,
      [proof.nonce, proof.transferredAmount, proof.locksRoot, proof.messageHash, this.solidityPackSignature(proof.signature)]);
  }

  withdrawLock (nonce, gasPrice, nettingChannelAddress, encodedLock, merkleProof, secret) {
    let merkleProofBytes = util.toBuffer('0x' + merkleProof.reduce(function (sum, proof) {
      sum += proof.toString('hex')
      return sum
    }, ''))
    return this.fetchAndDecodeTx(NettingChannelContractAbi.withdraw,
      nonce,
      gasPrice,
      2400000,// compiled gas limit * 20%
      nettingChannelAddress,
      null,
      [encodedLock, merkleProofBytes, secret]);
  }

  settle (nonce, gasPrice, nettingChannelAddress) {
    return this.fetchAndDecodeTx(NettingChannelContractAbi.settle,
      nonce,
      gasPrice,
      1200000,// compiled gas limit * 20%
      nettingChannelAddress,
      null,
      [])
  }

  solidityPackSignature (signature) {
    let packed = abi.solidityPack(['bytes32', 'bytes32', 'uint8'], [signature.r, signature.s, signature.v])
    if (DEBUG) {
      console.log('PACK SIGNATURE:' + packed.toString('hex'))
    }
    if (packed.length !== 65) {
      throw new Error('Incompatible Signature!')
    }
    return packed
  }

  _createCall(functionRef,to,from,params){
        let inputs = functionRef.inputs.map(function (i) {
            return i.type;
        });
        
        
   
        let methodSignature = abi.methodID(functionRef.name, inputs);
        let paramsEncoded = Buffer.alloc(0);
        if (params.length > 0) {
            paramsEncoded = abi.rawEncode(inputs, params);
        }
        inputs = functionRef.inputs.map(function (i) {
            return i.type;
        });
        console.log(paramsEncoded);
        let data = util.toBuffer('0x' + methodSignature.toString('hex') +
            paramsEncoded.toString('hex'));
        if (DEBUG) {
            console.info(functionRef.name + ' encoded data:' + data.toString('hex'));
        }
        let txCall = {
            from:from,
            to:to,
            data: util.addHexPrefix(data.toString("hex"))
        };
        return txCall;
    }

    /*** decoder run on request results */ 
   _decode(functionRef,encodedData){
     let outputs = functionRef.outputs.map(function (i) {
          return i.type
        })
     
     return  abi.rawDecode(outputs,util.toBuffer(encodedData)).reduce(function(s,v,i){

              var key =  functionRef.outputs[i].name == '' ? functionRef.outputs[i].type:functionRef.outputs[i].name ;
              s[key]=v;
            
            return s;
          },{});
     
   }

  _create (functionRef, nonce, gasPrice, gasLimit, to, value, params) {
    let inputs = functionRef.inputs.map(function (i) {
      return i.type
    })

    let methodSignature = abi.methodID(functionRef.name, inputs)
    let paramsEncoded = ''
    if (params.length > 0) {
      paramsEncoded = abi.rawEncode(inputs, params)
    }
    inputs = functionRef.inputs.map(function (i) {
      return i.type
    })
    let data = util.toBuffer('0x' + methodSignature.toString('hex') +
      (paramsEncoded as any).toString('hex'))
    if (DEBUG) {
      console.info(functionRef.name + ' encoded data:' + data.toString('hex'))
    }

    let txParams = {
      nonce: nonce,
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      data: data,
      chainId: this.chainId
    } as any // todo: improve types
    if (to) {
      txParams.to = to
    }
    if (value) {
      txParams.value = value
    }
    let tx = new EthereumTx(txParams)

   
      this.signatureCallback(function (privateKey) {
        tx.sign(privateKey)
      })
    
    return tx
  }

  

  ethCall (params: any[], blockQuantity?: T.BlockQuantity) {
    if (!blockQuantity) {
      blockQuantity = 'latest'
    }
    params.push(blockQuantity);
    let result = {
      'jsonrpc': '2.0',
      'method': 'eth_call',
      'params': params,
      'id': this._getRandomInt()
    }
    return result
  }

  ethSendRawTransaction (tx) {
    let result = { 'jsonrpc': '2.0', 'method': 'eth_sendRawTransaction', 'params': [util.addHexPrefix(tx.serialize().toString('hex'))], 'id': this._getRandomInt() }
    console.log(result);
    return result
  }

  _getRandomInt () {
    return Math.floor(Math.random() * Math.floor(1000000000))
  }
}
