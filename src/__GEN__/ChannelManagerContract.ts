import { BN } from 'bn.js'
import { Address, Abi } from 'eth-types'

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type ManagerIO = {
  transferOwnership: [
    {
      newOwner: Address
    },
    void
  ],
  collectFees: [
    null,
    void
  ],
  newChannel: [
    {
      partner: Address,
      settle_timeout: BN
    },
    Address
  ]
}

export const ManagerOrdIO = {
  transferOwnership: [
    [
      [
        'newOwner',
        'address'
      ]
    ],
    []
  ],
  collectFees: [
    [],
    []
  ],
  newChannel: [
    [
      [
        'partner',
        'address'
      ],
      [
        'settle_timeout',
        'uint256'
      ]
    ],
    [
      [
        '',
        'address'
      ]
    ]
  ]
}

export type ManagerConstIO = {
  contractExists: [
    {
      channel: Address
    },
    boolean
  ],
  owner: [
    null,
    Address
  ],
  contract_version: [
    null,
    string
  ],
  fee: [
    null,
    BN
  ],
  getChannelsAddresses: [
    null,
    Address[]
  ],
  tokenAddress: [
    null,
    Address
  ],
  getChannelWith: [
    {
      partner: Address
    },
    Address
  ],
  nettingContractsByAddress: [
    {
      node_address: Address
    },
    Address[]
  ],
  getChannelsParticipants: [
    null,
    Address[]
  ]
}

export const ManagerConstOrdIO = {
  contractExists: [
    [
      [
        'channel',
        'address'
      ]
    ],
    [
      [
        '',
        'bool'
      ]
    ]
  ],
  owner: [
    [],
    [
      [
        '',
        'address'
      ]
    ]
  ],
  contract_version: [
    [],
    [
      [
        '',
        'string'
      ]
    ]
  ],
  fee: [
    [],
    [
      [
        '',
        'uint256'
      ]
    ]
  ],
  getChannelsAddresses: [
    [],
    [
      [
        '',
        'address[]'
      ]
    ]
  ],
  tokenAddress: [
    [],
    [
      [
        '',
        'address'
      ]
    ]
  ],
  getChannelWith: [
    [
      [
        'partner',
        'address'
      ]
    ],
    [
      [
        '',
        'address'
      ]
    ]
  ],
  nettingContractsByAddress: [
    [
      [
        'node_address',
        'address'
      ]
    ],
    [
      [
        '',
        'address[]'
      ]
    ]
  ],
  getChannelsParticipants: [
    [],
    [
      [
        '',
        'address[]'
      ]
    ]
  ]
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export interface ManagerConstructorParams {
  gotoken: Address
  token_address: Address
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type ManagerEventTypes = 'ChannelNew' | 'ChannelDeleted' | 'FeesCollected' | 'OwnershipTransferred'

export type ManagerEventsToArgs = {
  ChannelNew: {
    _type: 'ChannelNew'
    netting_channel: Address
    participant1: Address
    participant2: Address
    settle_timeout: BN
  }
  ChannelDeleted: {
    _type: 'ChannelDeleted'
    caller_address: Address
    partner: Address
  }
  FeesCollected: {
    _type: 'FeesCollected'
    block: BN
    balance: BN
  }
  OwnershipTransferred: {
    _type: 'OwnershipTransferred'
    previousOwner: Address
    newOwner: Address
  }
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

// tslint:disable
export const abi: Abi = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "channel",
        "type": "address"
      }
    ],
    "name": "contractExists",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
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
    "constant": true,
    "inputs": [],
    "name": "fee",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "name": "gotoken",
        "type": "address"
      },
      {
        "name": "token_address",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "fallback"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "netting_channel",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "participant1",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "participant2",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "settle_timeout",
        "type": "uint256"
      }
    ],
    "name": "ChannelNew",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "caller_address",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "partner",
        "type": "address"
      }
    ],
    "name": "ChannelDeleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "block",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "balance",
        "type": "uint256"
      }
    ],
    "name": "FeesCollected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "collectFees",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "partner",
        "type": "address"
      },
      {
        "name": "settle_timeout",
        "type": "uint256"
      }
    ],
    "name": "newChannel",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "getChannelsAddresses",
    "outputs": [
      {
        "name": "",
        "type": "address[]"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "tokenAddress",
    "outputs": [
      {
        "name": "",
        "type": "address"
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
        "name": "partner",
        "type": "address"
      }
    ],
    "name": "getChannelWith",
    "outputs": [
      {
        "name": "",
        "type": "address"
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
        "name": "node_address",
        "type": "address"
      }
    ],
    "name": "nettingContractsByAddress",
    "outputs": [
      {
        "name": "",
        "type": "address[]"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "getChannelsParticipants",
    "outputs": [
      {
        "name": "",
        "type": "address[]"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
]

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠
