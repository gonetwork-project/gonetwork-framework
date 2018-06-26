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
    {
      anon_0: Address
    }
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
    {
      anon_0: boolean
    }
  ],
  owner: [
    null,
    {
      anon_0: Address
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
  getChannelsAddresses: [
    null,
    {
      anon_0: Address[]
    }
  ],
  tokenAddress: [
    null,
    {
      anon_0: Address
    }
  ],
  getChannelWith: [
    {
      partner: Address
    },
    {
      anon_0: Address
    }
  ],
  nettingContractsByAddress: [
    {
      node_address: Address
    },
    {
      anon_0: Address[]
    }
  ],
  getChannelsParticipants: [
    null,
    {
      anon_0: Address[]
    }
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

export type ManagerEvents = 'ChannelNew' | 'ChannelDeleted' | 'FeesCollected' | 'OwnershipTransferred'

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
