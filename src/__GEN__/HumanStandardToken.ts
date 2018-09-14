import { BN } from 'bn.js'
import { Address, Abi } from 'eth-types'

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type TokenIO = {
  approve: [
    {
      _spender: Address,
      _value: BN
    },
    boolean
  ],
  transferFrom: [
    {
      _from: Address,
      _to: Address,
      _value: BN
    },
    boolean
  ],
  transfer: [
    {
      _to: Address,
      _value: BN
    },
    boolean
  ],
  approveAndCall: [
    {
      _spender: Address,
      _value: BN,
      _extraData: Buffer
    },
    boolean
  ]
}

export const TokenOrdIO = {
  approve: [
    [
      [
        '_spender',
        'address'
      ],
      [
        '_value',
        'uint256'
      ]
    ],
    [
      [
        'success',
        'bool'
      ]
    ]
  ],
  transferFrom: [
    [
      [
        '_from',
        'address'
      ],
      [
        '_to',
        'address'
      ],
      [
        '_value',
        'uint256'
      ]
    ],
    [
      [
        'success',
        'bool'
      ]
    ]
  ],
  transfer: [
    [
      [
        '_to',
        'address'
      ],
      [
        '_value',
        'uint256'
      ]
    ],
    [
      [
        'success',
        'bool'
      ]
    ]
  ],
  approveAndCall: [
    [
      [
        '_spender',
        'address'
      ],
      [
        '_value',
        'uint256'
      ],
      [
        '_extraData',
        'bytes'
      ]
    ],
    [
      [
        'success',
        'bool'
      ]
    ]
  ]
}

export type TokenConstIO = {
  name: [
    null,
    string
  ],
  totalSupply: [
    null,
    BN
  ],
  decimals: [
    null,
    void
  ],
  version: [
    null,
    string
  ],
  balanceOf: [
    {
      _owner: Address
    },
    BN
  ],
  symbol: [
    null,
    string
  ],
  allowance: [
    {
      _owner: Address,
      _spender: Address
    },
    BN
  ]
}

export const TokenConstOrdIO = {
  name: [
    [],
    [
      [
        '',
        'string'
      ]
    ]
  ],
  totalSupply: [
    [],
    [
      [
        'supply',
        'uint256'
      ]
    ]
  ],
  decimals: [
    [],
    [
      [
        '',
        'uint8'
      ]
    ]
  ],
  version: [
    [],
    [
      [
        '',
        'string'
      ]
    ]
  ],
  balanceOf: [
    [
      [
        '_owner',
        'address'
      ]
    ],
    [
      [
        'balance',
        'uint256'
      ]
    ]
  ],
  symbol: [
    [],
    [
      [
        '',
        'string'
      ]
    ]
  ],
  allowance: [
    [
      [
        '_owner',
        'address'
      ],
      [
        '_spender',
        'address'
      ]
    ],
    [
      [
        'remaining',
        'uint256'
      ]
    ]
  ]
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export interface TokenConstructorParams {
  _initialAmount: BN
  _tokenName: string
  _tokenSymbol: string
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type TokenEventTypes = 'Transfer' | 'Approval'

export type TokenEventsToArgs = {
  Transfer: {
    _type: 'Transfer'
    _from: Address
    _to: Address
    _value: BN
  }
  Approval: {
    _type: 'Approval'
    _owner: Address
    _spender: Address
    _value: BN
  }
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

// tslint:disable
export const abi: Abi = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
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
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "success",
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
    "name": "totalSupply",
    "outputs": [
      {
        "name": "supply",
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
        "name": "_from",
        "type": "address"
      },
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "name": "success",
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
    "name": "decimals",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "version",
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
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
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
    "name": "symbol",
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
    "constant": false,
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "remaining",
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
        "name": "_initialAmount",
        "type": "uint256"
      },
      {
        "name": "_tokenName",
        "type": "string"
      },
      {
        "name": "_decimalUnits",
        "type": "uint8"
      },
      {
        "name": "_tokenSymbol",
        "type": "string"
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
        "indexed": true,
        "name": "_from",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "_to",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "_owner",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "_spender",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      },
      {
        "name": "_extraData",
        "type": "bytes"
      }
    ],
    "name": "approveAndCall",
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠
