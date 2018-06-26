import { BN } from 'bn.js'
import { Address } from 'eth-types'

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
  computeMerkleRootTest: [
    {
      lock: Buffer,
      merkle_proof: Buffer
    },
    Buffer
  ],
  computeLockHashTest: [
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
  computeMerkleRootTest: [
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
  computeLockHashTest: [
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
