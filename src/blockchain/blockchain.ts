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

/* tslint:disable*/

//TODO: extend this to add proper event Type support
const ChannelManagerContract = require('../../smart-contracts/build/contracts/ChannelManagerContract.json')
const NettingChannelContract = require('../../smart-contracts/build/contracts/NettingChannelContract.json')
const HumanStandardTokenContract = require('../../smart-contracts/build/contracts/HumanStandardToken.json')

import * as T from '../types'
import { BN } from '../types'


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

/*** Class that provides a lightweight minimalist approach means to interact with the blockchain using promises over the contract ABI's*/
export class BlockchainService implements T.BlockchainService {

  chainId: T.ChainId
  signatureCallback: any
  providerUrl: string

  /** Initialize the blockchain service
  * @param {BN} chainID - the chainID you will operate with.  This is important for signature
  * @param {function} signatureCallback - a callback function that is excuted prior to signing a message.
  * The callback receives the transaction signing function so by running it your callback your effectively sign
  * the transactions and by discarding it you prevent signing. e.g. You have a confirm modal, user says no, throw new Error() instead of running supplied function 
  * @param {string} providerUrl - the url endpoint of the geth rpc methods.  Atm, only url encoded authorization schemes are supported 
  * e.g. infura api endpoint. Check the test/ folder for examples of how its set
  */
  constructor (chainID, signatureCallback, providerUrl) {
    this.chainId = chainID
    this.providerUrl = providerUrl;
    // the signature callback receives the sign function, it can handle what to do before
    this.signatureCallback = signatureCallback
  }

  /** Get current mined block number from your geth provider */
  getBlockNumber () {
    return this.fetchSimple('eth_blockNumber', [], x => { return new util.BN(x) });
  }

  /**These are the call functions*/

  /** Get the nonce for an address 
  * @param {Buffer} address - the eth address to get the nonce value for.  This can be a contract address as well
  */
  getTransactionCount (address: Buffer) {
    return this.fetchSimple('eth_getTransactionCount', [util.addHexPrefix(address.toString('hex')), 'latest'], x => { 

      return new util.BN(util.toBuffer(x)) });
  }

  /** Get the nonce for an address 
  * @param {Buffer} address - the eth address to get the ETH Balance value for.  This can be a contract address as well
  */
  getBalance (address: Buffer) {
    return this.fetchSimple('eth_getBalance', [util.addHexPrefix(address.toString('hex')), 'latest'], x => { return new util.BN(util.toBuffer(x)) });
  }

  /** fetch with a post request one of the "primitive" geth commands i.e. eth_blockNumber, eth_getTransactionCount,eth_getBalance, etc  
 * @param {string} method - the eth_* rpc method name.  Refer to https://github.com/ethereum/wiki/wiki/JSON-RPC
 * @param {string[]} params - the string encoded or BN parameters to be passed to the method (all bytes and addresses must be converted to 0x leading strings)
 * @param {function} decode - an optional decode function that is run on the result data 
 * @returns {string[]} - hex string array
 */
  getLogs (address: Buffer, fromBlock: BN, toBlock: BN, topicsArray: string[]) {
    return this.fetchSimple('eth_getLogs',
      [{
        "fromBlock": util.addHexPrefix(fromBlock.toString(16)),
        "toBlock": util.addHexPrefix(toBlock.toString(16)),
        "address": util.addHexPrefix(address.toString('hex')),
        "topics": topicsArray
      }]
      , x => {
        return x.sort((a, b) => {
          return a.blockNumber - b.blockNumber || a.logIndex - b.logIndex;
        });
      })
  }

  /** fetch with a post request one of the "primitive" geth commands i.e. eth_blockNumber, eth_getTransactionCount,eth_getBalance, etc  
 * @param {string} method - the eth_* rpc method name.  Refer to https://github.com/ethereum/wiki/wiki/JSON-RPC
 * @param {string[]} params - the string encoded or BN parameters to be passed to the method (all bytes and addresses must be converted to 0x leading strings)
 * @param {function} decode - an optional decode function that is run on the result data 
 */
  fetchSimple (method: string, params: string[] | any, decode) {
    let randomInt = this._getRandomInt();
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
          'id': randomInt
        })

      })
      .then(res => {
        if (res.status !== 200) throw new Error();
        return res.json().then(r => decode ? decode(r.result) : r.result);
      });

  }

  getContractData (nettingChannelAddress: Buffer, from: Buffer) {
    return this.fetchAndDecodeCall(NettingChannelContractAbi.data,
      nettingChannelAddress.toString("hex"),
      from.toString('hex'),
      []);
  }

  /*** retreives the channelPartnerAddress, transferredAmount, and locksRoot you submitted in the proof*/
  getParticipantData (nettingChannelAddress: Buffer, from: Buffer) {
    return this.fetchAndDecodeCall(NettingChannelContractAbi.participantData,
      nettingChannelAddress.toString("hex"),
      from.toString('hex'),
      []);
  }

  getTokenBalance (tokenAddress: Buffer, from: Buffer, nodeAddress: Buffer) {
    return this.fetchAndDecodeCall(HumanStandardTokenAbi.balanceOf,
      tokenAddress.toString('hex'),
      from.toString('hex'),
      [util.addHexPrefix(nodeAddress.toString('hex'))]);
  }

  getAddressAndBalance (channelAddress: Buffer, from: Buffer) {
    return this.fetchAndDecodeCall(NettingChannelContractAbi.addressAndBalance,
      channelAddress.toString("hex"),
      from.toString("hex"), []);
  }

  getNettingContractsByAddress (channelManagerAddress: Buffer, from: Buffer, nodeAddress: Buffer) {
    return this.fetchAndDecodeCall(ChannelManagerContractAbi.nettingContractsByAddress,
      channelManagerAddress.toString("hex"),
      from.toString("hex"), [util.addHexPrefix(nodeAddress.toString("hex"))]);
  }

  getClosingAddress (nettingChannelAddress: Buffer, from: Buffer) {
    return this.fetchAndDecodeCall(NettingChannelContractAbi.closingAddress,
      nettingChannelAddress.toString("hex"),
      from.toString("hex"), []);
  }

  fetchAndDecodeCall (functionRef, to: string, from: string, data: any[]) {
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
            return this._decode(functionRef, r.result);
          })
        : new Error());
  }

  fetchAndDecodeTx (functionRef, nonce: BN, gasPrice: BN, gasLimit: BN | number, to: Buffer, value: BN | null, params: any[]) {
    return fetch(this.providerUrl,
      {
        "method": 'POST',
        "headers": {
          "contentType": 'application/json'
        },
        //_create (functionRef, nonce, gasPrice, gasLimit, to, value, params) {
        "body": JSON.stringify(
          this.ethSendRawTransaction(this._create(functionRef,
            nonce, gasPrice, gasLimit, to, value, params))
        )
      })
      .then(res => {
        if (res.status !== 200) throw new Error("NEW MESSAGE");
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

  _createCall (functionRef, to, from, params) {
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
      from: from,
      to: to,
      data: util.addHexPrefix(data.toString('hex'))
    };
    return txCall;
  }

  /*** decoder run on request results */
  _decode (functionRef, encodedData) {
    let outputs = functionRef.outputs.map(function (i) {
      return i.type
    })

    return abi.rawDecode(outputs, util.toBuffer(encodedData)).reduce(function (s, v, i) {

      let key = functionRef.outputs[i].name == '' ? functionRef.outputs[i].type : functionRef.outputs[i].name;
      s[key] = v;

      return s;
    }, {});

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
