import { BN } from 'bn.js'
import { Address } from 'eth-types'

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type ChannelIO = {
  deposit: [
    {
      amount: BN
    },
    {
      anon_0: boolean
    }
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
      'amount'
    ],
    [
      ''
    ]
  ],
  close: [
    [
      'nonce',
      'transferred_amount',
      'locksroot',
      'extra_hash',
      'signature'
    ],
    []
  ],
  updateTransfer: [
    [
      'nonce',
      'transferred_amount',
      'locksroot',
      'extra_hash',
      'signature'
    ],
    []
  ],
  withdraw: [
    [
      'locked_encoded',
      'merkle_proof',
      'secret'
    ],
    []
  ],
  settle: [
    [],
    []
  ]
}

export const ChannelTypesIO = {
  deposit: [
    [
      'uint256'
    ],
    [
      'bool'
    ]
  ],
  close: [
    [
      'uint256',
      'uint256',
      'bytes32',
      'bytes32',
      'bytes'
    ],
    []
  ],
  updateTransfer: [
    [
      'uint256',
      'uint256',
      'bytes32',
      'bytes32',
      'bytes'
    ],
    []
  ],
  withdraw: [
    [
      'bytes',
      'bytes',
      'bytes32'
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
    {
      anon_0: BN
    }
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
    {
      anon_0: BN
    }
  ],
  contract_version: [
    null,
    {
      anon_0: string
    }
  ],
  fee: [
    null,
    {
      anon_0: BN
    }
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
    {
      anon_0: BN
    }
  ],
  tokenAddress: [
    null,
    {
      anon_0: Address
    }
  ],
  opened: [
    null,
    {
      anon_0: BN
    }
  ],
  closed: [
    null,
    {
      anon_0: BN
    }
  ],
  closingAddress: [
    null,
    {
      anon_0: Address
    }
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
    {
      anon_0: Buffer
    }
  ],
  computeLockHash: [
    {
      lock: Buffer
    },
    {
      anon_0: Buffer
    }
  ]
}

export const ChannelConstOrdIO = {
  refund: [
    [],
    [
      ''
    ]
  ],
  data: [
    [],
    [
      'settle_timeout',
      'opened',
      'closed',
      'closing_address',
      'token',
      'updated',
      'goToken',
      'channel_manager'
    ]
  ],
  refund_interval: [
    [],
    [
      ''
    ]
  ],
  contract_version: [
    [],
    [
      ''
    ]
  ],
  fee: [
    [],
    [
      ''
    ]
  ],
  addressAndBalance: [
    [],
    [
      'participant1',
      'balance1',
      'participant2',
      'balance2'
    ]
  ],
  settleTimeout: [
    [],
    [
      ''
    ]
  ],
  tokenAddress: [
    [],
    [
      ''
    ]
  ],
  opened: [
    [],
    [
      ''
    ]
  ],
  closed: [
    [],
    [
      ''
    ]
  ],
  closingAddress: [
    [],
    [
      ''
    ]
  ],
  participantData: [
    [],
    [
      '',
      '',
      ''
    ]
  ],
  decodeLock: [
    [
      'lock'
    ],
    [
      '',
      '',
      ''
    ]
  ],
  computeMerkleRoot: [
    [
      'lock',
      'merkle_proof'
    ],
    [
      ''
    ]
  ],
  computeLockHash: [
    [
      'lock'
    ],
    [
      ''
    ]
  ]
}

export const ChannelConstTypesIO = {
  refund: [
    [],
    [
      'uint256'
    ]
  ],
  data: [
    [],
    [
      'uint256',
      'uint256',
      'uint256',
      'address',
      'address',
      'bool',
      'address',
      'address'
    ]
  ],
  refund_interval: [
    [],
    [
      'uint256'
    ]
  ],
  contract_version: [
    [],
    [
      'string'
    ]
  ],
  fee: [
    [],
    [
      'uint256'
    ]
  ],
  addressAndBalance: [
    [],
    [
      'address',
      'uint256',
      'address',
      'uint256'
    ]
  ],
  settleTimeout: [
    [],
    [
      'uint256'
    ]
  ],
  tokenAddress: [
    [],
    [
      'address'
    ]
  ],
  opened: [
    [],
    [
      'uint256'
    ]
  ],
  closed: [
    [],
    [
      'uint256'
    ]
  ],
  closingAddress: [
    [],
    [
      'address'
    ]
  ],
  participantData: [
    [],
    [
      'address',
      'uint256',
      'bytes32'
    ]
  ],
  decodeLock: [
    [
      'bytes'
    ],
    [
      'uint256',
      'uint256',
      'bytes32'
    ]
  ],
  computeMerkleRoot: [
    [
      'bytes',
      'bytes'
    ],
    [
      'bytes32'
    ]
  ],
  computeLockHash: [
    [
      'bytes'
    ],
    [
      'bytes32'
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

export type ChannelEvents = 'ChannelNewBalance' | 'ChannelClosed' | 'TransferUpdated' | 'ChannelSettled' | 'ChannelSecretRevealed' | 'Refund'

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
