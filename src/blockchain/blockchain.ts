import * as EthereumTx from 'ethereumjs-tx'
import * as abi from 'ethereumjs-abi'
import * as util from 'ethereumjs-util'

// todo - add proper types
import ChannelManagerContract from '../smart-contracts/build/contracts/ChannelManagerContract.json'
import NettingChannelContract from '../smart-contracts/build/contracts/NettingChannelContract.json'
import HumanStandardTokenContract from '../smart-contracts/build/contracts/HumanStandardToken.json'

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

export const decode = (input, data) => {
  return abi.rawDecode(input, data)
}

function decodeOpenLock (encodedOpenLock) {
  return encodedOpenLock.slice(0, 96)
}

/* This service generates signed raw data that can be sent to any geth gateway. */
export class BlockchainService {

  chainId: T.ChainId
  signatureCallback: any

  constructor (chainID, signatureCallback) {
    this.chainId = chainID
    // the signature callback receives the sign function, it can handle what to do before
    this.signatureCallback = signatureCallback
  }

  // These are the call functions
  // we coulda abstract this more, but hey
  getTransactionCount (a: T.EthAddress) {
    return { 'jsonrpc': '2.0', 'method': 'eth_getTransactionCount', 'params': [util.addHexPrefix(a.toString('hex')), 'latest'], 'id': 1 }
  }

  getBalance (a: T.EthAddress) {
    return { 'jsonrpc': '2.0', 'method': 'eth_getBalance', 'params': [util.addHexPrefix(a.toString('hex')), 'latest'], 'id': 1 }
  }

  getTokenBalance (tokenAddress, ethAddress) {
    return this.ethCall([this._create(HumanStandardTokenContract.abi.nettingContractsByAddress,
      null,
      null,
      null,
      tokenAddress,
      null,
      [ethAddress],
      true)])
  }

  getAddressAndBalance (channelAddress) {
    return this.ethCall([this._create(NettingChannelContractAbi.addressAndBalance,
      null,
      null,
      null,
      channelAddress,
      null,
      [],
      true)])
  }

  getNettingContractsByAddress (channelManagerAddress, nodeAddress) {
    return this.ethCall([this._create(ChannelManagerContractAbi.nettingContractsByAddress,
      null,
      null,
      null, // compiled gas limit * 20%
      channelManagerAddress,
      null,
      [nodeAddress],
      true)]) // this is a call, we dont need a sig
    // curl -X POST --data '{'jsonrpc':'2.0','method':'eth_call','params':[{see above}],'id':1}'
  }

  // these are transactions i.e. require signature callback
  transferToken (nonce, gasPrice, tokenAddress, to, amount) {
    return this._create(HumanStandardTokenAbi.transfer,
      nonce,
      gasPrice,
      220000, // compiled gas limit * 20%
      tokenAddress,
      null,
      [to, amount])
  }

  approve (nonce, gasPrice, tokenAddress, spender, amount) {
    return this._create(HumanStandardTokenAbi.approve,
      nonce,
      gasPrice,
      220000, // compiled gas limit * 20%
      tokenAddress,
      null,
      [spender, amount])
  }

  newChannel (nonce, gasPrice, channelAddress, partnerAddress, timeout) {

    return this._create(ChannelManagerContractAbi.newChannel,
      nonce,
      gasPrice,
      2200000,// compiled gas limit * 20%
      channelAddress,
      null,
      [partnerAddress, timeout])
  }

  deposit (nonce, gasPrice, nettingChannelAddress, amount) {
    return this._create(NettingChannelContractAbi.deposit,
      nonce,
      gasPrice,
      90000,// compiled gas limit * 20%
      nettingChannelAddress,
      null,
      [amount])
  }

  close (nonce, gasPrice, nettingChannelAddress, proof) {
    return this._create(NettingChannelContractAbi.close,
      nonce,
      gasPrice,
      2400000,// compiled gas limit * 20%
      nettingChannelAddress,
      null,
      [proof.nonce, proof.transferredAmount, proof.locksRoot, proof.messageHash, this.solidityPackSignature(proof.signature)])
  }

  updateTransfer (nonce, gasPrice, nettingChannelAddress, proof) {
    return this._create(NettingChannelContractAbi.updateTransfer,
      nonce,
      gasPrice,
      2400000,// compiled gas limit * 20%
      nettingChannelAddress,
      null,
      [proof.nonce, proof.transferredAmount, proof.locksRoot, proof.messageHash, this.solidityPackSignature(proof.signature)])
  }

  withdrawLock (nonce, gasPrice, nettingChannelAddress, encodedOpenLock, merkleProof, secret) {
    let encodedLock = decodeOpenLock(encodedOpenLock)
    let merkleProofBytes = util.toBuffer('0x' + merkleProof.reduce(function (sum, proof) {
      sum += proof.toString('hex')
      return sum
    }, ''))
    return this._create(NettingChannelContractAbi.withdraw,
      nonce,
      gasPrice,
      2400000,// compiled gas limit * 20%
      nettingChannelAddress,
      null,
      [encodedLock, merkleProofBytes, secret])
  }

  settle (nonce, gasPrice, nettingChannelAddress) {
    return this._create(NettingChannelContractAbi.settle,
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

  _create (functionRef, nonce, gasPrice, gasLimit, to, value, params, noSignature?) {
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

    if (!noSignature) {
      this.signatureCallback(function (privateKey) {
        tx.sign(privateKey)
      })
    }
    return tx
  }

  ethCall (params: any[], blockQuantity?: T.BlockQuantity) {
    if (!blockQuantity) {
      blockQuantity = 'latest'
    }
    params.push(blockQuantity)
    let result = {
      'jsonrpc': '2.0',
      'method': 'eth_call',
      'params': params,
      'id': this._getRandomInt()
    }
    return result
  }

  ethSendRawTransaction (tx) {
    let result = { 'jsonrpc': '2.0', 'method': 'eth_sendRawTransactions', 'params': [util.addHexPrefix(tx.serialize().toString('hex'))], 'id': 1 }
    return result

  }

  _getRandomInt () {
    return Math.floor(Math.random() * Math.floor(1000000000))
  }
}
