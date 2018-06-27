import { BN } from 'bn.js'
import { Address } from 'eth-types'

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
