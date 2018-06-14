import BN from 'bn.js'

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type ManagerParamsOutput = {
  contractExists: [
    {
      channel: Buffer
    },
    {
      anon_0: boolean
    }
  ],
  owner: [
    null,
    {
      anon_0: Buffer
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
  transferOwnership: [
    {
      newOwner: Buffer
    },
    void
  ],
  collectFees: [
    null,
    void
  ],
  newChannel: [
    {
      partner: Buffer,
      settle_timeout: BN
    },
    {
      anon_0: Buffer
    }
  ],
  getChannelsAddresses: [
    null,
    {
      anon_0: Buffer[]
    }
  ],
  tokenAddress: [
    null,
    {
      anon_0: Buffer
    }
  ],
  getChannelWith: [
    {
      partner: Buffer
    },
    {
      anon_0: Buffer
    }
  ],
  nettingContractsByAddress: [
    {
      node_address: Buffer
    },
    {
      anon_0: Buffer[]
    }
  ],
  getChannelsParticipants: [
    null,
    {
      anon_0: Buffer[]
    }
  ]
}

export const ManagerParamsOrder = {
  contractExists: [
    'channel'
  ],
  owner: [],
  contract_version: [],
  fee: [],
  transferOwnership: [
    'newOwner'
  ],
  collectFees: [],
  newChannel: [
    'partner',
    'settle_timeout'
  ],
  getChannelsAddresses: [],
  tokenAddress: [],
  getChannelWith: [
    'partner'
  ],
  nettingContractsByAddress: [
    'node_address'
  ],
  getChannelsParticipants: []
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export interface ManagerConstructorParams {
  gotoken: Buffer
  token_address: Buffer
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type ManagerEvents = 'ChannelNew' | 'ChannelDeleted' | 'FeesCollected' | 'OwnershipTransferred'

export type ManagerEventsToArgs = {
  ChannelNew: {
    _type: 'ChannelNew'
    netting_channel: Buffer
    participant1: Buffer
    participant2: Buffer
    settle_timeout: BN
  }
  ChannelDeleted: {
    _type: 'ChannelDeleted'
    caller_address: Buffer
    partner: Buffer
  }
  FeesCollected: {
    _type: 'FeesCollected'
    block: BN
    balance: BN
  }
  OwnershipTransferred: {
    _type: 'OwnershipTransferred'
    previousOwner: Buffer
    newOwner: Buffer
  }
}
