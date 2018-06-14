import BN from 'bn.js'

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type ChannelParamsOutput = {
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
      closing_address: Buffer,
      token: Buffer,
      updated: boolean,
      goToken: Buffer,
      channel_manager: Buffer
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
  deposit: [
    {
      amount: BN
    },
    {
      anon_0: boolean
    }
  ],
  addressAndBalance: [
    null,
    {
      participant1: Buffer,
      balance1: BN,
      participant2: Buffer,
      balance2: BN
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
      anon_0: Buffer
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
      anon_0: Buffer
    }
  ],
  participantData: [
    null,
    {
      anon_0: Buffer,
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

export const ChannelParamsOrder = {
  refund: [],
  data: [],
  refund_interval: [],
  contract_version: [],
  fee: [],
  deposit: [
    'amount'
  ],
  addressAndBalance: [],
  close: [
    'nonce',
    'transferred_amount',
    'locksroot',
    'extra_hash',
    'signature'
  ],
  updateTransfer: [
    'nonce',
    'transferred_amount',
    'locksroot',
    'extra_hash',
    'signature'
  ],
  withdraw: [
    'locked_encoded',
    'merkle_proof',
    'secret'
  ],
  settle: [],
  settleTimeout: [],
  tokenAddress: [],
  opened: [],
  closed: [],
  closingAddress: [],
  participantData: [],
  decodeLock: [
    'lock'
  ],
  computeMerkleRoot: [
    'lock',
    'merkle_proof'
  ],
  computeLockHash: [
    'lock'
  ]
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export interface ChannelConstructorParams {
  token_address: Buffer
  participant1: Buffer
  participant2: Buffer
  timeout: BN
  gotoken_address: Buffer
}

// ⚠ !IMPORTANT! THIS FILE WAS AUTO-GENERATED - DO NOT MODIFY BY HAND ⚠

export type ChannelEvents = 'ChannelNewBalance' | 'ChannelClosed' | 'TransferUpdated' | 'ChannelSettled' | 'ChannelSecretRevealed' | 'Refund'

export type ChannelEventsToArgs = {
  ChannelNewBalance: {
    _type: 'ChannelNewBalance'
    token_address: Buffer
    participant: Buffer
    balance: BN
  }
  ChannelClosed: {
    _type: 'ChannelClosed'
    closing_address: Buffer
  }
  TransferUpdated: {
    _type: 'TransferUpdated'
    node_address: Buffer
  }
  ChannelSettled: {
    _type: 'ChannelSettled'
  }
  ChannelSecretRevealed: {
    _type: 'ChannelSecretRevealed'
    secret: Buffer
    receiver_address: Buffer
  }
  Refund: {
    _type: 'Refund'
    receiver: Buffer
    amount: BN
  }
}
