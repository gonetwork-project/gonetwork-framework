import { BN } from 'bn.js'
import { Address, Abi } from 'eth-types'

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

// tslint:disable
export const abi: Abi = [
  {
    "constant": true,
    "inputs": [],
    "name": "contract_version",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "msg",
        "type": "string"
      }
    ],
    "name": "Info",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "addy",
        "type": "address"
      }
    ],
    "name": "InfoAddress",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "a",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "locksRoot",
        "type": "bytes32"
      }
    ],
    "name": "UpdatedTranser",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "expiration",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "hashlock",
        "type": "bytes32"
      }
    ],
    "name": "DecodeLock",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "hashlock",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "name": "secret",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "name": "processsed",
        "type": "bytes32"
      }
    ],
    "name": "HashLockSecret",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "expiration",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "blockNumber",
        "type": "uint256"
      }
    ],
    "name": "ExpirationBlockNumber",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "locked_encoded",
        "type": "bytes"
      },
      {
        "indexed": false,
        "name": "merkle_proof",
        "type": "bytes"
      },
      {
        "indexed": false,
        "name": "h",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "name": "locksroot",
        "type": "bytes32"
      }
    ],
    "name": "ComputeMerkleRoot",
    "type": "event"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "self",
        "type": "NettingChannelLibrary.Data storage"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "deposit",
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      },
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "self",
        "type": "NettingChannelLibrary.Data storage"
      },
      {
        "name": "nonce",
        "type": "uint256"
      },
      {
        "name": "transferred_amount",
        "type": "uint256"
      },
      {
        "name": "locksroot",
        "type": "bytes32"
      },
      {
        "name": "extra_hash",
        "type": "bytes32"
      },
      {
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "close",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "self",
        "type": "NettingChannelLibrary.Data storage"
      },
      {
        "name": "nonce",
        "type": "uint256"
      },
      {
        "name": "transferred_amount",
        "type": "uint256"
      },
      {
        "name": "locksroot",
        "type": "bytes32"
      },
      {
        "name": "extra_hash",
        "type": "bytes32"
      },
      {
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "updateTransfer",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "self",
        "type": "NettingChannelLibrary.Data storage"
      },
      {
        "name": "locked_encoded",
        "type": "bytes"
      },
      {
        "name": "merkle_proof",
        "type": "bytes"
      },
      {
        "name": "secret",
        "type": "bytes32"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "self",
        "type": "NettingChannelLibrary.Data storage"
      },
      {
        "name": "locked_encoded",
        "type": "bytes"
      },
      {
        "name": "merkle_proof",
        "type": "bytes"
      },
      {
        "name": "secret",
        "type": "bytes32"
      }
    ],
    "name": "withdrawTest",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "self",
        "type": "NettingChannelLibrary.Data storage"
      }
    ],
    "name": "settle",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "lock",
        "type": "bytes"
      }
    ],
    "name": "decodeLock",
    "outputs": [
      {
        "name": "expiration",
        "type": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256"
      },
      {
        "name": "hashlock",
        "type": "bytes32"
      }
    ],
    "payable": false,
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "self",
        "type": "NettingChannelLibrary.Data storage"
      }
    ],
    "name": "participantData",
    "outputs": [
      {
        "name": "",
        "type": "address"
      },
      {
        "name": "",
        "type": "uint256"
      },
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "lock",
        "type": "bytes"
      },
      {
        "name": "merkle_proof",
        "type": "bytes"
      }
    ],
    "name": "computeMerkleRoot",
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "payable": false,
    "stateMutability": "pure",
    "type": "function"
  }
]

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠
