import * as channel from './channel'
import * as merkletree from './merkletree'
import * as message from './message'
import * as stateMachine from './state-machine'

export { ChannelState } from './channel-state'
export { Engine } from './engine'

export const Channel = channel.Channel

export {
  channel,
  merkletree,
  message,
  stateMachine
}

// const Engine = require('./engine').Engine X
// const message = require('./message') X
// const channel = require('./channel') X
// const Channel = channel.Channel X
// const stateMachine = require('./state-machine') X
// const ChannelState = require('./channel-state').ChannelState X
// const merkletree = require('./merkletree') X
// module.exports = {
//   Engine, Channel, ChannelState, message, stateMachine, channel, merkletree
// }
