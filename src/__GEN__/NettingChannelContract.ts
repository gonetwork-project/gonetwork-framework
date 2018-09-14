import { BN } from 'bn.js'
import { Address, Abi } from 'eth-types'

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type ChannelIO = {
  deposit: [
    {
      amount: BN
    },
    boolean
  ],
  close: [
    {
      nonce: BN,
      transferred_amount: BN,
      locksroot: Buffer,
      extra_hash: Buffer,
      signature: Buffer
    },
    void
  ],
  updateTransfer: [
    {
      nonce: BN,
      transferred_amount: BN,
      locksroot: Buffer,
      extra_hash: Buffer,
      signature: Buffer
    },
    void
  ],
  withdraw: [
    {
      locked_encoded: Buffer,
      merkle_proof: Buffer,
      secret: Buffer
    },
    void
  ],
  settle: [
    null,
    void
  ]
}

export const ChannelOrdIO = {
  deposit: [
    [
      [
        'amount',
        'uint256'
      ]
    ],
    [
      [
        '',
        'bool'
      ]
    ]
  ],
  close: [
    [
      [
        'nonce',
        'uint256'
      ],
      [
        'transferred_amount',
        'uint256'
      ],
      [
        'locksroot',
        'bytes32'
      ],
      [
        'extra_hash',
        'bytes32'
      ],
      [
        'signature',
        'bytes'
      ]
    ],
    []
  ],
  updateTransfer: [
    [
      [
        'nonce',
        'uint256'
      ],
      [
        'transferred_amount',
        'uint256'
      ],
      [
        'locksroot',
        'bytes32'
      ],
      [
        'extra_hash',
        'bytes32'
      ],
      [
        'signature',
        'bytes'
      ]
    ],
    []
  ],
  withdraw: [
    [
      [
        'locked_encoded',
        'bytes'
      ],
      [
        'merkle_proof',
        'bytes'
      ],
      [
        'secret',
        'bytes32'
      ]
    ],
    []
  ],
  settle: [
    [],
    []
  ]
}

export type ChannelConstIO = {
  refund: [
    null,
    BN
  ],
  data: [
    null,
    {
      settle_timeout: BN,
      opened: BN,
      closed: BN,
      closing_address: Address,
      token: Address,
      updated: boolean,
      goToken: Address,
      channel_manager: Address
    }
  ],
  refund_interval: [
    null,
    BN
  ],
  contract_version: [
    null,
    string
  ],
  fee: [
    null,
    BN
  ],
  addressAndBalance: [
    null,
    {
      participant1: Address,
      balance1: BN,
      participant2: Address,
      balance2: BN
    }
  ],
  settleTimeout: [
    null,
    BN
  ],
  tokenAddress: [
    null,
    Address
  ],
  opened: [
    null,
    BN
  ],
  closed: [
    null,
    BN
  ],
  closingAddress: [
    null,
    Address
  ],
  participantData: [
    null,
    {
      anon_0: Address,
      anon_1: BN,
      anon_2: Buffer
    }
  ],
  decodeLock: [
    {
      lock: Buffer
    },
    {
      anon_0: BN,
      anon_1: BN,
      anon_2: Buffer
    }
  ],
  computeMerkleRoot: [
    {
      lock: Buffer,
      merkle_proof: Buffer
    },
    Buffer
  ],
  computeLockHash: [
    {
      lock: Buffer
    },
    Buffer
  ]
}

export const ChannelConstOrdIO = {
  refund: [
    [],
    [
      [
        '',
        'uint256'
      ]
    ]
  ],
  data: [
    [],
    [
      [
        'settle_timeout',
        'uint256'
      ],
      [
        'opened',
        'uint256'
      ],
      [
        'closed',
        'uint256'
      ],
      [
        'closing_address',
        'address'
      ],
      [
        'token',
        'address'
      ],
      [
        'updated',
        'bool'
      ],
      [
        'goToken',
        'address'
      ],
      [
        'channel_manager',
        'address'
      ]
    ]
  ],
  refund_interval: [
    [],
    [
      [
        '',
        'uint256'
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
  addressAndBalance: [
    [],
    [
      [
        'participant1',
        'address'
      ],
      [
        'balance1',
        'uint256'
      ],
      [
        'participant2',
        'address'
      ],
      [
        'balance2',
        'uint256'
      ]
    ]
  ],
  settleTimeout: [
    [],
    [
      [
        '',
        'uint256'
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
  opened: [
    [],
    [
      [
        '',
        'uint256'
      ]
    ]
  ],
  closed: [
    [],
    [
      [
        '',
        'uint256'
      ]
    ]
  ],
  closingAddress: [
    [],
    [
      [
        '',
        'address'
      ]
    ]
  ],
  participantData: [
    [],
    [
      [
        '',
        'address'
      ],
      [
        '',
        'uint256'
      ],
      [
        '',
        'bytes32'
      ]
    ]
  ],
  decodeLock: [
    [
      [
        'lock',
        'bytes'
      ]
    ],
    [
      [
        '',
        'uint256'
      ],
      [
        '',
        'uint256'
      ],
      [
        '',
        'bytes32'
      ]
    ]
  ],
  computeMerkleRoot: [
    [
      [
        'lock',
        'bytes'
      ],
      [
        'merkle_proof',
        'bytes'
      ]
    ],
    [
      [
        '',
        'bytes32'
      ]
    ]
  ],
  computeLockHash: [
    [
      [
        'lock',
        'bytes'
      ]
    ],
    [
      [
        '',
        'bytes32'
      ]
    ]
  ]
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export interface ChannelConstructorParams {
  token_address: Address
  participant1: Address
  participant2: Address
  timeout: BN
  gotoken_address: Address
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type ChannelEventTypes = 'ChannelNewBalance' | 'ChannelClosed' | 'TransferUpdated' | 'ChannelSettled' | 'ChannelSecretRevealed' | 'Refund'

export type ChannelEventsToArgs = {
  ChannelNewBalance: {
    _type: 'ChannelNewBalance'
    token_address: Address
    participant: Address
    balance: BN
  }
  ChannelClosed: {
    _type: 'ChannelClosed'
    closing_address: Address
  }
  TransferUpdated: {
    _type: 'TransferUpdated'
    node_address: Address
  }
  ChannelSettled: {
    _type: 'ChannelSettled'
  }
  ChannelSecretRevealed: {
    _type: 'ChannelSecretRevealed'
    secret: Buffer
    receiver_address: Address
  }
  Refund: {
    _type: 'Refund'
    receiver: Address
    amount: BN
  }
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

// tslint:disable
export const abi: Abi = [
  {
    "constant": true,
    "inputs": [],
    "name": "refund",
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
    "constant": true,
    "inputs": [],
    "name": "data",
    "outputs": [
      {
        "name": "settle_timeout",
        "type": "uint256"
      },
      {
        "name": "opened",
        "type": "uint256"
      },
      {
        "name": "closed",
        "type": "uint256"
      },
      {
        "name": "closing_address",
        "type": "address"
      },
      {
        "name": "token",
        "type": "address"
      },
      {
        "name": "updated",
        "type": "bool"
      },
      {
        "name": "goToken",
        "type": "address"
      },
      {
        "name": "channel_manager",
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
    "name": "refund_interval",
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
        "name": "token_address",
        "type": "address"
      },
      {
        "name": "participant1",
        "type": "address"
      },
      {
        "name": "participant2",
        "type": "address"
      },
      {
        "name": "timeout",
        "type": "uint256"
      },
      {
        "name": "gotoken_address",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "payable": true,
    "stateMutability": "payable",
    "type": "fallback"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "token_address",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "participant",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "balance",
        "type": "uint256"
      }
    ],
    "name": "ChannelNewBalance",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "closing_address",
        "type": "address"
      }
    ],
    "name": "ChannelClosed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "node_address",
        "type": "address"
      }
    ],
    "name": "TransferUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "ChannelSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "secret",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "name": "receiver_address",
        "type": "address"
      }
    ],
    "name": "ChannelSecretRevealed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Refund",
    "type": "event"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "deposit",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "addressAndBalance",
    "outputs": [
      {
        "name": "participant1",
        "type": "address"
      },
      {
        "name": "balance1",
        "type": "uint256"
      },
      {
        "name": "participant2",
        "type": "address"
      },
      {
        "name": "balance2",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
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
    "inputs": [],
    "name": "settle",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "settleTimeout",
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
    "inputs": [],
    "name": "opened",
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
    "constant": true,
    "inputs": [],
    "name": "closed",
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
    "constant": true,
    "inputs": [],
    "name": "closingAddress",
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
      }
    ],
    "name": "decodeLock",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
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
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "lock",
        "type": "bytes"
      }
    ],
    "name": "computeLockHash",
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
