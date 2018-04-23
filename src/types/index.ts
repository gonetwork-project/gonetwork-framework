export type ChainId = string & { __CHAIN_ID__: true }
export type BlockQuantity = 'latest'

// todo: make it consistent either stirng or number
export type EthAddress = (string | number | any) & { __ETH_ADDRESS__: true }
