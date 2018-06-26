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
    '_spender',
    '_value'
  ],
  transferFrom: [
    '_from',
    '_to',
    '_value'
  ],
  transfer: [
    '_to',
    '_value'
  ],
  approveAndCall: [
    '_spender',
    '_value',
    '_extraData'
  ]
}

export const TokenTypesIO = {
  approve: [
    'address',
    'uint256'
  ],
  transferFrom: [
    'address',
    'address',
    'uint256'
  ],
  transfer: [
    'address',
    'uint256'
  ],
  approveAndCall: [
    'address',
    'uint256',
    'bytes'
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
  name: [],
  totalSupply: [],
  decimals: [],
  version: [],
  balanceOf: [
    '_owner'
  ],
  symbol: [],
  allowance: [
    '_owner',
    '_spender'
  ]
}

export const TokenConstTypesIO = {
  name: [],
  totalSupply: [],
  decimals: [],
  version: [],
  balanceOf: [
    'address'
  ],
  symbol: [],
  allowance: [
    'address',
    'address'
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
