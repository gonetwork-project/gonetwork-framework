import { BN } from 'bn.js'
import { Address } from 'eth-types'

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
