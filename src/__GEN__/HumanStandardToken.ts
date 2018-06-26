import { BN } from 'bn.js'
import { Address } from 'eth-types'

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type TokenIO = {
  approve: [
    {
      _spender: Address,
      _value: BN
    },
    {
      success: boolean
    }
  ],
  transferFrom: [
    {
      _from: Address,
      _to: Address,
      _value: BN
    },
    {
      success: boolean
    }
  ],
  transfer: [
    {
      _to: Address,
      _value: BN
    },
    {
      success: boolean
    }
  ],
  approveAndCall: [
    {
      _spender: Address,
      _value: BN,
      _extraData: Buffer
    },
    {
      success: boolean
    }
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
    {
      anon_0: string
    }
  ],
  totalSupply: [
    null,
    {
      supply: BN
    }
  ],
  decimals: [
    null,
    {}
  ],
  version: [
    null,
    {
      anon_0: string
    }
  ],
  balanceOf: [
    {
      _owner: Address
    },
    {
      balance: BN
    }
  ],
  symbol: [
    null,
    {
      anon_0: string
    }
  ],
  allowance: [
    {
      _owner: Address,
      _spender: Address
    },
    {
      remaining: BN
    }
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

export type TokenEvents = 'Transfer' | 'Approval'

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
