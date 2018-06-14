import BN from 'bn.js'

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type TokenParamsOutput = {
  name: [
    null,
    {
      anon_0: string
    }
  ],
  approve: [
    {
      _spender: Buffer,
      _value: BN
    },
    {
      success: boolean
    }
  ],
  totalSupply: [
    null,
    {
      supply: BN
    }
  ],
  transferFrom: [
    {
      _from: Buffer,
      _to: Buffer,
      _value: BN
    },
    {
      success: boolean
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
      _owner: Buffer
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
  transfer: [
    {
      _to: Buffer,
      _value: BN
    },
    {
      success: boolean
    }
  ],
  allowance: [
    {
      _owner: Buffer,
      _spender: Buffer
    },
    {
      remaining: BN
    }
  ],
  approveAndCall: [
    {
      _spender: Buffer,
      _value: BN,
      _extraData: Buffer
    },
    {
      success: boolean
    }
  ]
}

export const TokenParamsOrder = {
  name: [],
  approve: [
    '_spender',
    '_value'
  ],
  totalSupply: [],
  transferFrom: [
    '_from',
    '_to',
    '_value'
  ],
  decimals: [],
  version: [],
  balanceOf: [
    '_owner'
  ],
  symbol: [],
  transfer: [
    '_to',
    '_value'
  ],
  allowance: [
    '_owner',
    '_spender'
  ],
  approveAndCall: [
    '_spender',
    '_value',
    '_extraData'
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
    _from: Buffer
    _to: Buffer
    _value: BN
  }
  Approval: {
    _type: 'Approval'
    _owner: Buffer
    _spender: Buffer
    _value: BN
  }
}
